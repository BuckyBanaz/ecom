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

export const SUPPORTED_LANGUAGES = [
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "en", label: "English", flag: "🇬🇧" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: SupportedLanguage = "nl";
export const FALLBACK_LANGUAGE: SupportedLanguage = "en";
export const LANGUAGE_STORAGE_KEY = "i18nextLng";

export { clearGoogleTranslateCookie, syncGoogleTranslatePolicy };

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      nl: { translation: nlCommon },
      en: { translation: enCommon },
    },
    // Missing EN keys fall back to English copy, not Dutch.
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    returnNull: false,
  });

const syncHtmlLang = (lng: string) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng.split("-")[0];
  }
};

syncHtmlLang(i18n.language || DEFAULT_LANGUAGE);
i18n.on("languageChanged", (lng) => {
  syncHtmlLang(lng);
  enableAppControlledTranslation();
});

if (typeof window !== "undefined") {
  startGoogleTranslatePolicyWatcher();
}

export default i18n;
