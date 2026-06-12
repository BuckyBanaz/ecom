/** sessionStorage key — scroll Y to restore after a language-change reload. */
export const LANG_SCROLL_RESTORE_KEY = "i18next-scroll-y";

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
