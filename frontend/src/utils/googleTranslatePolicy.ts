/**
 * Language policy:
 * - EN / NL via app TAAL → our i18n + curated phrases (block browser Google Translate)
 * - Any other language via browser Google Translate → allow Chrome/extension GT on the page
 */

export const APP_LANGUAGE_CODES = new Set(["en", "nl"]);

const HTML_CONTROLLED_CLASS = "app-i18n-controlled";
const HTML_BROWSER_GT_CLASS = "browser-translate-active";

let blockUiObserver: MutationObserver | null = null;
let policyPollTimer: ReturnType<typeof setInterval> | null = null;

export function getGoogleTranslateTarget(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
  if (!match?.[1]) return null;
  const value = decodeURIComponent(match[1]).trim();
  if (!value || value === "/") return null;
  const parts = value.split("/").filter(Boolean);
  const target = parts[parts.length - 1]?.toLowerCase().split("-")[0];
  return target || null;
}

/** Browser GT targets a language outside app EN/NL (e.g. German, French). */
export function isThirdPartyBrowserTranslate(): boolean {
  const target = getGoogleTranslateTarget();
  if (!target) return false;
  return !APP_LANGUAGE_CODES.has(target);
}

export function isAppControlledTranslation(): boolean {
  return !isThirdPartyBrowserTranslate();
}

function removeInjectedTranslateArtifacts() {
  if (typeof document === "undefined") return;
  document.getElementById("google_translate_element")?.remove();
  document
    .querySelectorAll<HTMLScriptElement>('script[src*="translate.google.com/translate_a/element.js"]')
    .forEach((script) => script.remove());
}

function hideBrowserTranslateBanner() {
  if (typeof document === "undefined" || !isAppControlledTranslation()) return;

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
}

function ensureNotranslateMeta() {
  if (document.querySelector('meta[name="google"][content="notranslate"]')) return;
  const meta = document.createElement("meta");
  meta.setAttribute("name", "google");
  meta.setAttribute("content", "notranslate");
  document.head.appendChild(meta);
}

function removeNotranslateMeta() {
  document.querySelector('meta[name="google"][content="notranslate"]')?.remove();
}

function startBlockingBrowserTranslateUi() {
  hideBrowserTranslateBanner();
  if (blockUiObserver || typeof MutationObserver === "undefined") return;

  blockUiObserver = new MutationObserver(() => {
    if (isAppControlledTranslation()) hideBrowserTranslateBanner();
  });

  const target = document.body || document.documentElement;
  blockUiObserver.observe(target, { childList: true, subtree: false });
}

function stopBlockingBrowserTranslateUi() {
  blockUiObserver?.disconnect();
  blockUiObserver = null;
}

/** App TAAL controls EN/NL — tell Chrome not to auto-translate; hide GT chrome. */
export function enableAppControlledTranslation() {
  if (typeof document === "undefined") return;

  document.documentElement.classList.add(HTML_CONTROLLED_CLASS);
  document.documentElement.classList.remove(HTML_BROWSER_GT_CLASS);
  document.documentElement.setAttribute("translate", "no");
  document.documentElement.classList.add("notranslate");

  ensureNotranslateMeta();
  removeInjectedTranslateArtifacts();
  startBlockingBrowserTranslateUi();
}

/** User chose a non EN/NL language in browser Google Translate — allow it. */
export function enableBrowserThirdPartyTranslate() {
  if (typeof document === "undefined") return;

  document.documentElement.classList.remove(HTML_CONTROLLED_CLASS);
  document.documentElement.classList.add(HTML_BROWSER_GT_CLASS);
  document.documentElement.setAttribute("translate", "yes");
  document.documentElement.classList.remove("notranslate");

  removeNotranslateMeta();
  stopBlockingBrowserTranslateUi();
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
  removeInjectedTranslateArtifacts();
}

/** Apply correct mode on load and when browser GT cookie changes. */
export function syncGoogleTranslatePolicy() {
  if (typeof document === "undefined") return;

  if (isThirdPartyBrowserTranslate()) {
    enableBrowserThirdPartyTranslate();
  } else {
    // Browser GT set to EN/NL while app handles those — drop redundant cookie
    const target = getGoogleTranslateTarget();
    if (target && APP_LANGUAGE_CODES.has(target)) {
      clearGoogleTranslateCookie();
    }
    enableAppControlledTranslation();
  }
}

export function startGoogleTranslatePolicyWatcher() {
  if (typeof window === "undefined" || policyPollTimer) return;

  syncGoogleTranslatePolicy();

  // Detect when user picks a third language in Chrome translate bar
  policyPollTimer = setInterval(syncGoogleTranslatePolicy, 1500);

  window.addEventListener("focus", syncGoogleTranslatePolicy);
}

export function stopGoogleTranslatePolicyWatcher() {
  if (policyPollTimer) {
    clearInterval(policyPollTimer);
    policyPollTimer = null;
  }
  stopBlockingBrowserTranslateUi();
}
