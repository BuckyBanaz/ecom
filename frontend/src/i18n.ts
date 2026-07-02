import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
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

const localeLoaders: Record<SupportedLanguage, () => Promise<{ default: Record<string, unknown> }>> = {
  nl: () => import("./locales/nl/translation.json"),
  en: () => import("./locales/en/translation.json"),
};

async function loadLocale(lang: SupportedLanguage) {
  if (i18n.hasResourceBundle(lang, "translation")) return;
  const mod = await localeLoaders[lang]();
  i18n.addResourceBundle(lang, "translation", mod.default, true, true);
}

/** Apply ?lang= from reload, else keep stored choice, else default Dutch. */
const initialLanguage: SupportedLanguage =
  typeof window !== "undefined"
    ? consumeLanguageFromUrl() ?? readStoredLanguage()
    : DEFAULT_LANGUAGE;

if (typeof window !== "undefined") {
  persistLanguageChoice(initialLanguage);
}

export { clearGoogleTranslateCookie, syncGoogleTranslatePolicy };

const getBrowserPreferredLanguage = (): string => {
  if (typeof navigator !== "undefined") {
    if (navigator.languages && navigator.languages.length > 0) {
      return navigator.languages[0].split("-")[0];
    }
    return navigator.language.split("-")[0];
  }
  return "nl";
};

const syncHtmlLang = (lng: string) => {
  if (typeof document !== "undefined") {
    const preferredLng = getBrowserPreferredLanguage();
    document.documentElement.lang = preferredLng || lng.split("-")[0];
  }
};

let initPromise: Promise<typeof i18n> | null = null;

/** Load only the active locale up front; lazy-load the fallback locale after paint. */
export function initI18n() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const initialBundle = await localeLoaders[initialLanguage]();

    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources: {
          [initialLanguage]: { translation: initialBundle.default },
        },
        lng: initialLanguage,
        fallbackLng: FALLBACK_LANGUAGE,
        supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
        nonExplicitSupportedLngs: true,
        partialBundledLanguages: true,
        load: "languageOnly",
        interpolation: {
          escapeValue: false,
        },
        detection: {
          order: ["localStorage"],
          caches: ["localStorage"],
          lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        },
        returnNull: false,
      });

    syncHtmlLang(i18n.language || initialLanguage);
    i18n.on("languageChanged", (lng) => {
      syncHtmlLang(lng);
      persistLanguageChoice(lng.split("-")[0] as SupportedLanguage);
      enableAppControlledTranslation();
      void loadLocale(lng.split("-")[0] as SupportedLanguage);
    });

    if (typeof window !== "undefined") {
      startGoogleTranslatePolicyWatcher();

      const preloadFallback = () => {
        const other = initialLanguage === "nl" ? "en" : "nl";
        void loadLocale(other);
      };
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(preloadFallback, { timeout: 3000 });
      } else {
        window.setTimeout(preloadFallback, 1500);
      }
    }

    return i18n;
  })();

  return initPromise;
}

export default i18n;
