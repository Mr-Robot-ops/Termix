import { useRef, useCallback } from "react";
import { saveCommandToHistory } from "@/main-axios.ts";
import { isUsefulAutocompleteHistoryCommand } from "@/lib/terminal-autocomplete.ts";

const SENSITIVE_PATTERNS = [
  /\bpassw(or)?d\b/i,
  /\bsecret\b/i,
  /\btoken\b/i,
  /\bapi.?key\b/i,
  /\bPASS(WORD)?=/i,
  /\bAWS_SECRET/i,
  /\bmysql\b.*-p/i,
  /\bsudo\s+-S\b/,
  /\bhtpasswd\b/i,
  /\bsshpass\b/i,
  /\bcurl\b.*-u\s/i,
  /\bexport\b.*(?:PASSWORD|SECRET|TOKEN|KEY)=/i,
];

interface UseCommandTrackerOptions {
  hostId?: number;
  enabled?: boolean;
  persistHistory?: boolean;
  onCommandExecuted?: (command: string) => void;
}

interface CommandTrackerResult {
  trackInput: (data: string) => void;
  getCurrentCommand: () => string;
  isCursorAtEnd: () => boolean;
  clearCurrentCommand: () => void;
  updateCurrentCommand: (command: string) => void;
}

export function useCommandTracker({
  hostId,
  enabled = true,
  persistHistory = enabled,
  onCommandExecuted,
}: UseCommandTrackerOptions): CommandTrackerResult {
  const currentCommandRef = useRef<string>("");
  const cursorPositionRef = useRef<number>(0);
  const escapeSequenceRef = useRef<string>("");

  const clampCursor = useCallback((position: number) => {
    return Math.max(0, Math.min(position, currentCommandRef.current.length));
  }, []);

  const setCurrentCommand = useCallback(
    (command: string, cursorPosition = command.length) => {
      currentCommandRef.current = command;
      cursorPositionRef.current = clampCursor(cursorPosition);
    },
    [clampCursor],
  );

  const insertAtCursor = useCallback((char: string) => {
    const command = currentCommandRef.current;
    const cursor = cursorPositionRef.current;
    currentCommandRef.current =
      command.slice(0, cursor) + char + command.slice(cursor);
    cursorPositionRef.current = cursor + char.length;
  }, []);

  const deleteBeforeCursor = useCallback(() => {
    const command = currentCommandRef.current;
    const cursor = cursorPositionRef.current;
    if (cursor === 0) {
      return;
    }

    currentCommandRef.current =
      command.slice(0, cursor - 1) + command.slice(cursor);
    cursorPositionRef.current = cursor - 1;
  }, []);

  const deleteAtCursor = useCallback(() => {
    const command = currentCommandRef.current;
    const cursor = cursorPositionRef.current;
    if (cursor >= command.length) {
      return;
    }

    currentCommandRef.current =
      command.slice(0, cursor) + command.slice(cursor + 1);
  }, []);

  const handleEscapeSequence = useCallback(
    (sequence: string) => {
      switch (sequence) {
        case "\x1b[D":
          cursorPositionRef.current = clampCursor(
            cursorPositionRef.current - 1,
          );
          break;
        case "\x1b[C":
          cursorPositionRef.current = clampCursor(
            cursorPositionRef.current + 1,
          );
          break;
        case "\x1b[A":
        case "\x1b[B":
          setCurrentCommand("");
          break;
        case "\x1b[H":
        case "\x1b[1~":
        case "\x1bOH":
          cursorPositionRef.current = 0;
          break;
        case "\x1b[F":
        case "\x1b[4~":
        case "\x1bOF":
          cursorPositionRef.current = currentCommandRef.current.length;
          break;
        case "\x1b[3~":
          deleteAtCursor();
          break;
      }
    },
    [clampCursor, deleteAtCursor, setCurrentCommand],
  );

  const trackInput = useCallback(
    (data: string) => {
      if (!enabled) {
        return;
      }

      for (let i = 0; i < data.length; i++) {
        const char = data[i];
        const charCode = char.charCodeAt(0);

        if (charCode === 27) {
          escapeSequenceRef.current = char;
          continue;
        }

        if (escapeSequenceRef.current) {
          escapeSequenceRef.current += char;
          if (
            (charCode >= 65 && charCode <= 90) ||
            (charCode >= 97 && charCode <= 122) ||
            charCode === 126
          ) {
            handleEscapeSequence(escapeSequenceRef.current);
            escapeSequenceRef.current = "";
          }
          continue;
        }

        if (charCode === 13 || charCode === 10) {
          const command = currentCommandRef.current.trim();

          if (
            command.length > 0 &&
            isUsefulAutocompleteHistoryCommand(command)
          ) {
            const isSensitive = SENSITIVE_PATTERNS.some((p) => p.test(command));

            if (persistHistory && hostId && !isSensitive) {
              saveCommandToHistory(hostId, command).catch((error) => {
                console.error("Failed to save command to history:", error);
              });
            }

            if (onCommandExecuted) {
              onCommandExecuted(command);
            }
          }

          setCurrentCommand("");
          continue;
        }

        if (charCode === 8 || charCode === 127) {
          deleteBeforeCursor();
          continue;
        }

        if (charCode === 3 || charCode === 4) {
          setCurrentCommand("");
          continue;
        }

        if (charCode === 1) {
          cursorPositionRef.current = 0;
          continue;
        }

        if (charCode === 5) {
          cursorPositionRef.current = currentCommandRef.current.length;
          continue;
        }

        if (charCode === 11) {
          setCurrentCommand(
            currentCommandRef.current.slice(0, cursorPositionRef.current),
            cursorPositionRef.current,
          );
          continue;
        }

        if (charCode === 21) {
          setCurrentCommand("");
          continue;
        }

        if (charCode >= 32 && charCode <= 126) {
          insertAtCursor(char);
        }
      }
    },
    [
      deleteBeforeCursor,
      enabled,
      handleEscapeSequence,
      hostId,
      insertAtCursor,
      onCommandExecuted,
      persistHistory,
      setCurrentCommand,
    ],
  );

  const getCurrentCommand = useCallback(() => {
    return currentCommandRef.current;
  }, []);

  const isCursorAtEnd = useCallback(() => {
    return cursorPositionRef.current === currentCommandRef.current.length;
  }, []);

  const clearCurrentCommand = useCallback(() => {
    setCurrentCommand("");
  }, [setCurrentCommand]);

  const updateCurrentCommand = useCallback(
    (command: string) => {
      setCurrentCommand(command);
    },
    [setCurrentCommand],
  );

  return {
    trackInput,
    getCurrentCommand,
    isCursorAtEnd,
    clearCurrentCommand,
    updateCurrentCommand,
  };
}
