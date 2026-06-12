import autocompleteDe from "@/locales/autocomplete/de.json";
import autocompleteEn from "@/locales/autocomplete/en.json";

export interface TerminalAutocompleteI18nResource {
  contextualSuggestionDetails: Record<
    string,
    Record<string, Record<string, string>>
  >;
  help: Record<string, string>;
  suggestionDetails: Record<string, Record<string, string>>;
  valueDescriptions: Record<string, string>;
}

export const TERMINAL_AUTOCOMPLETE_I18N_RESOURCES = {
  de: autocompleteDe as TerminalAutocompleteI18nResource,
  en: autocompleteEn as TerminalAutocompleteI18nResource,
};

export function getTerminalAutocompleteI18nResource(language?: string) {
  if (language?.toLowerCase().startsWith("de")) {
    return TERMINAL_AUTOCOMPLETE_I18N_RESOURCES.de;
  }

  return TERMINAL_AUTOCOMPLETE_I18N_RESOURCES.en;
}

export function getTerminalAutocompleteHelpDescriptionText(
  command: string,
  language?: string,
) {
  const localizedResource = getTerminalAutocompleteI18nResource(language);
  return (
    localizedResource.help[command] ??
    TERMINAL_AUTOCOMPLETE_I18N_RESOURCES.en.help[command] ??
    `Run ${command}`
  );
}
