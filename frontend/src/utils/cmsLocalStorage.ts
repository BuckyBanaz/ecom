/** Persist CMS payloads in localStorage for instant storefront paint (stale-while-revalidate). */

const HOMEPAGE_KEY = "cms_homepage_data";
const PAGE_KEY_PREFIX = "cms_page_";

export type CachedHomepage = {
  content: string;
  seoTitle?: string;
  seoDesc?: string;
  seoKeywords?: string;
  savedAt: number;
};

export type CachedCmsPage = {
  slug: string;
  title?: string;
  body?: string;
  seoTitle?: string;
  seoDesc?: string;
  seoKeywords?: string;
  published?: boolean;
  savedAt: number;
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readCachedHomepage(): CachedHomepage | null {
  const parsed = safeParse<CachedHomepage>(localStorage.getItem(HOMEPAGE_KEY));
  if (!parsed?.content?.trim()) return null;
  return parsed;
}

export function writeCachedHomepage(data: Omit<CachedHomepage, "savedAt">) {
  localStorage.setItem(
    HOMEPAGE_KEY,
    JSON.stringify({ ...data, savedAt: Date.now() }),
  );
}

export function readCachedCmsPage(slug: string): CachedCmsPage | null {
  const parsed = safeParse<CachedCmsPage>(localStorage.getItem(`${PAGE_KEY_PREFIX}${slug}`));
  if (!parsed?.body && !parsed?.title) return null;
  return parsed;
}

export function writeCachedCmsPage(slug: string, page: Omit<CachedCmsPage, "savedAt" | "slug">) {
  localStorage.setItem(
    `${PAGE_KEY_PREFIX}${slug}`,
    JSON.stringify({ slug, ...page, savedAt: Date.now() }),
  );
}

/** Detect which shortcode blocks exist without parsing full HTML. */
export function detectShortcodeBlocks(content: string): Set<string> {
  const types = new Set<string>();
  if (!content) return types;
  const regex = /\[([a-zA-Z0-9-]+)([^\]]*)\]\[\/\1\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    types.add(match[1]);
  }
  return types;
}
