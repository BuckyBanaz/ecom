import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, type SupportedLanguage } from "@/i18n";

/** sessionStorage key — scroll Y to restore after a language-change reload. */
export const LANG_SCROLL_RESTORE_KEY = "i18next-scroll-y";

/** Query param used once on reload to apply language reliably. */
export const LANG_QUERY_KEY = "lang";

export function saveScrollForLanguageReload(): void {
  sessionStorage.setItem(LANG_SCROLL_RESTORE_KEY, String(window.scrollY));
}

export function consumeLanguageScrollRestore(): number | null {
  const raw = sessionStorage.getItem(LANG_SCROLL_RESTORE_KEY);
  if (raw == null) return null;
  sessionStorage.removeItem(LANG_SCROLL_RESTORE_KEY);
  const y = parseInt(raw, 10);
  return Number.isFinite(y) && y >= 0 ? y : null;
}

/** Restore scroll after reload; retries until layout height allows the target Y. */
export function restoreLanguageScroll(y: number): void {
  let attempts = 0;
  const tryScroll = () => {
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(y, maxY));
    attempts += 1;
    if (attempts < 8 && document.documentElement.scrollHeight < y + window.innerHeight) {
      requestAnimationFrame(tryScroll);
    }
  };
  requestAnimationFrame(tryScroll);
}

export function normalizeLanguageCode(raw: string | null | undefined): SupportedLanguage {
  const code = raw?.split("-")[0]?.toLowerCase();
  return code === "en" ? "en" : DEFAULT_LANGUAGE;
}

export function readStoredLanguage(): SupportedLanguage {
  if (typeof localStorage === "undefined") return DEFAULT_LANGUAGE;
  return normalizeLanguageCode(localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

export function persistLanguageChoice(code: SupportedLanguage): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
}

/**
 * Read ?lang=en|nl from URL (set during language switch reload), persist it, strip param.
 * Returns the language if found.
 */
export function consumeLanguageFromUrl(): SupportedLanguage | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get(LANG_QUERY_KEY);
  if (!fromUrl) return null;

  const code = normalizeLanguageCode(fromUrl);
  persistLanguageChoice(code);

  params.delete(LANG_QUERY_KEY);
  const search = params.toString();
  const cleanUrl =
    window.location.pathname + (search ? `?${search}` : "") + window.location.hash;
  window.history.replaceState(null, "", cleanUrl);

  return code;
}

export function buildLanguageSwitchUrl(code: SupportedLanguage): string {
  const url = new URL(window.location.href);
  url.searchParams.set(LANG_QUERY_KEY, code);
  return url.toString();
}
