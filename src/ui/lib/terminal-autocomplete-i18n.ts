import autocompleteAf from "@/locales/autocomplete/af.json";
import autocompleteAr from "@/locales/autocomplete/ar.json";
import autocompleteBn from "@/locales/autocomplete/bn.json";
import autocompleteBg from "@/locales/autocomplete/bg.json";
import autocompleteCa from "@/locales/autocomplete/ca.json";
import autocompleteCs from "@/locales/autocomplete/cs.json";
import autocompleteDa from "@/locales/autocomplete/da.json";
import autocompleteDe from "@/locales/autocomplete/de.json";
import autocompleteEl from "@/locales/autocomplete/el.json";
import autocompleteEn from "@/locales/autocomplete/en.json";
import autocompleteEsEs from "@/locales/autocomplete/es-ES.json";
import autocompleteFi from "@/locales/autocomplete/fi.json";
import autocompleteFr from "@/locales/autocomplete/fr.json";
import autocompleteHe from "@/locales/autocomplete/he.json";
import autocompleteHi from "@/locales/autocomplete/hi.json";
import autocompleteHu from "@/locales/autocomplete/hu.json";
import autocompleteId from "@/locales/autocomplete/id.json";
import autocompleteIt from "@/locales/autocomplete/it.json";
import autocompleteJa from "@/locales/autocomplete/ja.json";
import autocompleteKo from "@/locales/autocomplete/ko.json";
import autocompleteNl from "@/locales/autocomplete/nl.json";
import autocompleteNo from "@/locales/autocomplete/no.json";
import autocompletePl from "@/locales/autocomplete/pl.json";
import autocompletePtBr from "@/locales/autocomplete/pt-BR.json";
import autocompletePtPt from "@/locales/autocomplete/pt-PT.json";
import autocompleteRo from "@/locales/autocomplete/ro.json";
import autocompleteRu from "@/locales/autocomplete/ru.json";
import autocompleteSr from "@/locales/autocomplete/sr.json";
import autocompleteSvSe from "@/locales/autocomplete/sv-SE.json";
import autocompleteTh from "@/locales/autocomplete/th.json";
import autocompleteTr from "@/locales/autocomplete/tr.json";
import autocompleteUk from "@/locales/autocomplete/uk.json";
import autocompleteVi from "@/locales/autocomplete/vi.json";
import autocompleteZhCn from "@/locales/autocomplete/zh-CN.json";
import autocompleteZhTw from "@/locales/autocomplete/zh-TW.json";

export interface TerminalAutocompleteI18nResource {
  contextualSuggestionDetails: Record<
    string,
    Record<string, Record<string, string>>
  >;
  help: Record<string, string>;
  suggestionDetails: Record<string, Record<string, string>>;
  valueDescriptions: Record<string, string>;
}

export const TERMINAL_AUTOCOMPLETE_SUPPORTED_LANGUAGES = [
  "en",
  "af",
  "ar",
  "bn",
  "bg",
  "ca",
  "cs",
  "da",
  "de",
  "el",
  "es-ES",
  "fi",
  "fr",
  "he",
  "hi",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "nl",
  "no",
  "pl",
  "pt-PT",
  "pt-BR",
  "ro",
  "ru",
  "sr",
  "sv-SE",
  "th",
  "tr",
  "uk",
  "vi",
  "zh-CN",
  "zh-TW",
] as const;

export type TerminalAutocompleteLanguage =
  (typeof TERMINAL_AUTOCOMPLETE_SUPPORTED_LANGUAGES)[number];

type PartialTerminalAutocompleteI18nResource = {
  contextualSuggestionDetails?: Record<
    string,
    Record<string, Record<string, string>>
  >;
  help?: Record<string, string>;
  suggestionDetails?: Record<string, Record<string, string>>;
  valueDescriptions?: Record<string, string>;
};

const EN_AUTOCOMPLETE_RESOURCE =
  autocompleteEn as TerminalAutocompleteI18nResource;
const DE_AUTOCOMPLETE_RESOURCE =
  autocompleteDe as TerminalAutocompleteI18nResource;

const TERMINAL_AUTOCOMPLETE_PARTIAL_RESOURCES: Partial<
  Record<TerminalAutocompleteLanguage, PartialTerminalAutocompleteI18nResource>
> = {
  af: autocompleteAf as PartialTerminalAutocompleteI18nResource,
  ar: autocompleteAr as PartialTerminalAutocompleteI18nResource,
  bn: autocompleteBn as PartialTerminalAutocompleteI18nResource,
  bg: autocompleteBg as PartialTerminalAutocompleteI18nResource,
  ca: autocompleteCa as PartialTerminalAutocompleteI18nResource,
  cs: autocompleteCs as PartialTerminalAutocompleteI18nResource,
  da: autocompleteDa as PartialTerminalAutocompleteI18nResource,
  de: DE_AUTOCOMPLETE_RESOURCE,
  el: autocompleteEl as PartialTerminalAutocompleteI18nResource,
  "es-ES": autocompleteEsEs as PartialTerminalAutocompleteI18nResource,
  fi: autocompleteFi as PartialTerminalAutocompleteI18nResource,
  fr: autocompleteFr as PartialTerminalAutocompleteI18nResource,
  he: autocompleteHe as PartialTerminalAutocompleteI18nResource,
  hi: autocompleteHi as PartialTerminalAutocompleteI18nResource,
  hu: autocompleteHu as PartialTerminalAutocompleteI18nResource,
  id: autocompleteId as PartialTerminalAutocompleteI18nResource,
  it: autocompleteIt as PartialTerminalAutocompleteI18nResource,
  ja: autocompleteJa as PartialTerminalAutocompleteI18nResource,
  ko: autocompleteKo as PartialTerminalAutocompleteI18nResource,
  nl: autocompleteNl as PartialTerminalAutocompleteI18nResource,
  no: autocompleteNo as PartialTerminalAutocompleteI18nResource,
  pl: autocompletePl as PartialTerminalAutocompleteI18nResource,
  "pt-BR": autocompletePtBr as PartialTerminalAutocompleteI18nResource,
  "pt-PT": autocompletePtPt as PartialTerminalAutocompleteI18nResource,
  ro: autocompleteRo as PartialTerminalAutocompleteI18nResource,
  ru: autocompleteRu as PartialTerminalAutocompleteI18nResource,
  sr: autocompleteSr as PartialTerminalAutocompleteI18nResource,
  "sv-SE": autocompleteSvSe as PartialTerminalAutocompleteI18nResource,
  th: autocompleteTh as PartialTerminalAutocompleteI18nResource,
  tr: autocompleteTr as PartialTerminalAutocompleteI18nResource,
  uk: autocompleteUk as PartialTerminalAutocompleteI18nResource,
  vi: autocompleteVi as PartialTerminalAutocompleteI18nResource,
  "zh-CN": autocompleteZhCn as PartialTerminalAutocompleteI18nResource,
  "zh-TW": autocompleteZhTw as PartialTerminalAutocompleteI18nResource,
};

function mergeTerminalAutocompleteI18nResource(
  fallback: TerminalAutocompleteI18nResource,
  partial?: PartialTerminalAutocompleteI18nResource,
): TerminalAutocompleteI18nResource {
  if (!partial) {
    return fallback;
  }

  const contextualSuggestionDetails = {
    ...fallback.contextualSuggestionDetails,
  };
  Object.entries(partial.contextualSuggestionDetails ?? {}).forEach(
    ([command, contexts]) => {
      contextualSuggestionDetails[command] = {
        ...(contextualSuggestionDetails[command] ?? {}),
        ...contexts,
      };
    },
  );

  const suggestionDetails = { ...fallback.suggestionDetails };
  Object.entries(partial.suggestionDetails ?? {}).forEach(
    ([command, details]) => {
      suggestionDetails[command] = {
        ...(suggestionDetails[command] ?? {}),
        ...details,
      };
    },
  );

  return {
    contextualSuggestionDetails,
    help: {
      ...fallback.help,
      ...(partial.help ?? {}),
    },
    suggestionDetails,
    valueDescriptions: {
      ...fallback.valueDescriptions,
      ...(partial.valueDescriptions ?? {}),
    },
  };
}

function normalizeTerminalAutocompleteLanguage(
  language?: string,
): TerminalAutocompleteLanguage {
  const normalized = language?.replace("_", "-").toLowerCase() ?? "en";

  if (normalized.startsWith("de")) {
    return "de";
  }

  const exactMatch = TERMINAL_AUTOCOMPLETE_SUPPORTED_LANGUAGES.find(
    (supportedLanguage) => supportedLanguage.toLowerCase() === normalized,
  );
  if (exactMatch) {
    return exactMatch;
  }

  const baseLanguage = normalized.split("-", 1)[0];
  const baseMatch = TERMINAL_AUTOCOMPLETE_SUPPORTED_LANGUAGES.find(
    (supportedLanguage) =>
      supportedLanguage.toLowerCase().split("-", 1)[0] === baseLanguage,
  );

  return baseMatch ?? "en";
}

export const TERMINAL_AUTOCOMPLETE_I18N_RESOURCES =
  TERMINAL_AUTOCOMPLETE_SUPPORTED_LANGUAGES.reduce(
    (resources, language) => {
      resources[language] = mergeTerminalAutocompleteI18nResource(
        EN_AUTOCOMPLETE_RESOURCE,
        TERMINAL_AUTOCOMPLETE_PARTIAL_RESOURCES[language],
      );
      return resources;
    },
    {} as Record<
      TerminalAutocompleteLanguage,
      TerminalAutocompleteI18nResource
    >,
  );

export function getTerminalAutocompleteI18nResource(language?: string) {
  return TERMINAL_AUTOCOMPLETE_I18N_RESOURCES[
    normalizeTerminalAutocompleteLanguage(language)
  ];
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
