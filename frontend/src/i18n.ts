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

function disableNativeDomTranslation() {
  if (typeof document === "undefined") return;

  document.documentElement.classList.add("notranslate");
  document.documentElement.setAttribute("translate", "no");
  document.body?.classList.add("notranslate");
  document.body?.setAttribute("translate", "no");
  document.getElementById("root")?.classList.add("notranslate");
  document.getElementById("root")?.setAttribute("translate", "no");
}

function removeGoogleTranslateArtifacts() {
  if (typeof document === "undefined") return;

  document.getElementById("google_translate_element")?.remove();
  document
    .querySelectorAll<HTMLScriptElement>('script[src*="translate.google.com/translate_a/element.js"]')
    .forEach((script) => script.remove());
  document
    .querySelectorAll<HTMLElement>(
      "iframe.skiptranslate, div.skiptranslate, .goog-te-banner-frame, .goog-te-ftab, #goog-gt-tt, .goog-tooltip",
    )
    .forEach((element) => element.remove());
}

export function clearGoogleTranslateCookie() {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const hostname = window.location.hostname;
  const domains = new Set<string>([""]);

  if (hostname) {
    domains.add(hostname);

    const parts = hostname.split(".").filter(Boolean);
    if (parts.length > 1) {
      domains.add("." + parts.slice(-2).join("."));
    }
  }

  domains.forEach((domain) => {
    const domainPart = domain ? `; domain=${domain}` : "";
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainPart}`;
  });

  document.documentElement.classList.remove("translated-ltr", "translated-rtl");
  document.body?.classList.remove("translated-ltr", "translated-rtl");
  removeGoogleTranslateArtifacts();
  disableNativeDomTranslation();
}

disableNativeDomTranslation();
clearGoogleTranslateCookie();

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

// Keep <html lang="..."> in sync for accessibility and SEO.
const syncHtmlLang = (lng: string) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
    disableNativeDomTranslation();
  }
};

syncHtmlLang(i18n.language || DEFAULT_LANGUAGE);
i18n.on("languageChanged", syncHtmlLang);

// Defensive cleanup for any stale Google Translate UI left by older sessions.
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
