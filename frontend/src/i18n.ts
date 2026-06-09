import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import nlCommon from "./locales/nl/translation.json";
import enCommon from "./locales/en/translation.json";

export const SUPPORTED_LANGUAGES = [
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "en", label: "English", flag: "🇬🇧" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: SupportedLanguage = "nl";
export const FALLBACK_LANGUAGE: SupportedLanguage = "en";
export const LANGUAGE_STORAGE_KEY = "i18nextLng";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      nl: { translation: nlCommon },
      en: { translation: enCommon },
    },
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

// Keep <html lang="..."> in sync so the browser's built-in translator
// (Chrome / Edge) can detect & offer auto-translate suggestions like
// the native Google Translate popup.
const syncHtmlLang = (lng: string) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
};

syncHtmlLang(i18n.language || DEFAULT_LANGUAGE);
i18n.on("languageChanged", syncHtmlLang);

// Defensive: Google Translate injects its top banner iframe AFTER our CSS
// loads, and re-applies inline styles. Continuously force-hide it and reset
// any body offset Google adds so our layout never jumps.
if (typeof window !== "undefined") {
  const hideGoogleTranslateBanner = () => {
    const selectors = [
      ".goog-te-banner-frame",
      "iframe.goog-te-banner-frame",
      ".goog-te-ftab",
      "#goog-gt-tt",
      ".goog-tooltip",
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        el.style.display = "none";
        el.style.visibility = "hidden";
      });
    });
    if (document.body) {
      document.body.style.top = "0px";
      document.body.style.position = "static";
    }
  };

  // Run once on load and again whenever the DOM changes (Google injects late).
  hideGoogleTranslateBanner();
  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => hideGoogleTranslateBanner());
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: false });
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        observer.observe(document.body, { childList: true, subtree: false });
        hideGoogleTranslateBanner();
      });
    }
  }
}

export default i18n;
