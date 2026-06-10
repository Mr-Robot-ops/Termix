/* eslint-disable react-hooks/exhaustive-deps */
import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { useXTerm } from "react-xtermjs";
import { FitAddon } from "@xterm/addon-fit";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { RobustClipboardProvider } from "@/lib/clipboard-provider";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { useTranslation } from "react-i18next";
import { getBasePath } from "@/lib/base-path";
import {
  getCookie,
  isElectron,
  isEmbeddedMode,
  logActivity,
  getSnippets,
  deleteCommandFromHistory,
  getCommandHistory,
  getHostPassword,
  getServerConfig,
} from "@/main-axios.ts";
import { TOTPDialog } from "@/ssh/dialogs/TOTPDialog.tsx";
import { SSHAuthDialog } from "@/ssh/dialogs/SSHAuthDialog.tsx";
import { PassphraseDialog } from "@/ssh/dialogs/PassphraseDialog.tsx";
import { WarpgateDialog } from "@/ssh/dialogs/WarpgateDialog.tsx";
import { OPKSSHDialog } from "@/ssh/dialogs/OPKSSHDialog.tsx";
import { HostKeyVerificationDialog } from "@/ssh/dialogs/HostKeyVerificationDialog.tsx";
import { TmuxSessionPicker } from "@/ssh/dialogs/TmuxSessionPicker.tsx";
import {
  DEFAULT_TERMINAL_CONFIG,
  TERMINAL_FONTS,
} from "@/lib/terminal-themes.ts";
import {
  extractRenderedCommandFromLine,
  normalizeTerminalLineSuffix,
  terminalLineLooksLikeSecretPrompt,
} from "@/lib/terminal-rendered-command.ts";
import "./terminal-global-styles.ts";
import { useTheme } from "@/components/theme-provider.tsx";
import { useCommandTracker } from "@/features/terminal/command-history/useCommandTracker.ts";
import { highlightTerminalOutput } from "@/lib/terminal-syntax-highlighter.ts";
import {
  buildTerminalAutocompleteMatchItems,
  extractSystemdUnitsFromTerminalOutput,
  getTerminalAutocompleteCatalogDisplayLabel,
  getTerminalAutocompleteCompletion,
  getTerminalAutocompleteHelp,
  getTerminalAutocompleteInsertCommand,
  getTerminalAutocompleteSettings,
  isSystemdUnitAutocompleteContext,
  isUsefulAutocompleteHistoryCommand,
  type TerminalAutocompleteSource,
  type TerminalAutocompleteSettings,
} from "@/lib/terminal-autocomplete.ts";
import { useCommandHistory } from "@/features/terminal/command-history/CommandHistoryContext.tsx";
import { CommandAutocomplete } from "./command-history/CommandAutocomplete.tsx";
import { CommandAutocompleteHint } from "./command-history/CommandAutocompleteHint.tsx";
import { getLocalizedTerminalAutocompleteSuggestionDescription } from "./command-history/autocompleteDescriptionI18n.ts";
import { getCommandAutocompleteListHeight } from "./command-history/commandAutocompleteLayout.ts";
import {
  getCommandAutocompleteGhostKeyAction,
  getCommandAutocompleteInputModeAfterTerminalData,
  getCommandAutocompletePopupKeyAction,
  type CommandAutocompleteInputMode,
} from "./command-history/commandAutocompleteKeys.ts";
import { SimpleLoader } from "@/lib/SimpleLoader.tsx";
import { useConfirmation } from "@/hooks/use-confirmation.ts";
import {
  ConnectionLogProvider,
  useConnectionLog,
} from "@/ssh/connection-log/ConnectionLogContext.tsx";
import { ConnectionLog } from "@/ssh/connection-log/ConnectionLog.tsx";
import { toast } from "sonner";
import { Button } from "@/components/button";
import { resolveTermixThemeColors } from "./terminal-theme.ts";
import type { TerminalHandle, TerminalHostConfig } from "./terminal-types.ts";
export type { TerminalHandle, TerminalHostConfig } from "./terminal-types.ts";

// Background/foreground per UI theme for "Termix Default" — must match index.css
type AutocompleteOpenMode = "manual" | "automatic";
type AutocompleteMatchItem = ReturnType<
  typeof buildTerminalAutocompleteMatchItems
>[number];

const SYSTEMD_UNITS_REFRESH_THROTTLE_MS = 60_000;
const AUTOCOMPLETE_REFRESH_DEBOUNCE_MS = 80;
const AUTOCOMPLETE_PERF_LOG_THRESHOLD_MS = 8;

function logAutocompletePerf(label: string, startedAt: number) {
  if (!import.meta.env.DEV || typeof performance === "undefined") {
    return;
  }

  const duration = performance.now() - startedAt;
  if (duration > AUTOCOMPLETE_PERF_LOG_THRESHOLD_MS) {
    console.debug(`[terminal autocomplete] ${label}: ${duration.toFixed(1)}ms`);
  }
}

function logAutocompleteDebug(
  message: string,
  context: Record<string, unknown> = {},
) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.debug(`[terminal autocomplete] ${message}`, context);
}

function getAutocompleteServiceSample(services: string[]) {
  return services.slice(0, 5);
}

function areStringArraysEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function mergeSystemdServices(
  backendServices: string[],
  outputServices: string[],
) {
  const seen = new Set<string>();
  const merged: string[] = [];

  [...backendServices, ...outputServices].forEach((service) => {
    const normalized = service.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key) || !key.endsWith(".service")) {
      return;
    }

    seen.add(key);
    merged.push(normalized);
  });

  return merged;
}

function commandOutputLooksLikeAutocompleteFailure(
  command: string,
  output: string,
) {
  const normalizedOutput = output.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "");
  const commandExecutable = command.trim().split(/\s+/, 1)[0]?.toLowerCase();

  if (
    commandExecutable === "sudo" &&
    /\bsudo:\s+.+?:\s+command not found/i.test(normalizedOutput)
  ) {
    return true;
  }

  if (/\bsystemctl\b/i.test(command)) {
    return /(?:Unit\s+.+?(?:could not be found|not found)|Loaded:\s+not-found|Failed to .+?:\s+Unit\s+.+?\s+not found)/i.test(
      normalizedOutput,
    );
  }

  return /(?:command not found|unknown command|unrecognized option|invalid option)/i.test(
    normalizedOutput,
  );
}

function isAutocompleteHistorySuggestion(
  suggestion: string,
  historySuggestions: string[],
) {
  const normalizedSuggestion = suggestion.trim();
  return historySuggestions.some((historySuggestion) => {
    const normalizedHistorySuggestion = historySuggestion.trim();
    return (
      normalizedSuggestion === normalizedHistorySuggestion ||
      normalizedSuggestion.endsWith(` ${normalizedHistorySuggestion}`)
    );
  });
}

type HostKeyVerificationData = Omit<
  React.ComponentProps<typeof HostKeyVerificationDialog>,
  "isOpen" | "scenario" | "onAccept" | "onReject" | "backgroundColor"
>;

interface SSHTerminalProps {
  hostConfig: TerminalHostConfig;
  isVisible: boolean;
  title?: string;
  showTitle?: boolean;
  splitScreen?: boolean;
  onClose?: () => void;
  onTitleChange?: (title: string) => void;
  initialPath?: string;
  executeCommand?: string;
  onOpenFileManager?: (path?: string) => void;
  previewTheme?: string | null;
}

const TerminalInner = forwardRef<TerminalHandle, SSHTerminalProps>(
  function SSHTerminal(
    {
      hostConfig,
      isVisible,
      splitScreen = false,
      onClose,
      initialPath,
      executeCommand,
      onOpenFileManager,
      previewTheme,
    },
    ref,
  ) {
    const { i18n, t } = useTranslation();
    const { instance: terminal, ref: xtermRef } = useXTerm();
    const commandHistoryContext = useCommandHistory();
    const { confirmWithToast } = useConfirmation();
    const { theme: appTheme } = useTheme();
    const { addLog, isExpanded: isConnectionLogExpanded } = useConnectionLog();

    const savedTheme = localStorage.getItem(
      `terminal_theme_host_${hostConfig.id}`,
    );
    const config = {
      ...DEFAULT_TERMINAL_CONFIG,
      ...hostConfig.terminalConfig,
      theme:
        savedTheme ||
        hostConfig.terminalConfig?.theme ||
        DEFAULT_TERMINAL_CONFIG.theme,
    };

    const activeTheme = previewTheme || config.theme;
    const themeColors = resolveTermixThemeColors(activeTheme, appTheme);
    const backgroundColor = themeColors.background;
    const fitAddonRef = useRef<FitAddon | null>(null);
    const webSocketRef = useRef<WebSocket | null>(null);
    const resizeTimeout = useRef<NodeJS.Timeout | null>(null);
    const wasDisconnectedBySSH = useRef(false);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pongReceivedRef = useRef(true);
    const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isFitted, setIsFitted] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const connectionErrorRef = useRef<string | null>(null);
    const [showDisconnectedOverlay, setShowDisconnectedOverlay] =
      useState(false);

    const updateConnectionError = useCallback((error: string | null) => {
      connectionErrorRef.current = error;
      setConnectionError(error);
    }, []);

    const [, setIsAuthenticated] = useState(false);
    const [totpRequired, setTotpRequired] = useState(false);
    const [totpPrompt, setTotpPrompt] = useState<string>("");
    const [isPasswordPrompt, setIsPasswordPrompt] = useState(false);
    const [showAuthDialog, setShowAuthDialog] = useState(false);
    const [authDialogReason, setAuthDialogReason] = useState<
      "no_keyboard" | "auth_failed" | "timeout"
    >("no_keyboard");
    const [showPassphraseDialog, setShowPassphraseDialog] = useState(false);
    const [, setKeyboardInteractiveDetected] = useState(false);
    const [warpgateAuthRequired, setWarpgateAuthRequired] = useState(false);
    const [warpgateAuthUrl, setWarpgateAuthUrl] = useState<string>("");
    const [warpgateSecurityKey, setWarpgateSecurityKey] = useState<string>("");
    const warpgateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [opksshDialog, setOpksshDialog] = useState<{
      isOpen: boolean;
      authUrl: string;
      requestId: string;
      stage: "chooser" | "waiting" | "authenticating" | "completed" | "error";
      error?: string;
      providers?: Array<{ alias: string; issuer: string }>;
    } | null>(null);
    const opksshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const opksshFailedRef = useRef(false);
    const currentHostIdRef = useRef<number | null>(null);
    const currentHostConfigRef = useRef<TerminalHostConfig | null>(null);

    const [hostKeyVerification, setHostKeyVerification] = useState<{
      isOpen: boolean;
      scenario: "new" | "changed";
      data: HostKeyVerificationData;
    } | null>(null);

    const sessionIdRef = useRef<string | null>(null);
    const isAttachingSessionRef = useRef<boolean>(false);
    // Consumed on first connectToHost call so retries don't re-attempt a stale session
    const pendingRestoredSessionIdRef = useRef<string | null>(
      hostConfig.restoredSessionId ?? null,
    );
    const [tmuxSessionPicker, setTmuxSessionPicker] = useState<{
      sessions: Array<{
        name: string;
        created: number;
        lastActivity: number;
        windows: number;
        attachedClients: number;
      }>;
    } | null>(null);
    const tmuxSessionNameRef = useRef<string | null>(null);
    const [isTmuxAttached, setIsTmuxAttached] = useState(false);
    const tmuxCopyModeHintShownRef = useRef(false);

    const isVisibleRef = useRef<boolean>(false);
    const isFittingRef = useRef(false);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 8;
    const isUnmountingRef = useRef(false);
    const shouldNotReconnectRef = useRef(false);
    const isReconnectingRef = useRef(false);
    const isConnectingRef = useRef(false);
    const wasConnectedRef = useRef(false);
    const wasSessionExpiredRef = useRef(false);

    useEffect(() => {
      isUnmountingRef.current = false;
      shouldNotReconnectRef.current = false;
      isReconnectingRef.current = false;
      isConnectingRef.current = false;
      reconnectAttempts.current = 0;
      wasConnectedRef.current = false;
      isAttachingSessionRef.current = false;

      return () => {};
    }, [hostConfig.id]);
    const connectionAttemptIdRef = useRef(0);
    const totpTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const activityLoggedRef = useRef(false);
    const [commandHistoryTrackingEnabled, setCommandHistoryTrackingEnabled] =
      useState<boolean>(
        () => localStorage.getItem("commandHistoryTracking") === "true",
      );
    const [autocompleteSettings, setAutocompleteSettings] =
      useState<TerminalAutocompleteSettings>(() =>
        getTerminalAutocompleteSettings(),
      );
    const commandAutocompleteEnabled =
      autocompleteSettings.ghost || autocompleteSettings.popup;
    const terminalFocusedRef = useRef(false);
    const [terminalFocused, setTerminalFocused] = useState(false);

    useEffect(() => {
      const handleCommandHistoryTrackingChanged = () => {
        setCommandHistoryTrackingEnabled(
          localStorage.getItem("commandHistoryTracking") === "true",
        );
      };

      window.addEventListener(
        "commandHistoryTrackingChanged",
        handleCommandHistoryTrackingChanged,
      );

      return () => {
        window.removeEventListener(
          "commandHistoryTrackingChanged",
          handleCommandHistoryTrackingChanged,
        );
      };
    }, []);

    const {
      trackInput,
      getCurrentCommand,
      isCursorAtEnd,
      updateCurrentCommand,
    } = useCommandTracker({
      hostId: hostConfig.id,
      enabled: commandHistoryTrackingEnabled || commandAutocompleteEnabled,
      persistHistory: commandHistoryTrackingEnabled,
      onCommandExecuted: (command) => {
        pendingAutocompleteCommandRef.current = {
          command,
          expiresAt: Date.now() + 8000,
          output: "",
        };

        if (
          isUsefulAutocompleteHistoryCommand(command) &&
          !autocompleteHistory.current.includes(command)
        ) {
          autocompleteHistory.current = [
            command,
            ...autocompleteHistory.current,
          ];
          autocompleteHistoryVersionRef.current += 1;
          autocompleteMatchCacheRef.current = null;
        }
      },
    });

    const getCurrentCommandRef = useRef(getCurrentCommand);
    const isCursorAtEndRef = useRef(isCursorAtEnd);
    const updateCurrentCommandRef = useRef(updateCurrentCommand);

    useEffect(() => {
      getCurrentCommandRef.current = getCurrentCommand;
      isCursorAtEndRef.current = isCursorAtEnd;
      updateCurrentCommandRef.current = updateCurrentCommand;
    }, [getCurrentCommand, isCursorAtEnd, updateCurrentCommand]);

    const trackInputRef = useRef(trackInput);

    useEffect(() => {
      trackInputRef.current = trackInput;
    }, [trackInput]);

    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [autocompleteOpenMode, setAutocompleteOpenMode] =
      useState<AutocompleteOpenMode>("manual");
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<
      string[]
    >([]);
    const [autocompleteSuggestionSources, setAutocompleteSuggestionSources] =
      useState<TerminalAutocompleteSource[]>([]);
    const [autocompleteSelectedIndex, setAutocompleteSelectedIndex] =
      useState(0);
    const [autocompleteSelectionActive, setAutocompleteSelectionActive] =
      useState(false);
    const [autocompletePosition, setAutocompletePosition] = useState({
      top: 0,
      left: 0,
    });
    const [autocompleteHint, setAutocompleteHint] = useState<{
      command: string;
      completion: string;
      position: { top: number; left: number };
      lineHeightPx?: number;
    } | null>(null);
    const autocompleteHistory = useRef<string[]>([]);
    const backendSystemdServicesRef = useRef<string[]>([]);
    const outputDiscoveredSystemdUnitsRef = useRef<string[]>([]);
    const autocompleteSystemdUnitsRef = useRef<string[]>([]);
    const autocompleteHistoryVersionRef = useRef(0);
    const systemdServicesVersionRef = useRef(0);
    const autocompleteMatchCacheRef = useRef<{
      key: string;
      matches: AutocompleteMatchItem[];
    } | null>(null);
    const currentAutocompleteCommand = useRef<string>("");
    const pendingAutocompleteCommandRef = useRef<{
      command: string;
      expiresAt: number;
      output: string;
    } | null>(null);

    const showAutocompleteRef = useRef(false);
    const autocompleteSuggestionsRef = useRef<string[]>([]);
    const autocompleteSuggestionSourcesRef = useRef<
      TerminalAutocompleteSource[]
    >([]);
    const autocompleteSelectedIndexRef = useRef(0);
    const autocompleteSelectionActiveRef = useRef(false);
    const autocompleteInputModeRef =
      useRef<CommandAutocompleteInputMode>("idle");
    const autocompleteHintRef = useRef<typeof autocompleteHint>(null);
    const autocompleteSettingsRef = useRef(autocompleteSettings);
    const autocompleteOpenModeRef =
      useRef<AutocompleteOpenMode>(autocompleteOpenMode);
    const autocompleteRefreshTimeoutRef = useRef<number | null>(null);
    const lastAutocompletePositionSignatureRef = useRef<string>("");
    const lastLoggedSystemdBuildRef = useRef<{
      count: number;
      version: number;
    } | null>(null);
    const systemdUnitsRefreshRequestsRef = useRef<Record<string, number>>({});

    const [showHistoryDialog] = useState(false);
    const [, setCommandHistory] = useState<string[]>([]);
    const [, setIsLoadingHistory] = useState(false);

    const setIsLoadingRef = useRef(commandHistoryContext.setIsLoading);
    const setCommandHistoryContextRef = useRef(
      commandHistoryContext.setCommandHistory,
    );
    const commandHistoryContextItemsRef = useRef(
      commandHistoryContext.commandHistory,
    );

    useEffect(() => {
      setIsLoadingRef.current = commandHistoryContext.setIsLoading;
      setCommandHistoryContextRef.current =
        commandHistoryContext.setCommandHistory;
      commandHistoryContextItemsRef.current =
        commandHistoryContext.commandHistory;
    }, [
      commandHistoryContext.setIsLoading,
      commandHistoryContext.setCommandHistory,
      commandHistoryContext.commandHistory,
    ]);

    useEffect(() => {
      if (showHistoryDialog && hostConfig.id) {
        setIsLoadingHistory(true);
        setIsLoadingRef.current(true);
        getCommandHistory(hostConfig.id!)
          .then((history) => {
            const safeHistory = history.filter(
              isUsefulAutocompleteHistoryCommand,
            );
            setCommandHistory(safeHistory);
            setCommandHistoryContextRef.current(safeHistory);
          })
          .catch((error) => {
            console.error("Failed to load command history:", error);
            setCommandHistory([]);
            setCommandHistoryContextRef.current([]);
          })
          .finally(() => {
            setIsLoadingHistory(false);
            setIsLoadingRef.current(false);
          });
      }
    }, [showHistoryDialog, hostConfig.id]);

    useEffect(() => {
      const hadMergedSystemdServices =
        autocompleteSystemdUnitsRef.current.length > 0;
      backendSystemdServicesRef.current = [];
      outputDiscoveredSystemdUnitsRef.current = [];
      systemdUnitsRefreshRequestsRef.current = {};
      if (hadMergedSystemdServices) {
        autocompleteSystemdUnitsRef.current = [];
        systemdServicesVersionRef.current += 1;
      }
      autocompleteHistoryVersionRef.current += 1;
      autocompleteMatchCacheRef.current = null;

      if (hostConfig.id && commandAutocompleteEnabled) {
        getCommandHistory(hostConfig.id!)
          .then((history) => {
            const safeHistory = history.filter(
              isUsefulAutocompleteHistoryCommand,
            );
            if (!areStringArraysEqual(autocompleteHistory.current, safeHistory)) {
              autocompleteHistory.current = safeHistory;
              autocompleteHistoryVersionRef.current += 1;
              autocompleteMatchCacheRef.current = null;
            }
          })
          .catch((error) => {
            console.error("Failed to load autocomplete history:", error);
            if (autocompleteHistory.current.length > 0) {
              autocompleteHistory.current = [];
              autocompleteHistoryVersionRef.current += 1;
              autocompleteMatchCacheRef.current = null;
            }
          });
      } else {
        if (autocompleteHistory.current.length > 0) {
          autocompleteHistory.current = [];
          autocompleteHistoryVersionRef.current += 1;
          autocompleteMatchCacheRef.current = null;
        }
        setShowAutocomplete(false);
        setAutocompleteSuggestions([]);
        currentAutocompleteCommand.current = "";
      }
    }, [hostConfig.id, commandAutocompleteEnabled]);

    useEffect(() => {
      showAutocompleteRef.current = showAutocomplete;
    }, [showAutocomplete]);

    useEffect(() => {
      autocompleteSuggestionsRef.current = autocompleteSuggestions;
    }, [autocompleteSuggestions]);

    useEffect(() => {
      autocompleteSuggestionSourcesRef.current = autocompleteSuggestionSources;
    }, [autocompleteSuggestionSources]);

    useEffect(() => {
      autocompleteSelectedIndexRef.current = autocompleteSelectedIndex;
    }, [autocompleteSelectedIndex]);

    useEffect(() => {
      autocompleteSelectionActiveRef.current = autocompleteSelectionActive;
    }, [autocompleteSelectionActive]);

    useEffect(() => {
      autocompleteOpenModeRef.current = autocompleteOpenMode;
    }, [autocompleteOpenMode]);

    useEffect(() => {
      autocompleteHintRef.current = autocompleteHint;
    }, [autocompleteHint]);

    useEffect(() => {
      autocompleteSettingsRef.current = autocompleteSettings;
    }, [autocompleteSettings]);

    const setAutocompleteInputMode = useCallback(
      (mode: CommandAutocompleteInputMode) => {
        autocompleteInputModeRef.current = mode;
      },
      [],
    );

    const markAutocompleteInputModeFromTerminalData = useCallback(
      (data: string) => {
        const nextMode = getCommandAutocompleteInputModeAfterTerminalData(
          data,
          autocompleteInputModeRef.current,
        );
        if (nextMode !== autocompleteInputModeRef.current) {
          setAutocompleteInputMode(nextMode);
        }
      },
      [setAutocompleteInputMode],
    );

    const closeAutocomplete = useCallback(() => {
      setShowAutocomplete(false);
      setAutocompleteOpenMode("manual");
      setAutocompleteSuggestions([]);
      setAutocompleteSuggestionSources([]);
      autocompleteSelectionActiveRef.current = false;
      setAutocompleteSelectionActive(false);
      autocompleteInputModeRef.current = "idle";
      setAutocompleteHint(null);
      currentAutocompleteCommand.current = "";
      lastAutocompletePositionSignatureRef.current = "";
    }, []);

    const removeAutocompleteHistoryCommand = useCallback(
      (command: string) => {
        const trimmedCommand = command.trim();
        if (!trimmedCommand) {
          return;
        }

        const nextAutocompleteHistory = autocompleteHistory.current.filter(
          (historyCommand) => historyCommand !== trimmedCommand,
        );
        if (
          !areStringArraysEqual(
            autocompleteHistory.current,
            nextAutocompleteHistory,
          )
        ) {
          autocompleteHistory.current = nextAutocompleteHistory;
          autocompleteHistoryVersionRef.current += 1;
          autocompleteMatchCacheRef.current = null;
        }
        setCommandHistory((history) =>
          history.filter((historyCommand) => historyCommand !== trimmedCommand),
        );
        const nextContextHistory = commandHistoryContextItemsRef.current.filter(
          (historyCommand) => historyCommand !== trimmedCommand,
        );
        commandHistoryContextItemsRef.current = nextContextHistory;
        setCommandHistoryContextRef.current(nextContextHistory);

        if (hostConfig.id) {
          deleteCommandFromHistory(hostConfig.id, trimmedCommand).catch(
            (error) => {
              console.error("Failed to delete failed command history:", error);
            },
          );
        }
      },
      [hostConfig.id],
    );

    const observeAutocompleteCommandOutput = useCallback(
      (data: string) => {
        const pendingCommand = pendingAutocompleteCommandRef.current;
        if (!pendingCommand) {
          return;
        }

        if (Date.now() > pendingCommand.expiresAt) {
          pendingAutocompleteCommandRef.current = null;
          return;
        }

        pendingCommand.output = `${pendingCommand.output}${data}`.slice(-2000);

        if (
          commandOutputLooksLikeAutocompleteFailure(
            pendingCommand.command,
            pendingCommand.output,
          )
        ) {
          removeAutocompleteHistoryCommand(pendingCommand.command);
          pendingAutocompleteCommandRef.current = null;
        }
      },
      [removeAutocompleteHistoryCommand],
    );

    const updateMergedAutocompleteSystemdServices = useCallback(() => {
      const merged = mergeSystemdServices(
        backendSystemdServicesRef.current,
        outputDiscoveredSystemdUnitsRef.current,
      ).slice(0, 400);

      if (areStringArraysEqual(autocompleteSystemdUnitsRef.current, merged)) {
        return false;
      }

      autocompleteSystemdUnitsRef.current = merged;
      systemdServicesVersionRef.current += 1;
      autocompleteMatchCacheRef.current = null;
      logAutocompleteDebug("merged systemd services", {
        count: merged.length,
        sample: getAutocompleteServiceSample(merged),
        version: systemdServicesVersionRef.current,
      });
      return true;
    }, []);

    const rememberAutocompleteBackendSystemdServices = useCallback(
      (services: string[]) => {
        backendSystemdServicesRef.current = mergeSystemdServices(
          services,
          [],
        ).slice(0, 400);
        return updateMergedAutocompleteSystemdServices();
      },
      [updateMergedAutocompleteSystemdServices],
    );

    const rememberAutocompleteOutputSystemdServices = useCallback(
      (data: string) => {
        const services = extractSystemdUnitsFromTerminalOutput(data).filter(
          (unit) => unit.endsWith(".service"),
        );
        if (services.length === 0) {
          return false;
        }

        outputDiscoveredSystemdUnitsRef.current = mergeSystemdServices(
          services,
          outputDiscoveredSystemdUnitsRef.current,
        ).slice(0, 400);
        return updateMergedAutocompleteSystemdServices();
      },
      [updateMergedAutocompleteSystemdServices],
    );

    const getSystemdUnitsRefreshKey = useCallback(() => {
      const hostKey =
        hostConfig.id ??
        hostConfig.instanceId ??
        `${hostConfig.username}@${hostConfig.ip}:${hostConfig.port}`;
      return `${hostKey}:${sessionIdRef.current ?? "pending"}`;
    }, [
      hostConfig.id,
      hostConfig.instanceId,
      hostConfig.ip,
      hostConfig.port,
      hostConfig.username,
    ]);

    const requestSystemdUnitsRefresh = useCallback(
      (reason: "connected" | "autocomplete-context") => {
        const ws = webSocketRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          return false;
        }

        const refreshKey = getSystemdUnitsRefreshKey();
        const now = Date.now();
        const lastRequestedAt =
          systemdUnitsRefreshRequestsRef.current[refreshKey] ?? 0;
        if (
          now - lastRequestedAt < SYSTEMD_UNITS_REFRESH_THROTTLE_MS &&
          lastRequestedAt > 0
        ) {
          return false;
        }

        systemdUnitsRefreshRequestsRef.current[refreshKey] = now;
        ws.send(JSON.stringify({ type: "refresh_systemd_units" }));
        logAutocompleteDebug("requested systemd unit refresh", {
          reason,
          refreshKey,
        });
        return true;
      },
      [getSystemdUnitsRefreshKey],
    );

    const getAutocompleteMatches = useCallback(
      (currentCommand: string, mode: "popup" | "ghost") => {
        const systemdUnits = autocompleteSystemdUnitsRef.current;
        const cacheKey = [
          currentCommand,
          mode,
          autocompleteHistoryVersionRef.current,
          systemdServicesVersionRef.current,
        ].join("\u0000");

        if (autocompleteMatchCacheRef.current?.key === cacheKey) {
          return autocompleteMatchCacheRef.current.matches;
        }

        const startedAt = performance.now();
        if (isSystemdUnitAutocompleteContext(currentCommand)) {
          const lastLogged = lastLoggedSystemdBuildRef.current;
          if (
            !lastLogged ||
            lastLogged.count !== systemdUnits.length ||
            lastLogged.version !== systemdServicesVersionRef.current
          ) {
            logAutocompleteDebug(
              "systemd services passed to buildTerminalAutocompleteMatchItems",
              {
                count: systemdUnits.length,
                version: systemdServicesVersionRef.current,
              },
            );
            lastLoggedSystemdBuildRef.current = {
              count: systemdUnits.length,
              version: systemdServicesVersionRef.current,
            };
          }
        }

        const matches = buildTerminalAutocompleteMatchItems(
          currentCommand,
          autocompleteHistory.current,
          {
            mode,
            systemdUnits,
          },
        );
        logAutocompletePerf("buildTerminalAutocompleteMatchItems", startedAt);
        autocompleteMatchCacheRef.current = {
          key: cacheKey,
          matches,
        };
        return matches;
      },
      [],
    );

    const closeAutocompleteRef = useRef(closeAutocomplete);

    useEffect(() => {
      closeAutocompleteRef.current = closeAutocomplete;
    }, [closeAutocomplete]);

    useEffect(() => {
      const handleCommandAutocompleteChanged = () => {
        const settings = getTerminalAutocompleteSettings();
        setAutocompleteSettings(settings);

        if (!settings.ghost && !settings.popup) {
          closeAutocomplete();
        }
      };

      window.addEventListener(
        "terminalAutocompleteSettingsChanged",
        handleCommandAutocompleteChanged,
      );
      window.addEventListener(
        "commandAutocompleteChanged",
        handleCommandAutocompleteChanged,
      );
      window.addEventListener("storage", handleCommandAutocompleteChanged);

      return () => {
        window.removeEventListener(
          "terminalAutocompleteSettingsChanged",
          handleCommandAutocompleteChanged,
        );
        window.removeEventListener(
          "commandAutocompleteChanged",
          handleCommandAutocompleteChanged,
        );
        window.removeEventListener("storage", handleCommandAutocompleteChanged);
      };
    }, [closeAutocomplete]);

    useEffect(() => {
      const element = xtermRef.current;
      if (!element) {
        return;
      }

      const markFocused = () => {
        terminalFocusedRef.current = true;
        setTerminalFocused(true);
      };

      const markBlurred = (event: FocusEvent) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && element.contains(nextTarget)) {
          return;
        }

        terminalFocusedRef.current = false;
        setTerminalFocused(false);
        setAutocompleteHint(null);
      };

      element.addEventListener("focusin", markFocused);
      element.addEventListener("pointerdown", markFocused);
      element.addEventListener("focusout", markBlurred);

      return () => {
        element.removeEventListener("focusin", markFocused);
        element.removeEventListener("pointerdown", markFocused);
        element.removeEventListener("focusout", markBlurred);
      };
    }, [xtermRef]);

    const updateAutocompletePosition = useCallback(
      (suggestionCount: number) => {
        if (!terminal) {
          return;
        }

        const cursorY = terminal.buffer.active.cursorY;
        const cursorX = terminal.buffer.active.cursorX;
        const signature = [
          cursorY,
          cursorX,
          suggestionCount,
          terminal.cols,
          terminal.rows,
          autocompleteOpenModeRef.current,
        ].join(":");

        if (lastAutocompletePositionSignatureRef.current === signature) {
          return;
        }

        const element = xtermRef.current;

        if (!element) {
          return;
        }

        const startedAt = performance.now();
        lastAutocompletePositionSignatureRef.current = signature;

        const terminalWithMetrics = terminal as typeof terminal & {
          _core?: {
            _renderService?: {
              dimensions?: {
                css?: {
                  cell?: {
                    width?: number;
                    height?: number;
                  };
                };
              };
            };
          };
        };
        const xtermRows = element.querySelector<HTMLElement>(".xterm-rows");
        const xtermScreen = element.querySelector<HTMLElement>(".xterm-screen");
        const xtermCursor = element.querySelector<HTMLElement>(".xterm-cursor");
        const renderElement = xtermRows ?? xtermScreen ?? element;
        const renderRect = renderElement.getBoundingClientRect();
        const cursorRect = xtermCursor?.getBoundingClientRect();
        const hasCursorRect =
          cursorRect &&
          cursorRect.height > 0 &&
          Number.isFinite(cursorRect.top) &&
          Number.isFinite(cursorRect.left);
        const measuredCell =
          terminalWithMetrics._core?._renderService?.dimensions?.css?.cell;
        const cellHeight =
          measuredCell?.height && measuredCell.height > 0
            ? measuredCell.height
            : terminal.rows > 0
              ? renderRect.height / terminal.rows
              : 20;
        const cellWidth =
          measuredCell?.width && measuredCell.width > 0
            ? measuredCell.width
            : terminal.cols > 0
              ? renderRect.width / terminal.cols
              : 10;
        const displayedSuggestions = autocompleteSuggestionsRef.current.slice(
          0,
          suggestionCount,
        );
        const displayedSuggestionSources =
          autocompleteSuggestionSourcesRef.current.slice(0, suggestionCount);
        const isAutomaticPopup =
          autocompleteOpenModeRef.current === "automatic";
        const selectedSuggestion =
          autocompleteSuggestionsRef.current[
            autocompleteSelectedIndexRef.current
          ] ??
          displayedSuggestions[0] ??
          "";
        const helpHeight =
          autocompleteSettingsRef.current.help &&
          !isAutomaticPopup &&
          Boolean(getTerminalAutocompleteHelp(selectedSuggestion))
            ? 160
            : 0;
        const layoutRows = displayedSuggestions.map((_, index) => ({
          hasSourceBoundary:
            index > 0 &&
            displayedSuggestionSources[index] !==
              displayedSuggestionSources[index - 1],
        }));
        const longestSuggestionLength = displayedSuggestions.reduce(
          (length, suggestion, index) => {
            const source = displayedSuggestionSources[index];
            const displaySuggestion =
              source === "history" ||
              isAutocompleteHistorySuggestion(
                suggestion,
                autocompleteHistory.current,
              )
                ? suggestion
                : getTerminalAutocompleteCatalogDisplayLabel(
                    currentAutocompleteCommand.current,
                    suggestion,
                  );
            return Math.max(length, displaySuggestion.length);
          },
          0,
        );
        const longestDescriptionLength = displayedSuggestions.reduce(
          (length, suggestion) => {
            const description =
              getLocalizedTerminalAutocompleteSuggestionDescription(
                t,
                i18n.language,
                currentAutocompleteCommand.current,
                suggestion,
              );
            return Math.max(length, Math.min(description.length, 44));
          },
          0,
        );
        const menuWidth = Math.min(
          isAutomaticPopup ? 640 : 820,
          Math.max(
            isAutomaticPopup ? 400 : 460,
            longestSuggestionLength * cellWidth +
              longestDescriptionLength * Math.min(cellWidth, 8) +
              (isAutomaticPopup ? 110 : 160),
          ),
          window.innerWidth - 16,
        );
        const viewportMargin = 8;
        const estimatedMenuHeight =
          getCommandAutocompleteListHeight(layoutRows, isAutomaticPopup) +
          helpHeight;
        const cursorBottomY = hasCursorRect
          ? cursorRect.bottom
          : renderRect.top + (cursorY + 1) * cellHeight;
        const cursorTopY = hasCursorRect
          ? cursorRect.top
          : renderRect.top + cursorY * cellHeight;
        const spaceBelow = window.innerHeight - cursorBottomY - viewportMargin;
        const spaceAbove = cursorTopY;
        const showAbove =
          spaceBelow < estimatedMenuHeight + 12 && spaceAbove > spaceBelow;
        const preferredTop = showAbove
          ? cursorTopY - estimatedMenuHeight - 4
          : cursorBottomY + 4;
        const preferredLeft = hasCursorRect
          ? cursorRect.left
          : renderRect.left + cursorX * cellWidth;

        setAutocompletePosition({
          top: Math.max(
            viewportMargin,
            Math.min(
              preferredTop,
              window.innerHeight - estimatedMenuHeight - viewportMargin,
            ),
          ),
          left: Math.max(
            viewportMargin,
            Math.min(
              preferredLeft,
              window.innerWidth - menuWidth - viewportMargin,
            ),
          ),
        });
        logAutocompletePerf("updateAutocompletePosition", startedAt);
      },
      [terminal, xtermRef],
    );

    const updateAutocompleteHint = useCallback(
      (currentCommand: string, selectedCommand: string) => {
        if (!terminal || !terminalFocusedRef.current) {
          setAutocompleteHint(null);
          return;
        }

        const completion = getTerminalAutocompleteCompletion(
          currentCommand,
          selectedCommand,
        );

        if (!completion) {
          setAutocompleteHint(null);
          return;
        }

        const element = xtermRef.current;
        const cursorY = terminal.buffer.active.cursorY;
        const cursorX = terminal.buffer.active.cursorX;

        if (!element) {
          setAutocompleteHint(null);
          return;
        }

        const bufferLine = terminal.buffer.active.getLine(
          terminal.buffer.active.baseY + cursorY,
        );
        const lineBeforeCursor =
          bufferLine?.translateToString(false, 0, cursorX) ?? "";
        const visibleBeforeCursor = lineBeforeCursor.trimEnd();
        const typedCommand = currentCommand.trimEnd();
        const isSameRenderedCommand =
          visibleBeforeCursor.endsWith(typedCommand) ||
          normalizeTerminalLineSuffix(visibleBeforeCursor).endsWith(
            normalizeTerminalLineSuffix(typedCommand),
          );

        if (!isSameRenderedCommand) {
          setAutocompleteHint(null);
          return;
        }

        const terminalWithMetrics = terminal as typeof terminal & {
          _core?: {
            _renderService?: {
              dimensions?: {
                css?: {
                  cell?: {
                    width?: number;
                    height?: number;
                  };
                };
              };
            };
          };
        };
        const xtermRows = element.querySelector<HTMLElement>(".xterm-rows");
        const xtermScreen = element.querySelector<HTMLElement>(".xterm-screen");
        const xtermCursor = element.querySelector<HTMLElement>(".xterm-cursor");
        const renderElement = xtermRows ?? xtermScreen ?? element;
        const renderRect = renderElement.getBoundingClientRect();
        const cursorRect = xtermCursor?.getBoundingClientRect();
        const hasCursorRect =
          cursorRect &&
          cursorRect.height > 0 &&
          Number.isFinite(cursorRect.top) &&
          Number.isFinite(cursorRect.left);
        const measuredCell =
          terminalWithMetrics._core?._renderService?.dimensions?.css?.cell;
        const cellWidth =
          measuredCell?.width && measuredCell.width > 0
            ? measuredCell.width
            : terminal.cols > 0
              ? renderRect.width / terminal.cols
              : 10;
        const cellHeight =
          measuredCell?.height && measuredCell.height > 0
            ? measuredCell.height
            : terminal.rows > 0
              ? renderRect.height / terminal.rows
              : 20;
        const top = hasCursorRect
          ? cursorRect.top
          : renderRect.top + cursorY * cellHeight;
        const left = hasCursorRect
          ? cursorRect.left
          : renderRect.left + cursorX * cellWidth;
        const lineHeightPx = hasCursorRect ? cursorRect.height : cellHeight;

        if (
          cursorX >= terminal.cols - 1 ||
          left + cellWidth * 2 > window.innerWidth - 8
        ) {
          setAutocompleteHint(null);
          return;
        }

        currentAutocompleteCommand.current = currentCommand;
        setAutocompleteHint({
          command: currentCommand,
          completion,
          position: { top, left },
          lineHeightPx,
        });
      },
      [terminal, xtermRef],
    );

    const syncCommandTrackerFromRenderedLine = useCallback(() => {
      if (!terminal) {
        return;
      }

      const cursorY = terminal.buffer.active.cursorY;
      const cursorX = terminal.buffer.active.cursorX;
      const bufferLine = terminal.buffer.active.getLine(
        terminal.buffer.active.baseY + cursorY,
      );
      const lineBeforeCursor =
        bufferLine?.translateToString(false, 0, cursorX) ?? "";

      if (terminalLineLooksLikeSecretPrompt(lineBeforeCursor)) {
        updateCurrentCommandRef.current("");
        return;
      }

      const renderedCommand = extractRenderedCommandFromLine(
        lineBeforeCursor,
        getCurrentCommandRef.current(),
      );

      if (renderedCommand) {
        updateCurrentCommandRef.current(renderedCommand);
      }
    }, [terminal]);

    const showAutocompleteMatches = useCallback(
      (
        currentCommand: string,
        matches: Array<{ command: string; source: TerminalAutocompleteSource }>,
        openMode: AutocompleteOpenMode = "manual",
        selectionActive = false,
      ) => {
        if (matches.length === 0) {
          closeAutocomplete();
          return;
        }

        const commands = matches.map((match) => match.command);
        const sources = matches.map((match) => match.source);

        currentAutocompleteCommand.current = currentCommand;
        setAutocompleteHint(null);
        autocompleteSuggestionsRef.current = commands;
        autocompleteSuggestionSourcesRef.current = sources;
        setAutocompleteSuggestions(commands);
        setAutocompleteSuggestionSources(sources);
        setAutocompleteSelectedIndex(0);
        autocompleteSelectionActiveRef.current = selectionActive;
        setAutocompleteSelectionActive(selectionActive);
        if (selectionActive) {
          autocompleteInputModeRef.current = "completion";
        } else if (autocompleteInputModeRef.current !== "history") {
          autocompleteInputModeRef.current = currentCommand.trim()
            ? "typing"
            : "idle";
        }
        autocompleteOpenModeRef.current = openMode;
        setAutocompleteOpenMode(openMode);
        updateAutocompletePosition(matches.length);
        setShowAutocomplete(true);
      },
      [closeAutocomplete, updateAutocompletePosition],
    );

    const openAutocompletePopupForCurrentCommand = useCallback(() => {
      if (!autocompleteSettingsRef.current.popup) {
        return false;
      }

      syncCommandTrackerFromRenderedLine();
      const currentCommand = getCurrentCommandRef.current();

      if (!currentCommand.trim() || !isCursorAtEndRef.current()) {
        return false;
      }

      if (isSystemdUnitAutocompleteContext(currentCommand)) {
        requestSystemdUnitsRefresh("autocomplete-context");
      }

      const matches = getAutocompleteMatches(currentCommand, "popup");

      if (matches.length === 0) {
        return false;
      }

      showAutocompleteMatches(currentCommand, matches, "manual", true);
      return true;
    }, [
      getAutocompleteMatches,
      requestSystemdUnitsRefresh,
      showAutocompleteMatches,
      syncCommandTrackerFromRenderedLine,
    ]);

    const refreshAutocompleteSuggestions = useCallback(() => {
      const startedAt = performance.now();
      const finishRefresh = () => {
        logAutocompletePerf("refreshAutocompleteSuggestions", startedAt);
      };
      const shouldShowAutomaticPopup =
        autocompleteSettings.popup && autocompleteSettings.popupAuto;

      if (
        (!autocompleteSettings.ghost && !shouldShowAutomaticPopup) ||
        !terminalFocusedRef.current
      ) {
        closeAutocomplete();
        finishRefresh();
        return;
      }

      syncCommandTrackerFromRenderedLine();
      const currentCommand = getCurrentCommandRef.current();

      if (!currentCommand.trim() || !isCursorAtEndRef.current()) {
        closeAutocomplete();
        finishRefresh();
        return;
      }

      if (autocompleteInputModeRef.current === "history") {
        setShowAutocomplete(false);
        setAutocompleteHint(null);
        finishRefresh();
        return;
      }

      if (isSystemdUnitAutocompleteContext(currentCommand)) {
        requestSystemdUnitsRefresh("autocomplete-context");
      }

      if (shouldShowAutomaticPopup) {
        const matches = getAutocompleteMatches(currentCommand, "popup");

        if (matches.length === 0) {
          closeAutocomplete();
          finishRefresh();
          return;
        }

        showAutocompleteMatches(currentCommand, matches, "automatic", false);
        finishRefresh();
        return;
      }

      const matches = getAutocompleteMatches(currentCommand, "ghost");

      if (matches.length === 0) {
        closeAutocomplete();
        finishRefresh();
        return;
      }

      const commands = matches.map((match) => match.command);
      const sources = matches.map((match) => match.source);
      currentAutocompleteCommand.current = currentCommand;
      autocompleteSuggestionsRef.current = commands;
      autocompleteSuggestionSourcesRef.current = sources;
      setAutocompleteSuggestions(commands);
      setAutocompleteSuggestionSources(sources);
      setAutocompleteSelectedIndex(0);
      autocompleteSelectionActiveRef.current = false;
      setAutocompleteSelectionActive(false);
      if (autocompleteInputModeRef.current !== "history") {
        autocompleteInputModeRef.current = "typing";
      }
      setShowAutocomplete(false);
      updateAutocompleteHint(currentCommand, matches[0].command);
      finishRefresh();
    }, [
      autocompleteSettings.ghost,
      autocompleteSettings.popup,
      autocompleteSettings.popupAuto,
      closeAutocomplete,
      getAutocompleteMatches,
      requestSystemdUnitsRefresh,
      showAutocompleteMatches,
      syncCommandTrackerFromRenderedLine,
      updateAutocompleteHint,
    ]);

    const refreshAutocompleteSuggestionsRef = useRef(
      refreshAutocompleteSuggestions,
    );

    useEffect(() => {
      refreshAutocompleteSuggestionsRef.current =
        refreshAutocompleteSuggestions;
    }, [refreshAutocompleteSuggestions]);

    const queueAutocompleteRefreshAfterTerminalWrite = useCallback(() => {
      if (
        !autocompleteSettingsRef.current.ghost &&
        !(
          autocompleteSettingsRef.current.popup &&
          autocompleteSettingsRef.current.popupAuto
        )
      ) {
        return;
      }

      if (autocompleteRefreshTimeoutRef.current !== null) {
        window.clearTimeout(autocompleteRefreshTimeoutRef.current);
      }

      autocompleteRefreshTimeoutRef.current = window.setTimeout(() => {
        autocompleteRefreshTimeoutRef.current = null;
        refreshAutocompleteSuggestionsRef.current();
      }, AUTOCOMPLETE_REFRESH_DEBOUNCE_MS);
    }, []);

    useEffect(() => {
      return () => {
        if (autocompleteRefreshTimeoutRef.current !== null) {
          window.clearTimeout(autocompleteRefreshTimeoutRef.current);
          autocompleteRefreshTimeoutRef.current = null;
        }
      };
    }, []);

    const sendTerminalInput = useCallback(
      (data: string, options: { track?: boolean } = {}) => {
        if (webSocketRef.current?.readyState !== 1) {
          return;
        }

        if (options.track !== false) {
          trackInputRef.current(data);
        }

        webSocketRef.current.send(JSON.stringify({ type: "input", data }));
      },
      [],
    );

    const sendTabToShell = useCallback(() => {
      sendTerminalInput("\t", { track: false });
    }, [sendTerminalInput]);

    const applyAutocompleteSelection = useCallback(
      (selectedCommand: string) => {
        if (webSocketRef.current?.readyState !== 1) {
          return;
        }

        const currentCmd =
          currentAutocompleteCommand.current || getCurrentCommandRef.current();
        const commandToInsert =
          getTerminalAutocompleteInsertCommand(selectedCommand);
        const completion = getTerminalAutocompleteCompletion(
          currentCmd,
          selectedCommand,
        );

        if (completion) {
          for (const char of completion) {
            sendTerminalInput(char);
          }
        }

        updateCurrentCommandRef.current(commandToInsert);
        closeAutocomplete();

        setTimeout(() => {
          terminal?.focus();
        }, 50);
      },
      [closeAutocomplete, sendTerminalInput, terminal],
    );

    const activityLoggingRef = useRef(false);
    const sudoPromptShownRef = useRef(false);

    const lastSentSizeRef = useRef<{ cols: number; rows: number } | null>(null);
    const pendingSizeRef = useRef<{ cols: number; rows: number } | null>(null);
    const notifyTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastFittedSizeRef = useRef<{ cols: number; rows: number } | null>(
      null,
    );
    const DEBOUNCE_MS = 140;

    const logTerminalActivity = async () => {
      if (
        !hostConfig.id ||
        activityLoggedRef.current ||
        activityLoggingRef.current
      ) {
        return;
      }

      activityLoggingRef.current = true;
      activityLoggedRef.current = true;

      try {
        const hostName =
          hostConfig.name || `${hostConfig.username}@${hostConfig.ip}`;
        await logActivity("terminal", hostConfig.id, hostName);
      } catch (err) {
        console.warn("Failed to log terminal activity:", err);
        activityLoggedRef.current = false;
      } finally {
        activityLoggingRef.current = false;
      }
    };

    useEffect(() => {
      isVisibleRef.current = isVisible;
    }, [isVisible]);

    useEffect(() => {
      const checkAuth = () => {
        setIsAuthenticated((prev) => {
          if (!prev) {
            return true;
          }
          return prev;
        });
      };

      checkAuth();

      const authCheckInterval = setInterval(checkAuth, 5000);

      return () => clearInterval(authCheckInterval);
    }, []);

    function hardRefresh() {
      try {
        if (
          terminal &&
          typeof (
            terminal as { refresh?: (start: number, end: number) => void }
          ).refresh === "function"
        ) {
          (
            terminal as { refresh?: (start: number, end: number) => void }
          ).refresh(0, terminal.rows - 1);
        }
      } catch (error) {
        console.error("Terminal operation failed:", error);
      }
    }

    function performFit() {
      if (
        !fitAddonRef.current ||
        !terminal ||
        !isVisible ||
        isFittingRef.current
      ) {
        return;
      }

      isFittingRef.current = true;

      try {
        fitAddonRef.current.fit();
        if (terminal && terminal.cols > 0 && terminal.rows > 0) {
          const lastSize = lastFittedSizeRef.current;
          if (
            !lastSize ||
            lastSize.cols !== terminal.cols ||
            lastSize.rows !== terminal.rows
          ) {
            scheduleNotify(terminal.cols, terminal.rows);
            lastFittedSizeRef.current = {
              cols: terminal.cols,
              rows: terminal.rows,
            };
          }
        }
        setIsFitted(true);
      } finally {
        isFittingRef.current = false;
      }
    }

    function handleTotpSubmit(code: string) {
      if (webSocketRef.current && code) {
        if (totpTimeoutRef.current) {
          clearTimeout(totpTimeoutRef.current);
          totpTimeoutRef.current = null;
        }
        webSocketRef.current.send(
          JSON.stringify({
            type: isPasswordPrompt ? "password_response" : "totp_response",
            data: { code },
          }),
        );
        setTotpRequired(false);
        setTotpPrompt("");
        setIsPasswordPrompt(false);
      }
    }

    function handleTotpCancel() {
      if (totpTimeoutRef.current) {
        clearTimeout(totpTimeoutRef.current);
        totpTimeoutRef.current = null;
      }
      setTotpRequired(false);
      setTotpPrompt("");
      if (onClose) onClose();
    }

    function handleWarpgateContinue() {
      if (webSocketRef.current) {
        if (warpgateTimeoutRef.current) {
          clearTimeout(warpgateTimeoutRef.current);
          warpgateTimeoutRef.current = null;
        }
        webSocketRef.current.send(
          JSON.stringify({
            type: "warpgate_auth_continue",
            data: {},
          }),
        );
        setWarpgateAuthRequired(false);
        setWarpgateAuthUrl("");
        setWarpgateSecurityKey("");
      }
    }

    function handleWarpgateCancel() {
      if (warpgateTimeoutRef.current) {
        clearTimeout(warpgateTimeoutRef.current);
        warpgateTimeoutRef.current = null;
      }
      setWarpgateAuthRequired(false);
      setWarpgateAuthUrl("");
      setWarpgateSecurityKey("");
      if (onClose) onClose();
    }

    function handleWarpgateOpenUrl() {
      if (warpgateAuthUrl) {
        window.open(warpgateAuthUrl, "_blank", "noopener,noreferrer");
      }
    }

    function handleAuthDialogSubmit(credentials: {
      password?: string;
      sshKey?: string;
      keyPassword?: string;
    }) {
      if (webSocketRef.current && terminal) {
        webSocketRef.current.send(
          JSON.stringify({
            type: "reconnect_with_credentials",
            data: {
              cols: terminal.cols,
              rows: terminal.rows,
              password: credentials.password,
              sshKey: credentials.sshKey,
              keyPassword: credentials.keyPassword,
              hostConfig: {
                ...hostConfig,
                password: credentials.password,
                key: credentials.sshKey,
                keyPassword: credentials.keyPassword,
              },
            },
          }),
        );
        setShowAuthDialog(false);
        setIsConnecting(true);
      }
    }

    function handleAuthDialogCancel() {
      setShowAuthDialog(false);
      if (onClose) onClose();
    }

    function handlePassphraseSubmit(passphrase: string) {
      if (webSocketRef.current && terminal) {
        webSocketRef.current.send(
          JSON.stringify({
            type: "reconnect_with_credentials",
            data: {
              cols: terminal.cols,
              rows: terminal.rows,
              keyPassword: passphrase,
              hostConfig: {
                ...hostConfig,
                keyPassword: passphrase,
              },
            },
          }),
        );
        setShowPassphraseDialog(false);
        setIsConnecting(true);
      }
    }

    function handlePassphraseCancel() {
      setShowPassphraseDialog(false);
      if (onClose) onClose();
    }

    function scheduleNotify(cols: number, rows: number) {
      if (!(cols > 0 && rows > 0)) return;
      pendingSizeRef.current = { cols, rows };
      if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current);
      notifyTimerRef.current = setTimeout(() => {
        const next = pendingSizeRef.current;
        const last = lastSentSizeRef.current;
        if (!next) return;
        if (last && last.cols === next.cols && last.rows === next.rows) return;
        if (webSocketRef.current?.readyState === WebSocket.OPEN) {
          webSocketRef.current.send(
            JSON.stringify({ type: "resize", data: next }),
          );
          lastSentSizeRef.current = next;
        }
      }, DEBOUNCE_MS);
    }

    useImperativeHandle(
      ref,
      () => ({
        disconnect: () => {
          isUnmountingRef.current = true;
          shouldNotReconnectRef.current = true;
          isReconnectingRef.current = false;
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
          if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current);
            pongTimeoutRef.current = null;
          }
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          if (totpTimeoutRef.current) {
            clearTimeout(totpTimeoutRef.current);
            totpTimeoutRef.current = null;
          }
          if (warpgateTimeoutRef.current) {
            clearTimeout(warpgateTimeoutRef.current);
            warpgateTimeoutRef.current = null;
          }
          if (webSocketRef.current?.readyState === WebSocket.OPEN) {
            webSocketRef.current.send(JSON.stringify({ type: "disconnect" }));
          }
          sessionIdRef.current = null;
          webSocketRef.current?.close();
          setIsConnected(false);
          setIsConnecting(false);
        },
        reconnect: () => {
          isUnmountingRef.current = false;
          shouldNotReconnectRef.current = false;
          isReconnectingRef.current = false;
          isConnectingRef.current = false;
          reconnectAttempts.current = 0;
          wasDisconnectedBySSH.current = false;
          wasConnectedRef.current = false;
          updateConnectionError(null);
          setShowDisconnectedOverlay(false);
          if (terminal) {
            terminal.clear();
            const cols = terminal.cols;
            const rows = terminal.rows;
            connectToHost(cols, rows);
          }
        },
        fit: () => {
          if (!fitAddonRef.current || !terminal || isFittingRef.current) return;
          isFittingRef.current = true;
          try {
            fitAddonRef.current.fit();
            if (terminal.cols > 0 && terminal.rows > 0) {
              const lastSize = lastFittedSizeRef.current;
              if (
                !lastSize ||
                lastSize.cols !== terminal.cols ||
                lastSize.rows !== terminal.rows
              ) {
                scheduleNotify(terminal.cols, terminal.rows);
                lastFittedSizeRef.current = {
                  cols: terminal.cols,
                  rows: terminal.rows,
                };
              }
            }
            setIsFitted(true);
          } finally {
            isFittingRef.current = false;
          }
        },
        sendInput: (data: string) => {
          if (webSocketRef.current?.readyState === 1) {
            webSocketRef.current.send(JSON.stringify({ type: "input", data }));
          }
        },
        notifyResize: () => {
          try {
            const cols = terminal?.cols ?? undefined;
            const rows = terminal?.rows ?? undefined;
            if (typeof cols === "number" && typeof rows === "number") {
              scheduleNotify(cols, rows);
              hardRefresh();
            }
          } catch (error) {
            console.error("Terminal operation failed:", error);
          }
        },
        refresh: () => hardRefresh(),
        openFileManager: () => {
          if (webSocketRef.current?.readyState === WebSocket.OPEN) {
            webSocketRef.current.send(JSON.stringify({ type: "get_cwd" }));
          } else {
            onOpenFileManager?.("/");
          }
        },
      }),
      [terminal],
    );

    function getUseRightClickCopyPaste() {
      return getCookie("rightClickCopyPaste") !== "false";
    }

    function attemptReconnection() {
      if (
        isUnmountingRef.current ||
        shouldNotReconnectRef.current ||
        isReconnectingRef.current ||
        isConnectingRef.current ||
        wasDisconnectedBySSH.current ||
        reconnectTimeoutRef.current !== null
      ) {
        return;
      }

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        setIsConnecting(false);
        shouldNotReconnectRef.current = true;
        setShowDisconnectedOverlay(true);
        addLog({
          type: "error",
          stage: "connection",
          message: t("terminal.maxReconnectAttemptsReached"),
        });
        return;
      }

      isReconnectingRef.current = true;

      if (terminal && !isAttachingSessionRef.current) {
        terminal.clear();
      }

      reconnectAttempts.current++;

      addLog({
        type: "info",
        stage: "connection",
        message: t("terminal.reconnecting", {
          attempt: reconnectAttempts.current,
          max: maxReconnectAttempts,
        }),
      });

      const delay = Math.min(
        2000 * Math.pow(2, reconnectAttempts.current - 1),
        8000,
      );

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;

        if (
          isUnmountingRef.current ||
          shouldNotReconnectRef.current ||
          wasDisconnectedBySSH.current
        ) {
          isReconnectingRef.current = false;
          return;
        }

        if (reconnectAttempts.current > maxReconnectAttempts) {
          isReconnectingRef.current = false;
          return;
        }

        if (terminal && hostConfig) {
          if (!isAttachingSessionRef.current) {
            terminal.clear();
          }
          const cols = terminal.cols;
          const rows = terminal.rows;
          connectToHost(cols, rows);
        }

        isReconnectingRef.current = false;
      }, delay);
    }

    async function connectToHost(cols: number, rows: number) {
      if (isConnectingRef.current) {
        return;
      }

      isConnectingRef.current = true;
      connectionAttemptIdRef.current++;
      wasConnectedRef.current = false;

      if (!isReconnectingRef.current) {
        reconnectAttempts.current = 0;
        shouldNotReconnectRef.current = false;
      }

      const isDev =
        !isElectron() &&
        process.env.NODE_ENV === "development" &&
        (window.location.port === "3000" ||
          window.location.port === "5173" ||
          window.location.port === "");

      let baseWsUrl: string;

      if (isDev) {
        baseWsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://localhost:30002`;
      } else if (isElectron()) {
        let configuredUrl = (window as { configuredServerUrl?: string | null })
          .configuredServerUrl;

        if (!configuredUrl && !isEmbeddedMode()) {
          try {
            const serverConfig = await getServerConfig();
            configuredUrl = serverConfig?.serverUrl || null;
            if (configuredUrl) {
              (
                window as Window &
                  typeof globalThis & {
                    configuredServerUrl?: string | null;
                  }
              ).configuredServerUrl = configuredUrl;
            }
          } catch (error) {
            console.error("Failed to resolve Electron server URL:", error);
          }
        }

        if (isEmbeddedMode()) {
          baseWsUrl = "ws://127.0.0.1:30002";
          const storedJwt = localStorage.getItem("jwt");
          if (storedJwt) {
            baseWsUrl += `?token=${encodeURIComponent(storedJwt)}`;
          }
        } else if (!configuredUrl) {
          console.error("No configured server URL available for Electron SSH");
          setIsConnected(false);
          setIsConnecting(false);
          updateConnectionError(t("errors.failedToLoadServer"));
          isConnectingRef.current = false;
          return;
        } else {
          const wsProtocol = configuredUrl.startsWith("https://")
            ? "wss://"
            : "ws://";
          const wsHost = configuredUrl
            .replace(/^https?:\/\//, "")
            .replace(/\/$/, "");
          baseWsUrl = `${wsProtocol}${wsHost}/ssh/websocket/`;
          const storedJwt = localStorage.getItem("jwt");
          if (storedJwt) {
            baseWsUrl += `?token=${encodeURIComponent(storedJwt)}`;
          }
        }
      } else {
        baseWsUrl = `${getBasePath()}/ssh/websocket/`;
      }

      if (
        webSocketRef.current &&
        webSocketRef.current.readyState !== WebSocket.CLOSED
      ) {
        webSocketRef.current.close();
      }

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      const ws = new WebSocket(baseWsUrl);
      webSocketRef.current = ws;
      wasDisconnectedBySSH.current = false;
      updateConnectionError(null);
      shouldNotReconnectRef.current = false;
      isReconnectingRef.current = false;
      setIsConnecting(true);

      setupWebSocketListeners(ws, cols, rows);
    }

    function setupWebSocketListeners(
      ws: WebSocket,
      cols: number,
      rows: number,
    ) {
      ws.addEventListener("open", () => {
        connectionTimeoutRef.current = setTimeout(() => {
          if (
            !isConnected &&
            !totpRequired &&
            !isPasswordPrompt &&
            !connectionErrorRef.current
          ) {
            if (terminal) {
              terminal.clear();
            }
            const timeoutMessage = t("terminal.connectionTimeout");
            updateConnectionError(timeoutMessage);
            addLog({
              type: "error",
              stage: "connection",
              message: timeoutMessage,
            });
            if (webSocketRef.current) {
              webSocketRef.current.close();
            }
            if (reconnectAttempts.current > 0) {
              attemptReconnection();
            } else {
              setIsConnecting(false);
              shouldNotReconnectRef.current = true;
            }
          }
        }, 35000);

        currentHostIdRef.current = hostConfig.id;
        currentHostConfigRef.current = hostConfig;

        // Consume the pending restored session ID once; retries get null so they create fresh connections
        const restoredSessionId = pendingRestoredSessionIdRef.current;
        pendingRestoredSessionIdRef.current = null;

        if (restoredSessionId) {
          sessionIdRef.current = restoredSessionId;
          isAttachingSessionRef.current = true;

          ws.send(
            JSON.stringify({
              type: "attachSession",
              data: {
                sessionId: restoredSessionId,
                cols,
                rows,
                tabInstanceId: hostConfig.instanceId,
              },
            }),
          );
        } else {
          isAttachingSessionRef.current = false;
          ws.send(
            JSON.stringify({
              type: "connectToHost",
              data: { cols, rows, hostConfig, initialPath, executeCommand },
            }),
          );
        }
        terminal.onData((data) => {
          if (data.includes("\r") || data.includes("\n")) {
            syncCommandTrackerFromRenderedLine();
          }
          trackInputRef.current(data);
          if (
            data.includes("\r") ||
            data.includes("\n") ||
            data.includes("\x08") ||
            data.includes("\x7f") ||
            data.includes("\u0003") ||
            data.includes("\u0004") ||
            data.includes("\u0015") ||
            data.includes("\u001b") ||
            !isCursorAtEndRef.current()
          ) {
            closeAutocompleteRef.current();
          } else {
            closeAutocompleteRef.current();
          }
          markAutocompleteInputModeFromTerminalData(data);
          ws.send(JSON.stringify({ type: "input", data }));
        });

        pongReceivedRef.current = true;
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            if (!pongReceivedRef.current) {
              console.warn(
                "[WebSocket] Pong timeout - connection appears dead, closing",
              );
              ws.close();
              return;
            }
            pongReceivedRef.current = false;
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      });

      ws.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "pong") {
            pongReceivedRef.current = true;
            return;
          }
          if (msg.type === "data") {
            if (typeof msg.data === "string") {
              rememberAutocompleteOutputSystemdServices(msg.data);
              observeAutocompleteCommandOutput(msg.data);
              const syntaxHighlightingEnabled =
                localStorage.getItem("terminalSyntaxHighlighting") === "true";

              const outputData = syntaxHighlightingEnabled
                ? highlightTerminalOutput(msg.data)
                : msg.data;

              terminal.write(
                outputData,
                queueAutocompleteRefreshAfterTerminalWrite,
              );
              const sudoPasswordPattern =
                /(?:\[sudo\][^\n]*:\s*$|sudo:[^\n]*password[^\n]*required|password for [^\n]*:\s*$|Password:\s*$)/i;
              const hasSudoPw =
                hostConfig.terminalConfig?.sudoPassword ||
                hostConfig.password ||
                hostConfig.hasSudoPassword ||
                hostConfig.hasPassword;
              if (
                config.sudoPasswordAutoFill &&
                sudoPasswordPattern.test(msg.data) &&
                hasSudoPw &&
                !sudoPromptShownRef.current
              ) {
                sudoPromptShownRef.current = true;
                confirmWithToast(
                  t("terminal.sudoPasswordPopupTitle"),
                  async () => {
                    // Fetch password on-demand from server
                    let passwordToFill =
                      hostConfig.terminalConfig?.sudoPassword ||
                      hostConfig.password;
                    if (!passwordToFill && hostConfig.id) {
                      passwordToFill =
                        (await getHostPassword(
                          hostConfig.id,
                          "sudoPassword",
                        )) ||
                        (await getHostPassword(hostConfig.id, "password")) ||
                        undefined;
                    }
                    if (
                      passwordToFill &&
                      webSocketRef.current &&
                      webSocketRef.current.readyState === WebSocket.OPEN
                    ) {
                      webSocketRef.current.send(
                        JSON.stringify({
                          type: "input",
                          data: passwordToFill + "\n",
                        }),
                      );
                    }
                    setTimeout(() => {
                      sudoPromptShownRef.current = false;
                    }, 3000);
                  },
                  t("common.confirm"),
                  t("common.cancel"),
                  { confirmOnEnter: true },
                );
                setTimeout(() => {
                  sudoPromptShownRef.current = false;
                }, 15000);
              }
            } else {
              const syntaxHighlightingEnabled =
                localStorage.getItem("terminalSyntaxHighlighting") === "true";

              const stringData = String(msg.data);
              rememberAutocompleteOutputSystemdServices(stringData);
              observeAutocompleteCommandOutput(stringData);
              const outputData = syntaxHighlightingEnabled
                ? highlightTerminalOutput(stringData)
                : stringData;

              terminal.write(
                outputData,
                queueAutocompleteRefreshAfterTerminalWrite,
              );
            }
          } else if (
            msg.type === "autocomplete_systemd_services" ||
            msg.type === "autocomplete_systemd_units"
          ) {
            const rawServices =
              msg.type === "autocomplete_systemd_services"
                ? msg.services
                : msg.units;
            const services = Array.isArray(rawServices)
              ? rawServices.filter(
                  (service: unknown): service is string =>
                    typeof service === "string",
                )
              : [];
            logAutocompleteDebug("received systemd autocomplete units", {
              type: msg.type,
              count: services.length,
              sample: getAutocompleteServiceSample(services),
            });
            if (rememberAutocompleteBackendSystemdServices(services)) {
              refreshAutocompleteSuggestionsRef.current();
            }
          } else if (msg.type === "error") {
            const errorMessage = msg.message || t("terminal.unknownError");

            addLog({
              type: "error",
              stage: "connection",
              message: errorMessage,
            });

            if (
              errorMessage.toLowerCase().includes("connection") ||
              errorMessage.toLowerCase().includes("timeout") ||
              errorMessage.toLowerCase().includes("network")
            ) {
              updateConnectionError(errorMessage);
              setIsConnected(false);
              if (terminal) {
                terminal.clear();
              }
              setIsConnecting(false);
              wasDisconnectedBySSH.current = false;
              return;
            }

            if (
              (errorMessage.toLowerCase().includes("auth") &&
                errorMessage.toLowerCase().includes("failed")) ||
              errorMessage.toLowerCase().includes("permission denied") ||
              (errorMessage.toLowerCase().includes("invalid") &&
                (errorMessage.toLowerCase().includes("password") ||
                  errorMessage.toLowerCase().includes("key"))) ||
              errorMessage.toLowerCase().includes("incorrect password")
            ) {
              updateConnectionError(errorMessage);
              setIsConnecting(false);
              shouldNotReconnectRef.current = true;
              if (webSocketRef.current) {
                webSocketRef.current.close();
              }
              return;
            }

            updateConnectionError(errorMessage);
            setIsConnecting(false);
          } else if (msg.type === "connected") {
            opksshFailedRef.current = false;
            wasConnectedRef.current = true;
            setIsConnected(true);
            setIsConnecting(false);
            isConnectingRef.current = false;
            updateConnectionError(null);
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            if (reconnectAttempts.current > 0) {
              addLog({
                type: "success",
                stage: "connection",
                message: t("terminal.reconnected"),
              });
            } else {
              addLog({
                type: "success",
                stage: "connection",
                message: t("terminal.connected"),
              });
            }
            reconnectAttempts.current = 0;
            isReconnectingRef.current = false;

            logTerminalActivity();
            requestSystemdUnitsRefresh("connected");

            setTimeout(async () => {
              const terminalConfig = {
                ...DEFAULT_TERMINAL_CONFIG,
                ...hostConfig.terminalConfig,
              };

              if (
                terminalConfig.environmentVariables &&
                terminalConfig.environmentVariables.length > 0
              ) {
                for (const envVar of terminalConfig.environmentVariables) {
                  if (envVar.key && envVar.value && ws.readyState === 1) {
                    ws.send(
                      JSON.stringify({
                        type: "input",
                        data: `export ${envVar.key}="${envVar.value}"\n`,
                      }),
                    );
                  }
                }
              }

              if (terminalConfig.startupSnippetId) {
                try {
                  const snippets = await getSnippets();
                  const snippet = snippets.find(
                    (s: { id: number }) =>
                      s.id === terminalConfig.startupSnippetId,
                  );
                  if (snippet && ws.readyState === 1) {
                    ws.send(
                      JSON.stringify({
                        type: "input",
                        data: snippet.content + "\n",
                      }),
                    );
                  }
                } catch (err) {
                  console.warn("Failed to execute startup snippet:", err);
                }
              }

              if (terminalConfig.autoMosh && ws.readyState === 1) {
                ws.send(
                  JSON.stringify({
                    type: "input",
                    data: terminalConfig.moshCommand + "\n",
                  }),
                );
              }
            }, 100);
          } else if (msg.type === "session_ended") {
            wasDisconnectedBySSH.current = true;
            setIsConnected(false);
            setIsConnecting(false);
            shouldNotReconnectRef.current = true;
            if (onClose) {
              onClose();
            }
          } else if (msg.type === "disconnected") {
            wasDisconnectedBySSH.current = true;
            shouldNotReconnectRef.current = true;
            setIsConnected(false);
            setIsConnecting(false);
            if (msg.graceful) {
              wasConnectedRef.current = false;
              if (onClose) onClose();
            } else if (wasConnectedRef.current) {
              wasConnectedRef.current = false;
              setShowDisconnectedOverlay(true);
            } else if (!connectionErrorRef.current) {
              updateConnectionError(
                msg.message || t("terminal.connectionRejected"),
              );
            }
          } else if (msg.type === "totp_required") {
            setTotpRequired(true);
            setTotpPrompt(msg.prompt || t("terminal.totpCodeLabel"));
            setIsPasswordPrompt(false);
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            if (totpTimeoutRef.current) {
              clearTimeout(totpTimeoutRef.current);
            }
            totpTimeoutRef.current = setTimeout(() => {
              setTotpRequired(false);
              if (webSocketRef.current) {
                webSocketRef.current.close();
              }
            }, 180000);
          } else if (msg.type === "totp_retry") {
            // Existing prompt remains visible while the backend asks for another code.
          } else if (msg.type === "password_required") {
            setTotpRequired(true);
            setTotpPrompt(msg.prompt || t("common.password"));
            setIsPasswordPrompt(true);
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            if (totpTimeoutRef.current) {
              clearTimeout(totpTimeoutRef.current);
            }
            totpTimeoutRef.current = setTimeout(() => {
              setTotpRequired(false);
              if (webSocketRef.current) {
                webSocketRef.current.close();
              }
            }, 180000);
          } else if (msg.type === "warpgate_auth_required") {
            setWarpgateAuthRequired(true);
            setWarpgateAuthUrl(msg.url || "");
            setWarpgateSecurityKey(msg.securityKey || "N/A");
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            if (warpgateTimeoutRef.current) {
              clearTimeout(warpgateTimeoutRef.current);
            }
            warpgateTimeoutRef.current = setTimeout(() => {
              setWarpgateAuthRequired(false);
              if (webSocketRef.current) {
                webSocketRef.current.close();
              }
            }, 300000);
          } else if (msg.type === "opkssh_auth_required") {
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            if (opksshFailedRef.current) {
              setOpksshDialog(null);
              if (opksshTimeoutRef.current) {
                clearTimeout(opksshTimeoutRef.current);
                opksshTimeoutRef.current = null;
              }
              updateConnectionError(t("terminal.opksshAuthFailed"));
              addLog({
                type: "error",
                stage: "auth",
                message: t("terminal.opksshAuthFailed"),
              });
            } else {
              opksshFailedRef.current = true;
              if (webSocketRef.current) {
                webSocketRef.current.send(
                  JSON.stringify({
                    type: "opkssh_start_auth",
                    data: { hostId: msg.hostId },
                  }),
                );
              }
            }
          } else if (msg.type === "opkssh_status") {
            if (connectionErrorRef.current) return;
            if (msg.stage === "chooser") {
              setOpksshDialog({
                isOpen: true,
                authUrl: msg.url || "",
                requestId: msg.requestId || "",
                stage: "chooser",
                providers: msg.providers,
              });
              if (opksshTimeoutRef.current) {
                clearTimeout(opksshTimeoutRef.current);
              }
              opksshTimeoutRef.current = setTimeout(() => {
                setOpksshDialog(null);
                if (webSocketRef.current) {
                  webSocketRef.current.close();
                }
              }, 300000);
            } else {
              setOpksshDialog((prev) =>
                prev ? { ...prev, stage: msg.stage } : null,
              );
            }
          } else if (msg.type === "opkssh_completed") {
            if (opksshTimeoutRef.current) {
              clearTimeout(opksshTimeoutRef.current);
              opksshTimeoutRef.current = null;
            }
            setOpksshDialog(null);
            if (webSocketRef.current && terminal) {
              webSocketRef.current.send(
                JSON.stringify({
                  type: "opkssh_auth_completed",
                  data: {
                    hostId: currentHostIdRef.current,
                    cols: terminal.cols || 80,
                    rows: terminal.rows || 24,
                    hostConfig: currentHostConfigRef.current,
                  },
                }),
              );
            }
          } else if (msg.type === "opkssh_error") {
            if (connectionErrorRef.current) return;
            opksshFailedRef.current = true;
            if (opksshDialog) {
              setOpksshDialog((prev) =>
                prev ? { ...prev, stage: "error", error: msg.error } : null,
              );
            } else {
              setOpksshDialog({
                isOpen: true,
                authUrl: "",
                requestId: msg.requestId || "",
                stage: "error",
                error: msg.error,
              });
            }
            setIsConnecting(false);
          } else if (msg.type === "opkssh_timeout") {
            if (connectionErrorRef.current) return;
            opksshFailedRef.current = true;
            if (opksshDialog) {
              setOpksshDialog((prev) =>
                prev
                  ? {
                      ...prev,
                      stage: "error",
                      error: t("terminal.opksshTimeout"),
                    }
                  : null,
              );
            } else {
              setOpksshDialog({
                isOpen: true,
                authUrl: "",
                requestId: msg.requestId || "",
                stage: "error",
                error: t("terminal.opksshTimeout"),
              });
            }
            setIsConnecting(false);
          } else if (msg.type === "opkssh_config_error") {
            setOpksshDialog({
              isOpen: true,
              authUrl: "",
              requestId: msg.requestId || "",
              stage: "error",
              error: msg.instructions || msg.error,
            });
          } else if (msg.type === "keyboard_interactive_available") {
            setKeyboardInteractiveDetected(true);
            setIsConnecting(false);
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
          } else if (msg.type === "auth_method_not_available") {
            setAuthDialogReason("no_keyboard");
            setShowAuthDialog(true);
            setIsConnecting(false);
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
          } else if (msg.type === "cwd") {
            onOpenFileManager?.(msg.path as string);
          } else if (msg.type === "passphrase_required") {
            setShowPassphraseDialog(true);
            setIsConnecting(false);
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
          } else if (msg.type === "host_key_verification_required") {
            setHostKeyVerification({
              isOpen: true,
              scenario: "new",
              data: msg.data,
            });
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
          } else if (msg.type === "host_key_changed") {
            setHostKeyVerification({
              isOpen: true,
              scenario: "changed",
              data: msg.data,
            });
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
          } else if (msg.type === "sessionCreated") {
            sessionIdRef.current = msg.sessionId;
            if (hostConfig.instanceId) {
              import("@/main-axios").then(({ patchOpenTab }) => {
                patchOpenTab(hostConfig.instanceId!, {
                  backendSessionId: msg.sessionId,
                }).catch(() => {});
              });
            }
          } else if (msg.type === "sessionAttached") {
            isAttachingSessionRef.current = false;
            opksshFailedRef.current = false;
            wasConnectedRef.current = true;
            setIsConnected(true);
            setIsConnecting(false);
            isConnectingRef.current = false;
            shouldNotReconnectRef.current = false;
            updateConnectionError(null);
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
            reconnectAttempts.current = 0;
            isReconnectingRef.current = false;

            logTerminalActivity();
            requestSystemdUnitsRefresh("connected");

            addLog({
              type: "success",
              stage: "connection",
              message: t("terminal.reconnected"),
            });
          } else if (msg.type === "sessionExpired") {
            isAttachingSessionRef.current = false;
            sessionIdRef.current = null;
            wasSessionExpiredRef.current = true;
            if (hostConfig.instanceId) {
              import("@/main-axios").then(({ patchOpenTab }) => {
                patchOpenTab(hostConfig.instanceId!, {
                  backendSessionId: null,
                }).catch(() => {});
              });
            }
            if (webSocketRef.current) {
              webSocketRef.current.close();
            }
          } else if (msg.type === "sessionTakenOver") {
            sessionIdRef.current = null;

            if (terminal) {
              terminal.clear();
            }
            setIsConnected(false);
            setIsConnecting(true);

            addLog({
              type: "warning",
              stage: "connection",
              message: t("terminal.sessionTakenOver"),
            });

            const cols = terminal?.cols || 80;
            const rows = terminal?.rows || 24;
            connectToHost(cols, rows);
          } else if (msg.type === "tmux_sessions_available") {
            setTmuxSessionPicker({
              sessions: msg.sessions,
            });
          } else if (
            msg.type === "tmux_session_created" ||
            msg.type === "tmux_session_attached"
          ) {
            const sessionName =
              typeof msg.sessionName === "string" ? msg.sessionName : "";
            tmuxSessionNameRef.current = sessionName || "(active)";
            setIsTmuxAttached(true);
            addLog({
              type: "info",
              stage: "connection",
              message:
                msg.type === "tmux_session_created"
                  ? t("terminal.tmuxSessionCreated", {
                      name: sessionName || "new",
                    })
                  : t("terminal.tmuxSessionAttached", {
                      name: sessionName,
                    }),
            });
          } else if (msg.type === "tmux_unavailable") {
            setTimeout(() => {
              toast.warning(t("terminal.tmuxUnavailable"), {
                duration: 8000,
              });
            }, 500);
            addLog({
              type: "warning",
              stage: "connection",
              message: t("terminal.tmuxUnavailable"),
            });
          } else if (msg.type === "tmux_detached") {
            tmuxSessionNameRef.current = null;
            setIsTmuxAttached(false);
            toast.info(t("terminal.tmuxDetached"), { duration: 3000 });
          } else if (msg.type === "connection_log") {
            if (msg.data) {
              addLog({
                type: msg.data.level || "info",
                stage: msg.data.stage || "auth",
                message: msg.data.message,
                details: msg.data.details,
              });
            }
          }
        } catch (error) {
          console.error("WebSocket message handler error:", error);
        }
      });

      const currentAttemptId = connectionAttemptIdRef.current;

      ws.addEventListener("close", (event) => {
        if (currentAttemptId !== connectionAttemptIdRef.current) {
          return;
        }

        setIsConnected(false);
        isConnectingRef.current = false;

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (pongTimeoutRef.current) {
          clearTimeout(pongTimeoutRef.current);
          pongTimeoutRef.current = null;
        }

        if (totpTimeoutRef.current) {
          clearTimeout(totpTimeoutRef.current);
          totpTimeoutRef.current = null;
        }

        if (wasSessionExpiredRef.current) {
          wasSessionExpiredRef.current = false;
          const cols = terminal?.cols || 80;
          const rows = terminal?.rows || 24;
          connectToHost(cols, rows);
          return;
        }

        if (event.code === 1006) {
          console.warn(
            "[WebSocket] Abnormal closure detected - attempting reconnection",
          );
          addLog({
            type: "warning",
            stage: "connection",
            message: t("terminal.websocketAbnormalClose"),
          });

          if (wasConnectedRef.current) {
            attemptReconnection();
          } else {
            updateConnectionError(t("terminal.websocketAbnormalClose"));
            setIsConnecting(false);
          }
          return;
        }

        if (event.code === 1008) {
          console.error("WebSocket authentication failed:", event.reason);
          addLog({
            type: "error",
            stage: "auth",
            message: "Authentication failed - please re-login",
          });
          updateConnectionError("Authentication failed - please re-login");
          setIsConnecting(false);
          shouldNotReconnectRef.current = true;

          return;
        }

        if (
          !wasConnectedRef.current &&
          !isAttachingSessionRef.current &&
          event.wasClean &&
          (event.code === 1005 || event.code === 1000)
        ) {
          console.error("[WebSocket] Connection rejected by server");
          addLog({
            type: "error",
            stage: "connection",
            message: t("terminal.connectionRejected"),
          });
          updateConnectionError(t("terminal.connectionRejected"));
          setIsConnecting(false);
          shouldNotReconnectRef.current = true;
          return;
        }

        const shouldAttemptReconnection =
          !wasDisconnectedBySSH.current &&
          !isUnmountingRef.current &&
          !shouldNotReconnectRef.current &&
          !isConnectingRef.current;

        if (shouldAttemptReconnection) {
          wasDisconnectedBySSH.current = false;
          attemptReconnection();
        } else {
          setIsConnecting(false);
        }
      });

      ws.addEventListener("error", (event) => {
        if (currentAttemptId !== connectionAttemptIdRef.current) {
          return;
        }

        console.error("[WebSocket] Error:", event);

        setIsConnected(false);
        isConnectingRef.current = false;
        updateConnectionError(t("terminal.websocketError"));
        if (terminal) {
          terminal.clear();
        }
        setIsConnecting(false);

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (totpTimeoutRef.current) {
          clearTimeout(totpTimeoutRef.current);
          totpTimeoutRef.current = null;
        }
      });
    }

    async function writeTextToClipboard(text: string): Promise<boolean> {
      try {
        if (window.electronClipboard) {
          await window.electronClipboard.writeText(text);
          return true;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {
        // fall through to legacy method
      }
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        return true;
      } catch {
        toast.error(t("terminal.clipboardWriteFailed"));
        return false;
      }
    }

    async function readTextFromClipboard(): Promise<string> {
      try {
        if (window.electronClipboard) {
          return window.electronClipboard.readText();
        }
        if (navigator.clipboard && navigator.clipboard.readText) {
          return await navigator.clipboard.readText();
        }
      } catch {
        // fall through
      }
      if (window.location.protocol !== "https:" && !isElectron()) {
        toast.error(t("terminal.clipboardHttpWarning"));
      }
      return "";
    }

    const handleSelectCommand = useCallback(
      (command: string) => {
        if (!terminal || !webSocketRef.current) return;

        for (const char of command) {
          sendTerminalInput(char);
        }

        setTimeout(() => {
          terminal.focus();
        }, 100);
      },
      [sendTerminalInput, terminal],
    );

    useEffect(() => {
      commandHistoryContext.setOnSelectCommand(handleSelectCommand);
    }, [handleSelectCommand]);

    const handleAutocompleteSelect = useCallback(
      (selectedCommand: string) => {
        applyAutocompleteSelection(selectedCommand);
      },
      [applyAutocompleteSelection],
    );

    const handleDeleteCommand = useCallback(
      async (command: string) => {
        if (!hostConfig.id) return;

        try {
          await deleteCommandFromHistory(hostConfig.id, command);

          setCommandHistory((prev) => {
            const newHistory = prev.filter((cmd) => cmd !== command);
            setCommandHistoryContextRef.current(newHistory);
            return newHistory;
          });

          const nextAutocompleteHistory = autocompleteHistory.current.filter(
            (cmd) => cmd !== command,
          );
          if (
            !areStringArraysEqual(
              autocompleteHistory.current,
              nextAutocompleteHistory,
            )
          ) {
            autocompleteHistory.current = nextAutocompleteHistory;
            autocompleteHistoryVersionRef.current += 1;
            autocompleteMatchCacheRef.current = null;
          }
        } catch (error) {
          console.error("Failed to delete command from history:", error);
        }
      },
      [hostConfig.id],
    );

    useEffect(() => {
      commandHistoryContext.setOnDeleteCommand(handleDeleteCommand);
    }, [handleDeleteCommand]);

    // Separate theme and options updates to avoid terminal re-initialization flashes
    useEffect(() => {
      if (!terminal) return;

      const config = {
        ...DEFAULT_TERMINAL_CONFIG,
        ...hostConfig.terminalConfig,
      };

      const activeTheme = previewTheme || config.theme;
      const themeColors = resolveTermixThemeColors(activeTheme, appTheme);

      const fontConfig = TERMINAL_FONTS.find(
        (f) => f.value === config.fontFamily,
      );
      const fontFamily = fontConfig?.fallback || TERMINAL_FONTS[0].fallback;

      // Update terminal options individually to avoid re-initialization flashes
      terminal.options.cursorBlink = config.cursorBlink;
      terminal.options.cursorStyle = config.cursorStyle;
      terminal.options.scrollback = config.scrollback;
      terminal.options.fontSize = config.fontSize;
      terminal.options.fontFamily = fontFamily;
      terminal.options.rightClickSelectsWord = config.rightClickSelectsWord;
      terminal.options.fastScrollSensitivity = config.fastScrollSensitivity;
      terminal.options.minimumContrastRatio = config.minimumContrastRatio;
      terminal.options.letterSpacing = config.letterSpacing;
      terminal.options.lineHeight = config.lineHeight;
      terminal.options.bellStyle = config.bellStyle as
        | "none"
        | "sound"
        | "visual"
        | "both";

      terminal.options.theme = {
        background: themeColors.background,
        foreground: themeColors.foreground,
        cursor: themeColors.cursor,
        cursorAccent: themeColors.cursorAccent,
        selectionBackground: themeColors.selectionBackground,
        selectionForeground: themeColors.selectionForeground,
        black: themeColors.black,
        red: themeColors.red,
        green: themeColors.green,
        yellow: themeColors.yellow,
        blue: themeColors.blue,
        magenta: themeColors.magenta,
        cyan: themeColors.cyan,
        white: themeColors.white,
        brightBlack: themeColors.brightBlack,
        brightRed: themeColors.brightRed,
        brightGreen: themeColors.brightGreen,
        brightYellow: themeColors.brightYellow,
        brightBlue: themeColors.brightBlue,
        brightMagenta: themeColors.brightMagenta,
        brightCyan: themeColors.brightCyan,
        brightWhite: themeColors.brightWhite,
      };

      // Ensure terminal is correctly fitted if font-related options change
      if (fitAddonRef.current && isFitted) {
        performFit();
      }

      // Refresh terminal to apply new theme colors to existing buffer content
      hardRefresh();
    }, [terminal, hostConfig.terminalConfig, previewTheme, appTheme, isFitted]);

    useEffect(() => {
      if (!terminal || !xtermRef.current) return;

      const config = {
        ...DEFAULT_TERMINAL_CONFIG,
        ...hostConfig.terminalConfig,
      };

      const fontConfig = TERMINAL_FONTS.find(
        (f) => f.value === config.fontFamily,
      );
      const fontFamily = fontConfig?.fallback || TERMINAL_FONTS[0].fallback;

      const activeTheme = previewTheme || config.theme;
      const themeColors = resolveTermixThemeColors(activeTheme, appTheme);

      // Set initial options before opening the terminal
      terminal.options = {
        cursorBlink: config.cursorBlink,
        cursorStyle: config.cursorStyle,
        scrollback: config.scrollback,
        fontSize: config.fontSize,
        fontFamily,
        allowTransparency: true, // MUST be set before open()
        convertEol: false,
        macOptionIsMeta: false,
        macOptionClickForcesSelection: false,
        rightClickSelectsWord: config.rightClickSelectsWord,
        fastScrollSensitivity: config.fastScrollSensitivity,
        allowProposedApi: true,
        minimumContrastRatio: config.minimumContrastRatio,
        letterSpacing: config.letterSpacing,
        lineHeight: config.lineHeight,
        bellStyle: config.bellStyle as "none" | "sound" | "visual" | "both",
        theme: {
          background: themeColors.background,
          foreground: themeColors.foreground,
          cursor: themeColors.cursor,
          cursorAccent: themeColors.cursorAccent,
          selectionBackground: themeColors.selectionBackground,
          selectionForeground: themeColors.selectionForeground,
          black: themeColors.black,
          red: themeColors.red,
          green: themeColors.green,
          yellow: themeColors.yellow,
          blue: themeColors.blue,
          magenta: themeColors.magenta,
          cyan: themeColors.cyan,
          white: themeColors.white,
          brightBlack: themeColors.brightBlack,
          brightRed: themeColors.brightRed,
          brightGreen: themeColors.brightGreen,
          brightYellow: themeColors.brightYellow,
          brightBlue: themeColors.brightBlue,
          brightMagenta: themeColors.brightMagenta,
          brightCyan: themeColors.brightCyan,
          brightWhite: themeColors.brightWhite,
        },
      };

      const fitAddon = new FitAddon();
      const clipboardProvider = new RobustClipboardProvider();
      const clipboardAddon = new ClipboardAddon(undefined, clipboardProvider);
      const unicode11Addon = new Unicode11Addon();
      const webLinksAddon = new WebLinksAddon((_event, uri) => {
        const url =
          uri.startsWith("http://") || uri.startsWith("https://")
            ? uri
            : `https://${uri}`;
        window.open(url, "_blank");
      });

      fitAddonRef.current = fitAddon;
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(clipboardAddon);
      terminal.loadAddon(unicode11Addon);
      terminal.loadAddon(webLinksAddon);

      terminal.unicode.activeVersion = "11";

      terminal.open(xtermRef.current);
      document.fonts.ready.then(() => {
        terminal.refresh(0, terminal.rows - 1);
        fitAddon.fit();
      });

      terminal.attachCustomWheelEventHandler((ev) => {
        const cfg = {
          ...DEFAULT_TERMINAL_CONFIG,
          ...hostConfig.terminalConfig,
        };
        const mod = cfg.fastScrollModifier;
        const modHeld =
          (mod === "alt" && ev.altKey) ||
          (mod === "ctrl" && ev.ctrlKey) ||
          (mod === "shift" && ev.shiftKey);
        if (modHeld) {
          const lines = Math.round(
            (Math.abs(ev.deltaY) / 100) * (cfg.fastScrollSensitivity ?? 5),
          );
          terminal.scrollLines(ev.deltaY > 0 ? lines : -lines);
          return false;
        }
        return true;
      });

      fitAddonRef.current?.fit();
      // Double-rAF ensures layout is fully settled (fonts, flexbox, etc.) before
      // committing the fitted size, preventing the "terminal too short" glitch.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fitAddonRef.current?.fit();
          setIsFitted(true);
        });
      });

      const element = xtermRef.current;
      const handleContextMenu = (e: MouseEvent) => {
        if (e.ctrlKey && onOpenFileManager) {
          e.preventDefault();
          e.stopPropagation();
          onOpenFileManager();
          return;
        }

        if (getUseRightClickCopyPaste()) {
          e.preventDefault();
          e.stopPropagation();
          if (terminal.hasSelection()) {
            const text = terminal.getSelection();
            writeTextToClipboard(text).then(() => terminal.clearSelection());
          } else {
            readTextFromClipboard().then((text) => {
              if (text) terminal.paste(text);
            });
          }
          return;
        }
      };
      element?.addEventListener("contextmenu", handleContextMenu);

      const handlePaste = (e: ClipboardEvent) => {
        const text = e.clipboardData?.getData("text");
        if (text) {
          e.preventDefault();
          e.stopPropagation();
          terminal.paste(text);
        }
      };
      element?.addEventListener("paste", handlePaste);

      let tmuxDragTracking = false;
      const handleTmuxDragStart = (e: MouseEvent) => {
        if (e.button !== 0) return;
        if (!tmuxSessionNameRef.current) return;
        tmuxDragTracking = true;
      };
      const handleTmuxDragMove = () => {
        if (!tmuxDragTracking) return;
        tmuxDragTracking = false;
        if (tmuxCopyModeHintShownRef.current) return;
        tmuxCopyModeHintShownRef.current = true;
        toast.info(t("terminal.tmuxCopyHint"), { duration: 5000 });
      };
      const handleTmuxDragEnd = () => {
        tmuxDragTracking = false;
      };
      element?.addEventListener("mousedown", handleTmuxDragStart);
      element?.addEventListener("mousemove", handleTmuxDragMove);
      element?.addEventListener("mouseup", handleTmuxDragEnd);

      const handleBackspaceMode = (e: KeyboardEvent) => {
        if (e.key !== "Backspace") return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const config = {
          ...DEFAULT_TERMINAL_CONFIG,
          ...hostConfig.terminalConfig,
        };
        if (config.backspaceMode !== "control-h") return;

        e.preventDefault();
        e.stopPropagation();

        if (webSocketRef.current?.readyState === 1) {
          trackInputRef.current("\x08");
          webSocketRef.current.send(
            JSON.stringify({ type: "input", data: "\x08" }),
          );
        }
        return false;
      };

      element?.addEventListener("keydown", handleBackspaceMode, true);

      const resizeObserver = new ResizeObserver(() => {
        if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
        resizeTimeout.current = setTimeout(() => {
          if (isVisible) {
            performFit();
          }
        }, 50);
      });

      const observeTarget = xtermRef.current.parentElement ?? xtermRef.current;
      resizeObserver.observe(observeTarget);

      return () => {
        isFittingRef.current = false;
        resizeObserver.disconnect();
        clipboardProvider.dispose();
        element?.removeEventListener("contextmenu", handleContextMenu);
        element?.removeEventListener("paste", handlePaste);
        element?.removeEventListener("mousedown", handleTmuxDragStart);
        element?.removeEventListener("mousemove", handleTmuxDragMove);
        element?.removeEventListener("mouseup", handleTmuxDragEnd);
        element?.removeEventListener("keydown", handleBackspaceMode, true);
        if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current);
        if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
      };
    }, [xtermRef, terminal]);

    const isMountedRef = useRef(false);

    useEffect(() => {
      isMountedRef.current = true;

      const currentHostId = hostConfig.id;
      return () => {
        if (!isMountedRef.current) {
          return;
        }

        if (
          currentHostIdRef.current !== currentHostId &&
          currentHostIdRef.current !== null
        ) {
          isUnmountingRef.current = true;
          shouldNotReconnectRef.current = true;
          isReconnectingRef.current = false;
          setIsConnecting(false);
          if (reconnectTimeoutRef.current)
            clearTimeout(reconnectTimeoutRef.current);
          if (connectionTimeoutRef.current)
            clearTimeout(connectionTimeoutRef.current);
          if (totpTimeoutRef.current) clearTimeout(totpTimeoutRef.current);
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
          if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current);
            pongTimeoutRef.current = null;
          }

          if (webSocketRef.current) {
            webSocketRef.current.close();
          }

          isMountedRef.current = false;
        }
      };
    }, [hostConfig.id, hostConfig.instanceId]);

    useEffect(() => {
      if (!terminal) return;

      const handleCustomKey = (e: KeyboardEvent): boolean => {
        if (e.type !== "keydown") {
          return true;
        }

        const isPlainArrowHistoryKey =
          (e.key === "ArrowUp" || e.key === "ArrowDown") &&
          !e.ctrlKey &&
          !e.altKey &&
          !e.metaKey &&
          !e.shiftKey;
        const isPlainTypingKey =
          !e.ctrlKey &&
          !e.altKey &&
          !e.metaKey &&
          (e.key.length === 1 ||
            e.key === "Backspace" ||
            e.key === "Delete");

        if (
          e.ctrlKey &&
          !e.shiftKey &&
          !e.altKey &&
          !e.metaKey &&
          e.key.toLowerCase() === "c" &&
          terminal.hasSelection()
        ) {
          const selection = terminal.getSelection();
          if (selection) {
            e.preventDefault();
            e.stopPropagation();
            writeTextToClipboard(selection);
            terminal.clearSelection();
            return false;
          }
        }

        if (
          ((e.metaKey && !e.shiftKey && !e.ctrlKey && !e.altKey) ||
            (e.ctrlKey &&
              !e.shiftKey &&
              !e.altKey &&
              !e.metaKey &&
              e.key === "Insert")) &&
          (e.key.toLowerCase() === "c" || e.key === "Insert")
        ) {
          const selection = terminal.getSelection();
          if (selection) {
            e.preventDefault();
            e.stopPropagation();
            writeTextToClipboard(selection);
            return false;
          }
        }

        if (
          e.ctrlKey &&
          !e.shiftKey &&
          !e.altKey &&
          !e.metaKey &&
          e.key.toLowerCase() === "v"
        ) {
          // Let the browser handle Ctrl+V natively, the paste event
          // listener will intercept the result without triggering the
          // clipboard permission popup
          return false;
        }

        if (e.ctrlKey && e.altKey && !e.metaKey && !e.shiftKey) {
          const key = e.key.toLowerCase();
          const blockedKeys = ["w", "t", "n", "q"];
          if (blockedKeys.includes(key)) {
            e.preventDefault();
            e.stopPropagation();
            const ctrlCode = key.charCodeAt(0) - 96;
            if (webSocketRef.current?.readyState === 1) {
              webSocketRef.current.send(
                JSON.stringify({
                  type: "input",
                  data: String.fromCharCode(ctrlCode),
                }),
              );
            }
            return false;
          }
        }

        if (showAutocompleteRef.current) {
          const action = getCommandAutocompletePopupKeyAction(e, {
            inputMode: autocompleteInputModeRef.current,
            selectedIndex: autocompleteSelectedIndexRef.current,
            selectionActive: autocompleteSelectionActiveRef.current,
            suggestionCount: autocompleteSuggestionsRef.current.length,
          });

          if (action.type === "close") {
            e.preventDefault();
            e.stopPropagation();
            closeAutocomplete();
            return false;
          }

          if (action.type === "move") {
            e.preventDefault();
            e.stopPropagation();
            autocompleteInputModeRef.current = "completion";
            autocompleteSelectionActiveRef.current = true;
            setAutocompleteSelectionActive(true);
            setAutocompleteSelectedIndex(action.selectedIndex);
            return false;
          }

          if (action.type === "accept") {
            e.preventDefault();
            e.stopPropagation();
            const selectedCommand =
              autocompleteSuggestionsRef.current[action.selectedIndex];

            if (selectedCommand) {
              applyAutocompleteSelection(selectedCommand);
            } else {
              closeAutocomplete();
            }
            return false;
          }

          if (action.type === "deactivate-and-pass-through") {
            autocompleteInputModeRef.current = "typing";
            autocompleteSelectionActiveRef.current = false;
            setAutocompleteSelectionActive(false);
            return true;
          }

          if (action.type === "close-and-pass-through") {
            closeAutocomplete();
            if (isPlainArrowHistoryKey) {
              autocompleteInputModeRef.current = "history";
            } else if (isPlainTypingKey) {
              autocompleteInputModeRef.current = "typing";
            }
            return true;
          }

          return true;
        }

        if (autocompleteHintRef.current) {
          const action = getCommandAutocompleteGhostKeyAction(e, {
            cursorAtEnd: isCursorAtEndRef.current(),
            suggestionCount: autocompleteSuggestionsRef.current.length,
          });

          if (action.type === "close") {
            e.preventDefault();
            e.stopPropagation();
            closeAutocomplete();
            return false;
          }

          if (action.type === "accept") {
            const selectedCommand =
              autocompleteSuggestionsRef.current[action.selectedIndex];

            if (selectedCommand) {
              e.preventDefault();
              e.stopPropagation();
              applyAutocompleteSelection(selectedCommand);
              return false;
            }
          }

          if (
            e.key === "ArrowDown" &&
            !e.ctrlKey &&
            !e.altKey &&
            !e.metaKey &&
            !e.shiftKey &&
            autocompleteSettingsRef.current.popup &&
            openAutocompletePopupForCurrentCommand()
          ) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }

        if (
          ((e.key === " " &&
            e.ctrlKey &&
            !e.altKey &&
            !e.metaKey &&
            !e.shiftKey) ||
            (e.key === "ArrowDown" &&
              e.altKey &&
              !e.ctrlKey &&
              !e.metaKey &&
              !e.shiftKey)) &&
          autocompleteSettingsRef.current.popup &&
          openAutocompletePopupForCurrentCommand()
        ) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        if (
          e.key === "Tab" &&
          e.shiftKey &&
          !e.ctrlKey &&
          !e.altKey &&
          !e.metaKey
        ) {
          e.preventDefault();
          e.stopPropagation();
          if (webSocketRef.current?.readyState === 1) {
            webSocketRef.current.send(
              JSON.stringify({ type: "input", data: "\x1b[Z" }),
            );
          }
          return false;
        }

        if (
          e.key === "Tab" &&
          !e.ctrlKey &&
          !e.altKey &&
          !e.metaKey &&
          !e.shiftKey
        ) {
          e.preventDefault();
          e.stopPropagation();

          sendTabToShell();
          return false;
        }

        if (isPlainArrowHistoryKey) {
          autocompleteInputModeRef.current = "history";
        } else if (isPlainTypingKey) {
          autocompleteInputModeRef.current = "typing";
        } else if (
          e.key === "Enter" ||
          (e.ctrlKey &&
            !e.shiftKey &&
            !e.altKey &&
            !e.metaKey &&
            ["c", "d"].includes(e.key.toLowerCase()))
        ) {
          autocompleteInputModeRef.current = "idle";
        }

        return true;
      };

      terminal.attachCustomKeyEventHandler(handleCustomKey);
    }, [
      terminal,
      applyAutocompleteSelection,
      closeAutocomplete,
      openAutocompletePopupForCurrentCommand,
      sendTabToShell,
    ]);

    useEffect(() => {
      if (!terminal || !hostConfig || !isVisible) return;
      if (isConnected || isConnecting) return;

      if (isReconnectingRef.current || reconnectTimeoutRef.current !== null) {
        return;
      }

      if (shouldNotReconnectRef.current) {
        return;
      }

      if (
        webSocketRef.current &&
        (webSocketRef.current.readyState === WebSocket.OPEN ||
          webSocketRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      setIsConnecting(true);
      fitAddonRef.current?.fit();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fitAddonRef.current?.fit();
          if (terminal.cols > 0 && terminal.rows > 0) {
            scheduleNotify(terminal.cols, terminal.rows);
            connectToHost(terminal.cols, terminal.rows);
          }
        });
      });
    }, [terminal, hostConfig.id, isVisible, isConnected, isConnecting]);

    useEffect(() => {
      if (!terminal || !fitAddonRef.current) return;

      if (!isVisible) {
        lastFittedSizeRef.current = null;
        lastSentSizeRef.current = null;
        return;
      }

      const fitTimeoutId = setTimeout(() => {
        if (!isFittingRef.current && terminal.cols > 0 && terminal.rows > 0) {
          performFit();
          if (!splitScreen && !isConnecting) {
            requestAnimationFrame(() => terminal.focus());
          }
        }
      }, 50);

      return () => clearTimeout(fitTimeoutId);
    }, [terminal, isVisible, splitScreen, isConnecting]);

    const hasConnectionError = !!connectionError;

    return (
      <div className="h-full w-full relative" style={{ backgroundColor }}>
        <div
          ref={xtermRef}
          className="h-full w-full"
          style={{
            pointerEvents: isVisible ? "auto" : "none",
            visibility:
              isConnected && isFitted && !connectionError
                ? "visible"
                : "hidden",
          }}
          onClick={() => {
            if (terminal && !splitScreen) {
              terminal.focus();
            }
          }}
        />

        {isTmuxAttached && isConnected && (
          <button
            onClick={() => {
              if (webSocketRef.current?.readyState === WebSocket.OPEN) {
                webSocketRef.current.send(
                  JSON.stringify({ type: "tmux_detach" }),
                );
              }
            }}
            title={t("terminal.tmuxDetach")}
            className="absolute top-2 right-2 z-[110] px-2 py-1 text-xs rounded bg-black/60 text-white/70 hover:text-white hover:bg-black/80 transition-colors"
          >
            tmux:detach
          </button>
        )}

        <SimpleLoader
          visible={isConnecting && !isConnectionLogExpanded}
          message={t("terminal.connecting")}
          backgroundColor={backgroundColor}
        />

        {showDisconnectedOverlay && !isConnecting && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-[120]"
            style={{ backgroundColor }}
          >
            <p className="text-sm text-muted-foreground">
              {t("terminal.connectionLost")}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowDisconnectedOverlay(false);
                  isUnmountingRef.current = false;
                  shouldNotReconnectRef.current = false;
                  isReconnectingRef.current = false;
                  isConnectingRef.current = false;
                  reconnectAttempts.current = 0;
                  wasDisconnectedBySSH.current = false;
                  wasConnectedRef.current = false;
                  updateConnectionError(null);
                  if (terminal) {
                    terminal.clear();
                    connectToHost(terminal.cols, terminal.rows);
                  }
                }}
              >
                {t("terminal.reconnect")}
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  {t("terminal.closeTab")}
                </Button>
              )}
            </div>
          </div>
        )}

        <ConnectionLog
          isConnecting={isConnecting}
          isConnected={isConnected}
          hasConnectionError={hasConnectionError && !showDisconnectedOverlay}
          position={hasConnectionError ? "top" : "bottom"}
        />

        <TOTPDialog
          isOpen={totpRequired}
          prompt={totpPrompt}
          onSubmit={handleTotpSubmit}
          onCancel={handleTotpCancel}
          backgroundColor={backgroundColor}
        />

        <SSHAuthDialog
          isOpen={showAuthDialog}
          reason={authDialogReason}
          onSubmit={handleAuthDialogSubmit}
          onCancel={handleAuthDialogCancel}
          hostInfo={{
            ip: hostConfig.ip,
            port: hostConfig.port,
            username: hostConfig.username,
            name: hostConfig.name,
          }}
          backgroundColor={backgroundColor}
        />

        <PassphraseDialog
          isOpen={showPassphraseDialog}
          onSubmit={handlePassphraseSubmit}
          onCancel={handlePassphraseCancel}
          hostInfo={{
            ip: hostConfig.ip,
            port: hostConfig.port,
            username: hostConfig.username,
            name: hostConfig.name,
          }}
          backgroundColor={backgroundColor}
        />

        <WarpgateDialog
          isOpen={warpgateAuthRequired}
          url={warpgateAuthUrl}
          securityKey={warpgateSecurityKey}
          onContinue={handleWarpgateContinue}
          onCancel={handleWarpgateCancel}
          onOpenUrl={handleWarpgateOpenUrl}
          backgroundColor={backgroundColor}
        />

        {opksshDialog?.isOpen && (
          <OPKSSHDialog
            isOpen={opksshDialog.isOpen}
            authUrl={opksshDialog.authUrl}
            requestId={opksshDialog.requestId}
            stage={opksshDialog.stage}
            error={opksshDialog.error}
            providers={opksshDialog.providers}
            onCancel={() => {
              if (webSocketRef.current) {
                webSocketRef.current.send(
                  JSON.stringify({
                    type: "opkssh_cancel",
                    data: { requestId: opksshDialog.requestId },
                  }),
                );
              }
              setOpksshDialog(null);
              if (opksshTimeoutRef.current) {
                clearTimeout(opksshTimeoutRef.current);
                opksshTimeoutRef.current = null;
              }
            }}
            onOpenUrl={() => {
              window.open(opksshDialog.authUrl, "_blank");
              if (webSocketRef.current) {
                webSocketRef.current.send(
                  JSON.stringify({
                    type: "opkssh_browser_opened",
                    data: { requestId: opksshDialog.requestId },
                  }),
                );
              }
            }}
            onSelectProvider={(alias) => {
              if (!opksshDialog.authUrl) return;
              const selectUrl = `${opksshDialog.authUrl}/select?op=${encodeURIComponent(alias)}`;
              window.open(selectUrl, "_blank");
              if (webSocketRef.current) {
                webSocketRef.current.send(
                  JSON.stringify({
                    type: "opkssh_browser_opened",
                    data: { requestId: opksshDialog.requestId },
                  }),
                );
              }
              setOpksshDialog((prev) =>
                prev ? { ...prev, stage: "waiting" } : null,
              );
            }}
            backgroundColor={backgroundColor}
          />
        )}

        {hostKeyVerification?.isOpen && (
          <HostKeyVerificationDialog
            isOpen={true}
            scenario={hostKeyVerification.scenario}
            {...hostKeyVerification.data}
            onAccept={() => {
              if (webSocketRef.current) {
                webSocketRef.current.send(
                  JSON.stringify({
                    type: "host_key_verification_response",
                    data: { action: "accept" },
                  }),
                );
              }
              setHostKeyVerification(null);
            }}
            onReject={() => {
              if (webSocketRef.current) {
                webSocketRef.current.send(
                  JSON.stringify({
                    type: "host_key_verification_response",
                    data: { action: "reject" },
                  }),
                );
              }
              setHostKeyVerification(null);
              setIsConnecting(false);
              updateConnectionError(t("terminal.hostKeyRejected"));
            }}
            backgroundColor={backgroundColor}
          />
        )}

        {tmuxSessionPicker && (
          <TmuxSessionPicker
            isOpen={true}
            sessions={tmuxSessionPicker.sessions}
            onSelect={(sessionName) => {
              setTmuxSessionPicker(null);
              if (webSocketRef.current?.readyState === WebSocket.OPEN) {
                webSocketRef.current.send(
                  JSON.stringify({
                    type: "tmux_attach",
                    data: { sessionName },
                  }),
                );
              }
            }}
            onCreateNew={() => {
              setTmuxSessionPicker(null);
              if (webSocketRef.current?.readyState === WebSocket.OPEN) {
                webSocketRef.current.send(
                  JSON.stringify({
                    type: "tmux_attach",
                    data: { sessionName: "" },
                  }),
                );
              }
            }}
            onCancel={() => setTmuxSessionPicker(null)}
            backgroundColor={backgroundColor}
          />
        )}

        <CommandAutocomplete
          visible={showAutocomplete}
          automatic={autocompleteOpenMode === "automatic"}
          currentCommand={currentAutocompleteCommand.current}
          historySuggestions={autocompleteHistory.current}
          suggestions={autocompleteSuggestions}
          suggestionSources={autocompleteSuggestionSources}
          selectionActive={autocompleteSelectionActive}
          selectedIndex={autocompleteSelectedIndex}
          helpEnabled={
            autocompleteSettings.help && autocompleteOpenMode === "manual"
          }
          position={autocompletePosition}
          onSelect={handleAutocompleteSelect}
        />

        <CommandAutocompleteHint
          visible={!showAutocomplete && !!autocompleteHint && terminalFocused}
          completion={autocompleteHint?.completion ?? ""}
          position={autocompleteHint?.position ?? { top: 0, left: 0 }}
          fontFamily={
            typeof terminal?.options.fontFamily === "string"
              ? terminal.options.fontFamily
              : undefined
          }
          fontSize={
            typeof terminal?.options.fontSize === "number"
              ? terminal.options.fontSize
              : undefined
          }
          lineHeightPx={autocompleteHint?.lineHeightPx}
        />
      </div>
    );
  },
);

export const Terminal = forwardRef<TerminalHandle, SSHTerminalProps>(
  function Terminal(props, ref) {
    return (
      <ConnectionLogProvider>
        <TerminalInner {...props} ref={ref} />
      </ConnectionLogProvider>
    );
  },
);
