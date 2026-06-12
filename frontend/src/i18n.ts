import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import nlCommon from "./locales/nl/translation.json";
import enCommon from "./locales/en/translation.json";
import {
  clearGoogleTranslateCookie,
  enableAppControlledTranslation,
  startGoogleTranslatePolicyWatcher,
  syncGoogleTranslatePolicy,
} from "./utils/googleTranslatePolicy";
import {
  consumeLanguageFromUrl,
  readStoredLanguage,
  persistLanguageChoice,
} from "./utils/languageSwitch";

export const SUPPORTED_LANGUAGES = [
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "en", label: "English", flag: "🇬🇧" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: SupportedLanguage = "nl";
export const FALLBACK_LANGUAGE: SupportedLanguage = "en";
export const LANGUAGE_STORAGE_KEY = "i18nextLng";

/** Apply ?lang= from reload, else keep stored choice, else default Dutch. */
const initialLanguage: SupportedLanguage =
  typeof window !== "undefined"
    ? consumeLanguageFromUrl() ?? readStoredLanguage()
    : DEFAULT_LANGUAGE;

if (typeof window !== "undefined") {
  persistLanguageChoice(initialLanguage);
}

export { clearGoogleTranslateCookie, syncGoogleTranslatePolicy };

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      nl: { translation: nlCommon },
      en: { translation: enCommon },
    },
    // Do NOT hardcode lng here — it overrides localStorage and blocks language switching.
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    returnNull: false,
  });

// Ensure i18n matches stored/url language after init.
if (i18n.language?.split("-")[0] !== initialLanguage) {
  void i18n.changeLanguage(initialLanguage);
}

const syncHtmlLang = (lng: string) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng.split("-")[0];
  }
};

syncHtmlLang(i18n.language || initialLanguage);
i18n.on("languageChanged", (lng) => {
  syncHtmlLang(lng);
  persistLanguageChoice(lng.split("-")[0] as SupportedLanguage);
  enableAppControlledTranslation();
});

if (typeof window !== "undefined") {
  startGoogleTranslatePolicyWatcher();
}

export default i18n;
