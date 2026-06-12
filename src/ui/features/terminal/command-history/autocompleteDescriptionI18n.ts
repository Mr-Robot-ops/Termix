import {
  getTerminalAutocompleteHelpDescription,
  getTerminalAutocompleteSuggestionDescription,
  type TerminalAutocompleteHelp,
} from "@/lib/terminal-autocomplete.ts";

type Translate = (
  key: string,
  options: Record<string, string | number | undefined>,
) => string;

export function getLocalizedTerminalAutocompleteSuggestionDescription(
  _t: Translate,
  language: string | undefined,
  currentCommand: string,
  suggestion: string,
) {
  return getTerminalAutocompleteSuggestionDescription(
    currentCommand,
    suggestion,
    { language },
  );
}

export function getLocalizedTerminalAutocompleteHelpDescription(
  _t: Translate,
  language: string | undefined,
  help: TerminalAutocompleteHelp,
) {
  return getTerminalAutocompleteHelpDescription(help, { language });
}
