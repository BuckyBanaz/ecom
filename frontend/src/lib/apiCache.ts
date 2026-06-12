type CacheEntry<T> = {
  data: T;
  expires: number;
  savedAt: number;
};

const MEMORY = new Map<string, CacheEntry<unknown>>();
const LS_PREFIX = "ecom-cache:";

export const cacheKey = (method: string, url: string) => {
  const lang =
    typeof localStorage !== "undefined"
      ? (localStorage.getItem("i18nextLng") || "nl").split("-")[0]
      : "nl";
  return `${method}:${url}:${lang}`;
};

export function getCached<T>(key: string): T | null {
  const mem = MEMORY.get(key) as CacheEntry<T> | undefined;
  if (mem && mem.expires > Date.now()) {
    return mem.data;
  }

  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (parsed.expires > Date.now()) {
      MEMORY.set(key, parsed);
      return parsed.data;
    }
    localStorage.removeItem(LS_PREFIX + key);
  } catch {
    /* ignore corrupt cache */
  }

  return null;
}

export function setCache<T>(key: string, data: T, ttlMs: number) {
  const entry: CacheEntry<T> = {
    data,
    expires: Date.now() + ttlMs,
    savedAt: Date.now(),
  };
  MEMORY.set(key, entry as CacheEntry<unknown>);
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* localStorage full — memory cache still works */
  }
}

export function isCacheStale(key: string, staleAfterMs: number) {
  const mem = MEMORY.get(key);
  if (mem) return Date.now() - mem.savedAt > staleAfterMs;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as CacheEntry<unknown>;
    return Date.now() - parsed.savedAt > staleAfterMs;
  } catch {
    return true;
  }
}

export function clearApiCache(prefix?: string) {
  if (!prefix) {
    MEMORY.clear();
    Object.keys(localStorage)
      .filter((k) => k.startsWith(LS_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
    clearCmsLocalCache();
    return;
  }

  for (const key of MEMORY.keys()) {
    if (key.startsWith(prefix)) MEMORY.delete(key);
  }
  Object.keys(localStorage)
    .filter((k) => k.startsWith(LS_PREFIX + prefix))
    .forEach((k) => localStorage.removeItem(k));
}

/** Runtime phrase cache only — CMS structure (header/menu/homepage) is language-neutral. */
export function clearCmsLocalCache() {
  if (typeof localStorage === "undefined") return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith("tr:"))
    .forEach((k) => localStorage.removeItem(k));
}
