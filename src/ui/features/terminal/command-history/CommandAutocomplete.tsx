import React, { useEffect, useRef } from "react";
import { Brackets, Clock, CornerDownLeft } from "lucide-react";
import {
  getTerminalAutocompleteCatalogDisplayLabel,
  getTerminalAutocompleteCatalogDisplayQuery,
  getTerminalAutocompleteHelp,
  getTerminalAutocompleteSuggestionDescription,
  type TerminalAutocompleteSource,
} from "@/lib/terminal-autocomplete.ts";
import { cn } from "@/lib/utils.ts";
import { getCommandAutocompleteListHeight } from "./commandAutocompleteLayout.ts";

interface CommandAutocompleteProps {
  automatic?: boolean;
  currentCommand?: string;
  historySuggestions?: string[];
  suggestions: string[];
  suggestionSources?: TerminalAutocompleteSource[];
  selectionActive?: boolean;
  selectedIndex: number;
  helpEnabled?: boolean;
  onSelect: (command: string) => void;
  position: { top: number; left: number };
  visible: boolean;
}

function splitSuggestionPrefix(suggestion: string, currentCommand = "") {
  const typed = currentCommand.trimStart();

  if (
    typed.length > 0 &&
    suggestion.toLowerCase().startsWith(typed.toLowerCase())
  ) {
    return {
      prefix: suggestion.slice(0, typed.length),
      rest: suggestion.slice(typed.length),
    };
  }

  return { prefix: "", rest: suggestion };
}

function uniqueItems(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function getHelpParameters(
  help: NonNullable<ReturnType<typeof getTerminalAutocompleteHelp>>,
  selectedSuggestion: string,
  currentCommand = "",
) {
  const selectedParts = getTerminalAutocompleteCatalogDisplayLabel(
    currentCommand,
    selectedSuggestion,
  )
    .trim()
    .split(/\s+/);
  const activeSubcommand = selectedParts[0] ?? "";
  const commandOptions =
    help.commandOptions?.[activeSubcommand] ??
    help.commandOptions?.[activeSubcommand.replace(/-/g, "_")] ??
    [];

  return uniqueItems([
    ...commandOptions,
    ...(help.subcommands ?? []),
    ...(help.options ?? []),
    ...(help.globalOptions ?? []),
    ...(help.commonFormats ?? []).map((format) => `-o ${format}`),
  ]);
}

function getHelpExamples(
  help: NonNullable<ReturnType<typeof getTerminalAutocompleteHelp>>,
) {
  return uniqueItems([
    ...help.examples,
    ...Object.values(help.commonPatterns ?? {}).flat(),
  ]);
}

function isHistorySuggestion(suggestion: string, historySuggestions: string[]) {
  const normalizedSuggestion = suggestion.trim();
  return historySuggestions.some((historySuggestion) => {
    const normalizedHistorySuggestion = historySuggestion.trim();
    return (
      normalizedSuggestion === normalizedHistorySuggestion ||
      normalizedSuggestion.endsWith(` ${normalizedHistorySuggestion}`)
    );
  });
}

function getSuggestionSource(suggestion: string, historySuggestions: string[]) {
  return isHistorySuggestion(suggestion, historySuggestions)
    ? "history"
    : "catalog";
}

export function CommandAutocomplete({
  automatic = false,
  currentCommand,
  historySuggestions = [],
  suggestions,
  suggestionSources = [],
  selectionActive = false,
  selectedIndex,
  helpEnabled = false,
  onSelect,
  position,
  visible,
}: CommandAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedRef.current && containerRef.current) {
      selectedRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  if (!visible || suggestions.length === 0) {
    return null;
  }

  const highlightedIndex = selectionActive ? selectedIndex : -1;
  const selectedSuggestion = suggestions[selectedIndex] ?? suggestions[0] ?? "";
  const rows = suggestions.map((suggestion, index) => {
    const source =
      suggestionSources[index] ??
      getSuggestionSource(suggestion, historySuggestions);
    const previousSource =
      index > 0
        ? (suggestionSources[index - 1] ??
          getSuggestionSource(suggestions[index - 1] ?? "", historySuggestions))
        : source;

    return {
      suggestion,
      source,
      hasSourceBoundary: index > 0 && source !== previousSource,
    };
  });
  const selectedHelp = helpEnabled
    ? getTerminalAutocompleteHelp(selectedSuggestion)
    : null;
  const helpParameters = selectedHelp
    ? getHelpParameters(selectedHelp, selectedSuggestion, currentCommand)
    : [];
  const helpExamples = selectedHelp ? getHelpExamples(selectedHelp) : [];
  const listHeight = getCommandAutocompleteListHeight(rows, automatic);
  const helpMaxHeight = selectedHelp ? 160 : 0;
  const maxHeight = listHeight + helpMaxHeight;

  return (
    <div
      ref={containerRef}
      className="fixed z-[2147483647] flex min-w-[280px] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-md border border-accent-brand/50 bg-popover text-popover-foreground shadow-[0_18px_60px_rgba(0,0,0,0.85)] ring-1 ring-black/60"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: "fit-content",
        minWidth: "280px",
        maxWidth: automatic
          ? "min(640px, calc(100vw - 16px))"
          : "min(820px, calc(100vw - 16px))",
        maxHeight: `${maxHeight}px`,
        backgroundColor: "var(--popover)",
        color: "var(--popover-foreground)",
      }}
    >
      <div
        className="overflow-y-auto thin-scrollbar"
        style={{
          height: `${listHeight}px`,
          maxHeight: `${listHeight}px`,
        }}
      >
        {rows.map(({ suggestion, source, hasSourceBoundary }, index) => (
          <SuggestionRow
            key={index}
            ref={index === highlightedIndex ? selectedRef : null}
            currentCommand={currentCommand}
            hasSourceBoundary={hasSourceBoundary}
            source={source}
            selected={index === highlightedIndex}
            suggestion={suggestion}
            onSelect={onSelect}
          />
        ))}
      </div>
      {selectedHelp && (
        <div className="border-t border-border bg-surface/80 px-3 py-2">
          <div className="flex items-start gap-2">
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-popover-foreground">
              {selectedHelp.description}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-accent-brand">
              {selectedHelp.command}
            </span>
          </div>
          {helpParameters.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1 overflow-hidden">
              {helpParameters.slice(0, 8).map((option) => (
                <span
                  key={option}
                  className="truncate border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {option}
                </span>
              ))}
            </div>
          )}
          <div className="mt-1 flex flex-col gap-0.5">
            {helpExamples.slice(0, 3).map((example) => (
              <span
                key={example}
                className="truncate font-mono text-[10px] text-muted-foreground"
                title={example}
              >
                {example}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SuggestionRowProps {
  currentCommand?: string;
  hasSourceBoundary?: boolean;
  onSelect: (command: string) => void;
  selected: boolean;
  source: "catalog" | "history";
  suggestion: string;
}

const SuggestionRow = React.forwardRef<HTMLDivElement, SuggestionRowProps>(
  (
    {
      currentCommand,
      hasSourceBoundary = false,
      onSelect,
      selected,
      source,
      suggestion,
    },
    ref,
  ) => {
    const displaySuggestion =
      source === "catalog"
        ? getTerminalAutocompleteCatalogDisplayLabel(
            currentCommand ?? "",
            suggestion,
          )
        : suggestion;
    const displayQuery =
      source === "catalog"
        ? getTerminalAutocompleteCatalogDisplayQuery(currentCommand ?? "")
        : currentCommand;
    const { prefix, rest } = splitSuggestionPrefix(
      displaySuggestion,
      displayQuery,
    );
    const description = getTerminalAutocompleteSuggestionDescription(
      currentCommand ?? "",
      suggestion,
    );
    const SourceIcon = source === "history" ? Clock : Brackets;

    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden",
          hasSourceBoundary && "border-t border-border/70",
        )}
        onClick={() => onSelect(suggestion)}
        title={description ? `${suggestion} - ${description}` : suggestion}
      >
        <div
          className={cn(
            "grid h-8 cursor-pointer grid-cols-[20px_minmax(96px,1fr)_minmax(0,1.15fr)_20px] items-center gap-2 overflow-hidden border-l-2 border-transparent px-3 font-mono text-[13px] transition-colors",
            "hover:bg-accent-brand/10 hover:text-popover-foreground",
            source === "history" && "bg-muted/15",
            selected &&
              "border-accent-brand bg-accent-brand/15 text-popover-foreground hover:bg-accent-brand/15 hover:text-popover-foreground",
          )}
        >
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center border",
              source === "history"
                ? "border-border bg-muted/30 text-muted-foreground"
                : "border-accent-brand/40 bg-accent-brand/10 text-accent-brand",
            )}
          >
            <SourceIcon className="size-3.5" />
          </span>
          <span className="min-w-0 truncate">
            {prefix && (
              <span className="bg-muted px-0.5 text-popover-foreground">
                {prefix}
              </span>
            )}
            <span>{rest}</span>
          </span>
          <span className="min-w-0 truncate text-[11px] leading-none text-muted-foreground">
            {description}
          </span>
          <span className="flex size-5 shrink-0 items-center justify-center">
            {selected && (
              <CornerDownLeft
                aria-hidden="true"
                className="size-3.5 text-muted-foreground"
              />
            )}
          </span>
        </div>
      </div>
    );
  },
);

SuggestionRow.displayName = "SuggestionRow";
