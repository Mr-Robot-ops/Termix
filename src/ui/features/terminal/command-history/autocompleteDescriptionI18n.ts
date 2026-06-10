import {
  getTerminalAutocompleteHelpDescription,
  getTerminalAutocompleteHelpDescriptionInfo,
  getTerminalAutocompleteSuggestionDescription,
  getTerminalAutocompleteSuggestionDescriptionInfo,
  type TerminalAutocompleteHelp,
} from "@/lib/terminal-autocomplete.ts";

type Translate = (
  key: string,
  options: Record<string, string | number | undefined>,
) => string;

function isGermanLanguage(language?: string) {
  return language?.toLowerCase().startsWith("de") ?? false;
}

export function getLocalizedTerminalAutocompleteSuggestionDescription(
  t: Translate,
  language: string | undefined,
  currentCommand: string,
  suggestion: string,
) {
  if (isGermanLanguage(language)) {
    return getTerminalAutocompleteSuggestionDescription(
      currentCommand,
      suggestion,
      { language },
    );
  }

  const info = getTerminalAutocompleteSuggestionDescriptionInfo(
    currentCommand,
    suggestion,
  );

  if (!info) {
    return "";
  }

  return t(info.key, {
    ...info.values,
    defaultValue: info.defaultValue,
  });
}

export function getLocalizedTerminalAutocompleteHelpDescription(
  t: Translate,
  language: string | undefined,
  help: TerminalAutocompleteHelp,
) {
  if (isGermanLanguage(language)) {
    return getTerminalAutocompleteHelpDescription(help, { language });
  }

  const info = getTerminalAutocompleteHelpDescriptionInfo(help);
  return t(info.key, {
    ...info.values,
    defaultValue: info.defaultValue,
  });
}
