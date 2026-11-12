/**
 * AI translations of site content other than products: CMS pages, blogs, categories, mega menus and the
 * CMS settings blobs (homepage, header/footer, FAQs, …).
 *
 * Content here is mixed-language (some written in English, some in Dutch), so every row is translated into
 * EVERY storefront language and the AI keeps text that is already in that language.
 *
 * Structure safety:
 * - JSON settings: only human-readable string leaves are sent to the AI and written back in place, so links,
 *   images, icons and ids can never change.
 * - HTML (with [shortcodes]): the AI translates the whole document, then the tag sequence, shortcode names and
 *   every non-text attribute / URL is compared with the source; any difference rejects the translation.
 * - The storefront only uses a translation whose sourceHash matches the current source (a stale one could
 *   carry old images or links), otherwise the source text is shown.
 */
import crypto from "crypto";
import { prisma } from "../config/db";
import { callGeminiWithFallback, extractJson } from "./aiService";
import { STOREFRONT_LANGUAGES } from "./productTranslationService";

const LANGUAGE_NAMES: Record<string, string> = { nl: "Dutch (Nederlands)", en: "English" };
const JOB_KEY = "content_translation_job";
const CONFIG_PREFIX = "i18n:";

export type ContentType = "cmsPage" | "blog" | "category" | "megaMenu";

interface EntityDef {
  label: string;
  /** Plain text fields */
  text: string[];
  /** HTML (may contain [shortcodes]) */
  html: string[];
  /** JSON fields translated leaf by leaf */
  json: string[];
}

export const ENTITIES: Record<ContentType, EntityDef> = {
  cmsPage: { label: "CMS pages", text: ["title", "seoTitle", "seoDesc", "seoKeywords"], html: ["body"], json: [] },
  blog: { label: "Blogs", text: ["title", "excerpt", "seoTitle", "seoDescription", "seoKeywords"], html: ["body"], json: [] },
  category: { label: "Categories", text: ["name", "seoTitle", "seoDescription", "seoKeywords"], html: [], json: [] },
  megaMenu: { label: "Menus", text: ["menu"], html: [], json: ["sections"] },
};

/** CMS settings shown on the storefront (cms_config keys) */
export const CONFIG_KEYS = [
  "homepage_data",
  "header_footer_data",
  "store_features",
  "faq_data",
  "testimonials_data",
  "product_page_data",
  "relief_page_data",
  "landing_pages_data",
] as const;

const delegate = (type: ContentType): any =>
  ({ cmsPage: prisma.cmsPage, blog: prisma.blog, category: prisma.category, megaMenu: prisma.megaMenu })[type];

const fieldsOf = (type: ContentType) => [...ENTITIES[type].text, ...ENTITIES[type].html, ...ENTITIES[type].json];

const hashOf = (value: unknown) => crypto.createHash("sha1").update(JSON.stringify(value ?? null)).digest("hex");

const pickFields = (type: ContentType, row: Record<string, any>) =>
  Object.fromEntries(fieldsOf(type).map((f) => [f, row[f] ?? null]));

export const entityHash = (type: ContentType, row: Record<string, any>) => hashOf(pickFields(type, row));

const translationsOf = (row: { translations?: unknown }): Record<string, any> =>
  row?.translations && typeof row.translations === "object" && !Array.isArray(row.translations) ? (row.translations as any) : {};

// ---------------------------------------------------------------- what is translatable text

/** Keys whose string values are never text (ids, links, images, settings) */
const NON_TEXT_KEYS = new Set([
  "id", "slug", "link", "url", "href", "to", "path", "icon", "image", "images", "img", "src", "logo", "cover",
  "background_image", "backgroundImage", "color", "colorCode", "bgColor", "textColor", "type", "variant", "style",
  "className", "date", "createdAt", "updatedAt", "categoryId", "productId", "email", "phone", "target", "rel",
  "key", "layout", "position", "align", "size", "status", "platform", "lang",
]);
/** Single words are translated only under these keys (menu labels, titles) */
const TEXT_KEYS = new Set([
  "title", "subtitle", "name", "label", "text", "description", "desc", "q", "a", "question", "answer", "menu",
  "brandText", "heading", "caption", "buttonText", "button_text", "content", "quote", "author", "role", "badge",
  "features", "tagline", "message", "cta", "placeholder",
]);

const looksLikeNonText = (v: string) =>
  /^(https?:|\/|#|mailto:|tel:|www\.)/i.test(v.trim()) ||
  /^#[0-9a-f]{3,8}$/i.test(v.trim()) ||
  /^\d{4}-\d{2}-\d{2}/.test(v.trim()) ||
  /^[a-z0-9]+([-_][a-z0-9]+)+$/.test(v.trim()) || // slugs / ids
  !/\p{L}/u.test(v);

const looksLikeHtml = (v: string) => /<\/?[a-z][^>]*>|\[[a-z][\w-]*[\s\]]/i.test(v);

// ---------------------------------------------------------------- AI calls

async function translateTexts(texts: string[], lang: string): Promise<string[]> {
  if (!texts.length) return [];
  const prompt = `Translate each string in the JSON array into ${LANGUAGE_NAMES[lang] || lang} for Schip & Ster, a premium lighting webshop.
- Some strings may already be in ${LANGUAGE_NAMES[lang] || lang}: return those unchanged.
- Natural, fluent webshop copy (not word-for-word). Keep brand, collection and model names, numbers, units, prices and codes unchanged.
- Keep any inline HTML tags exactly as they are.
- Return ONLY a JSON object {"items": [...]} with exactly ${texts.length} strings in the same order.

${JSON.stringify(texts)}`;
  const parsed = extractJson(await callGeminiWithFallback([{ text: prompt }], 0.2));
  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  if (items.length !== texts.length) throw new Error(`AI returned ${items.length} of ${texts.length} strings`);
  return items.map((v: unknown, i: number) => (typeof v === "string" && v.trim() ? v : texts[i]));
}

/** Everything in an HTML/shortcode document that must survive translation unchanged */
const TEXT_ATTRS = new Set([
  "title", "subtitle", "description", "alt", "placeholder", "primary_button_text", "secondary_button_text", "button_text",
  "label", "text", "heading", "caption", "badge", "cta", "tagline", "aria-label",
]);
function htmlSkeleton(html: string): string {
  const parts: string[] = [];
  const tagRe = /<\/?([a-z][a-z0-9-]*)([^>]*)>|\[(\/?)([a-z][\w-]*)([^\]]*)\]/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const name = (m[1] || `[${m[3]}${m[4]}`).toLowerCase();
    const attrs = m[2] ?? m[5] ?? "";
    const kept: string[] = [];
    const attrRe = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let a: RegExpExecArray | null;
    while ((a = attrRe.exec(attrs))) {
      const key = a[1].toLowerCase();
      if (!TEXT_ATTRS.has(key) && !/(^|_)(title|text|desc|description|subtitle|label|heading)(_\d+)?$/.test(key)) {
        kept.push(`${key}=${a[3] ?? a[4] ?? ""}`);
      }
    }
    parts.push(`${name}{${kept.join("|")}}`);
  }
  return parts.join(" ");
}

async function translateHtml(html: string, lang: string): Promise<string> {
  if (!html.trim()) return html;
  const prompt = `Translate the visible text of this webshop HTML into ${LANGUAGE_NAMES[lang] || lang}.
- If the text is already in ${LANGUAGE_NAMES[lang] || lang}, return the document unchanged.
- Keep every HTML tag, attribute, class, style, URL and image exactly as it is.
- The document contains shortcodes like [hero-banner title="..." background_image="..."][/hero-banner]: keep every shortcode, its name and its order; translate ONLY these attributes when present: title, subtitle, description, alt, *_text, title_N, desc_N, label, heading. Never change links, images, ids, numbers or slugs.
- Keep brand, collection and model names, prices and codes unchanged. Natural, fluent copy.
- Return ONLY a JSON object {"html": "..."}.

${JSON.stringify({ html })}`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const parsed = extractJson(await callGeminiWithFallback([{ text: prompt }], 0.2));
    const out = typeof parsed?.html === "string" ? parsed.html : "";
    if (out && htmlSkeleton(out) === htmlSkeleton(html)) return out;
    console.warn(`[ContentTranslate] HTML structure changed by AI (attempt ${attempt}), retrying`);
  }
  throw new Error("AI changed the HTML structure; translation rejected");
}

/** Walks a JSON value, translating text leaves in place; returns a new value */
/** Whether a string at key `k` is human-readable text (translated) or data (links, ids, icons…) */
function isTranslatableLeaf(k: string, node: string): boolean {
  if (NON_TEXT_KEYS.has(k) || !node.trim() || looksLikeNonText(node)) return false;
  // camelCase / snake_case text keys too: quoteButtonText, questionTitle, primary_button_text
  return TEXT_KEYS.has(k) || /(text|title|label|subtitle|description|name|heading|caption)$/i.test(k) || /\s/.test(node.trim());
}

type LeafPath = Array<string | number>;

/** Every translatable string in a JSON value with its path (same selection as translateJson) */
function collectLeaves(value: unknown): Array<{ path: LeafPath; text: string; html: boolean }> {
  const out: Array<{ path: LeafPath; text: string; html: boolean }> = [];
  const visit = (node: any, path: LeafPath, key: string) => {
    if (typeof node === "string") {
      if (isTranslatableLeaf(key, node)) out.push({ path, text: node, html: looksLikeHtml(node) });
      return;
    }
    if (Array.isArray(node)) node.forEach((child, i) => visit(child, [...path, i], key));
    else if (node && typeof node === "object") for (const [k, child] of Object.entries(node)) visit(child, [...path, k], k);
  };
  visit(value, [], "root");
  return out;
}

const getAt = (obj: any, path: LeafPath) => path.reduce((o, k) => (o == null ? undefined : o[k]), obj);
function setAt(obj: any, path: LeafPath, value: unknown) {
  let o = obj;
  for (let i = 0; i < path.length - 1; i++) o = o?.[path[i]];
  if (o && typeof o === "object") o[path[path.length - 1]] = value;
}

async function translateJson(value: unknown, lang: string): Promise<unknown> {
  const texts: string[] = [];
  const htmls: string[] = [];
  const clone = JSON.parse(JSON.stringify(value ?? null));
  const slots: Array<{ set: (v: string) => void; kind: "text" | "html"; index: number }> = [];

  const visit = (node: any, parent: any, key: string | number, parentKey: string) => {
    if (typeof node === "string") {
      const k = typeof key === "number" ? parentKey : key;
      if (!isTranslatableLeaf(k, node)) return;
      const set = (v: string) => (parent[key] = v);
      if (looksLikeHtml(node)) slots.push({ set, kind: "html", index: htmls.push(node) - 1 });
      else slots.push({ set, kind: "text", index: texts.push(node) - 1 });
      return;
    }
    if (Array.isArray(node)) node.forEach((child, i) => visit(child, node, i, typeof key === "number" ? parentKey : String(key)));
    else if (node && typeof node === "object") for (const [k, child] of Object.entries(node)) visit(child, node, k, k);
  };
  if (clone && typeof clone === "object") visit(clone, { root: clone }, "root", "root");
  else if (typeof clone === "string") return (await translateTexts([clone], lang))[0];

  const translatedTexts = await translateTexts(texts, lang);
  const translatedHtmls: string[] = [];
  for (const h of htmls) translatedHtmls.push(await translateHtml(h, lang));
  for (const slot of slots) slot.set(slot.kind === "text" ? translatedTexts[slot.index] : translatedHtmls[slot.index]);
  return clone;
}

// ---------------------------------------------------------------- entities

/** Translates the given fields of a row into one language */
async function translateFields(type: ContentType, row: Record<string, any>, fields: string[], lang: string) {
  const def = ENTITIES[type];
  const out: Record<string, any> = {};
  const textKeys = def.text.filter((f) => fields.includes(f) && typeof row[f] === "string" && row[f].trim());
  const texts = await translateTexts(textKeys.map((f) => row[f]), lang);
  textKeys.forEach((f, i) => (out[f] = texts[i]));
  for (const f of def.html) if (fields.includes(f) && typeof row[f] === "string" && row[f].trim()) out[f] = await translateHtml(row[f], lang);
  for (const f of def.json) if (fields.includes(f) && row[f] != null) out[f] = await translateJson(row[f], lang);
  return out;
}

/**
 * Translates a row into every storefront language. Each stored translation keeps a hash of every source field
 * (fieldHashes), so only fields that changed are sent to the AI again — editing an SEO title does not
 * re-translate a long page body.
 */
export async function translateEntity(type: ContentType, id: string, opts: { force?: boolean } = {}) {
  const row = await delegate(type).findUnique({ where: { id } });
  if (!row) return { translated: [] as string[] };
  const hash = entityHash(type, row);
  const map = { ...translationsOf(row) };
  const translated: string[] = [];
  for (const lang of STOREFRONT_LANGUAGES) {
    const prev = map[lang];
    if (!opts.force && prev?.sourceHash === hash) continue;
    const fieldHashes: Record<string, string> = Object.fromEntries(fieldsOf(type).map((f) => [f, hashOf(row[f] ?? null)]));
    const changed = fieldsOf(type).filter((f) => opts.force || !prev || prev.fieldHashes?.[f] !== fieldHashes[f]);
    const fresh = await translateFields(type, row, changed, lang);
    const kept = Object.fromEntries(fieldsOf(type).filter((f) => !changed.includes(f) && prev?.[f] != null).map((f) => [f, prev[f]]));
    map[lang] = { ...kept, ...fresh, fieldHashes, sourceHash: hash, translatedAt: new Date().toISOString() };
    translated.push(lang);
  }
  if (translated.length) await delegate(type).update({ where: { id }, data: { translations: map } });
  return { translated };
}

/**
 * Storefront copy of a row in the requested language: each field present in the row is replaced by its translation when that
 * translation was made from the current source text of that field; the raw blob is removed. Works for partial
 * selects (e.g. a blog list without bodies) too.
 */
export function localizeEntity<T extends Record<string, any>>(type: ContentType, row: T, lang: string | null): T {
  if (!row || typeof row !== "object") return row;
  const { translations, ...rest } = row as any;
  const tr = lang ? translationsOf({ translations })[lang] : undefined;
  if (!tr?.fieldHashes) return rest as T;
  const out: any = { ...rest };
  for (const f of fieldsOf(type)) {
    if (f in rest && tr[f] != null && tr[f] !== "" && tr.fieldHashes[f] === hashOf(rest[f] ?? null)) out[f] = tr[f];
  }
  return out as T;
}

/** Admin editor: translations of one row per language, with status (current / outdated / missing) */
export async function getEntityTranslations(type: ContentType, id: string) {
  const row = await delegate(type).findUnique({ where: { id } });
  if (!row) return null;
  const map = translationsOf(row);
  const hashes = Object.fromEntries(fieldsOf(type).map((f) => [f, hashOf(row[f] ?? null)]));
  const status = Object.fromEntries(
    STOREFRONT_LANGUAGES.map((lang) => {
      const tr = map[lang];
      if (!tr) return [lang, "missing"];
      const current = fieldsOf(type).every((f) => tr.fieldHashes?.[f] === hashes[f]);
      return [lang, current ? "current" : "outdated"];
    })
  );
  const translations = Object.fromEntries(
    STOREFRONT_LANGUAGES.filter((l) => map[l]).map((l) => [l, Object.fromEntries([...fieldsOf(type), "translatedAt", "manual"].map((f) => [f, map[l][f] ?? null]))])
  );
  return { languages: [...STOREFRONT_LANGUAGES], fields: ENTITIES[type], status, translations };
}

/** Hand-corrected translation for one language; counts as current for the source text it was made from */
export async function saveEntityTranslation(type: ContentType, id: string, lang: string, input: Record<string, any>) {
  if (!(STOREFRONT_LANGUAGES as readonly string[]).includes(lang)) throw new Error(`"${lang}" is not a storefront language`);
  const row = await delegate(type).findUnique({ where: { id } });
  if (!row) throw new Error("Not found");
  const map = { ...translationsOf(row) };
  const prev = map[lang] || {};
  const next: Record<string, any> = { ...prev };
  for (const f of [...ENTITIES[type].text, ...ENTITIES[type].html]) if (typeof input[f] === "string") next[f] = input[f];
  next.fieldHashes = Object.fromEntries(fieldsOf(type).map((f) => [f, hashOf(row[f] ?? null)]));
  next.sourceHash = entityHash(type, row);
  next.translatedAt = new Date().toISOString();
  next.manual = true;
  map[lang] = next;
  await delegate(type).update({ where: { id }, data: { translations: map } });
  return next;
}

// ---------------------------------------------------------------- CMS settings (cms_config)

export async function translateConfig(key: string, opts: { force?: boolean } = {}) {
  const row = await prisma.cmsConfig.findUnique({ where: { key } });
  if (!row) return { translated: [] as string[] };
  const hash = hashOf(row.value);
  const store = await prisma.cmsConfig.findUnique({ where: { key: CONFIG_PREFIX + key } });
  const map: Record<string, any> = { ...((store?.value as object) || {}) };
  const translated: string[] = [];
  for (const lang of STOREFRONT_LANGUAGES) {
    if (!opts.force && map[lang]?.sourceHash === hash) continue;
    map[lang] = { value: await translateJson(row.value, lang), sourceHash: hash, translatedAt: new Date().toISOString() };
    translated.push(lang);
  }
  if (translated.length) {
    await prisma.cmsConfig.upsert({ where: { key: CONFIG_PREFIX + key }, create: { key: CONFIG_PREFIX + key, value: map }, update: { value: map } });
  }
  return { translated };
}

/** Storefront value of a CMS setting in `lang` (current translation, else the source value) */
export async function localizedConfig<T>(key: string, value: T, lang: string | null): Promise<T> {
  if (!lang) return value;
  const store = await prisma.cmsConfig.findUnique({ where: { key: CONFIG_PREFIX + key } });
  const tr = (store?.value as any)?.[lang];
  return tr && tr.sourceHash === hashOf(value) ? (tr.value as T) : value;
}

/** Storefront language for content: any storefront language (content is mixed, so the source one too) */
export function contentLanguage(req: { headers: Record<string, unknown> }): string | null {
  const raw = String(req.headers["x-content-language"] || "").split(/[-_,;]/)[0].trim().toLowerCase();
  return (STOREFRONT_LANGUAGES as readonly string[]).includes(raw) ? raw : null;
}

// ---------------------------------------------------------------- line-by-line editor (settings, menus)

/**
 * A JSON-shaped source ("config:homepage_data" or "megaMenu:<id>") with its translations, for the admin editor
 * that lists every text line: original + translation per language.
 */
async function loadLeafTarget(target: string) {
  const [kind, ...rest] = target.split(":");
  const ref = rest.join(":");
  if (kind === "config") {
    if (!(CONFIG_KEYS as readonly string[]).includes(ref)) throw new Error("Unknown setting");
    const row = await prisma.cmsConfig.findUnique({ where: { key: ref } });
    const store = await prisma.cmsConfig.findUnique({ where: { key: CONFIG_PREFIX + ref } });
    const map: Record<string, any> = { ...((store?.value as object) || {}) };
    const source = row?.value ?? null;
    return {
      source,
      translated: (lang: string) => map[lang]?.value,
      isCurrent: (lang: string) => map[lang]?.sourceHash === hashOf(source),
      manual: (lang: string) => Boolean(map[lang]?.manual),
      translatedAt: (lang: string) => map[lang]?.translatedAt || null,
      save: async (lang: string, value: unknown) => {
        map[lang] = { value, sourceHash: hashOf(source), translatedAt: new Date().toISOString(), manual: true };
        await prisma.cmsConfig.upsert({ where: { key: CONFIG_PREFIX + ref }, create: { key: CONFIG_PREFIX + ref, value: map }, update: { value: map } });
      },
    };
  }
  if (kind === "megaMenu") {
    const row: any = await prisma.megaMenu.findUnique({ where: { id: ref } });
    if (!row) throw new Error("Menu not found");
    const map = { ...translationsOf(row) };
    const source = { menu: row.menu, sections: row.sections };
    const hashes = Object.fromEntries(fieldsOf("megaMenu").map((f) => [f, hashOf(row[f] ?? null)]));
    return {
      source,
      translated: (lang: string) => (map[lang] ? { menu: map[lang].menu ?? row.menu, sections: map[lang].sections ?? row.sections } : undefined),
      isCurrent: (lang: string) => fieldsOf("megaMenu").every((f) => map[lang]?.fieldHashes?.[f] === hashes[f]),
      manual: (lang: string) => Boolean(map[lang]?.manual),
      translatedAt: (lang: string) => map[lang]?.translatedAt || null,
      save: async (lang: string, value: any) => {
        map[lang] = { ...map[lang], menu: value.menu, sections: value.sections, fieldHashes: hashes, sourceHash: entityHash("megaMenu", row), translatedAt: new Date().toISOString(), manual: true };
        await prisma.megaMenu.update({ where: { id: ref }, data: { translations: map } });
      },
    };
  }
  throw new Error("Unknown translation target");
}

export async function getLeafTranslations(target: string) {
  const t = await loadLeafTarget(target);
  const leaves = collectLeaves(t.source);
  const languages = [...STOREFRONT_LANGUAGES];
  return {
    languages,
    status: Object.fromEntries(languages.map((l) => [l, !t.translated(l) ? "missing" : t.isCurrent(l) ? "current" : "outdated"])),
    manual: Object.fromEntries(languages.map((l) => [l, t.manual(l)])),
    translatedAt: Object.fromEntries(languages.map((l) => [l, t.translatedAt(l)])),
    leaves: leaves.map((leaf) => ({
      key: JSON.stringify(leaf.path),
      text: leaf.text,
      html: leaf.html,
      // a translation from another source structure has nothing usable at this path
      ...Object.fromEntries(languages.map((l) => {
        const v = getAt(t.translated(l), leaf.path);
        return [l, typeof v === "string" ? v : null];
      })),
    })),
  };
}

/** Saves hand-edited lines; lines not sent keep their current translation (or the original text) */
export async function saveLeafTranslations(target: string, lang: string, edits: Record<string, string>) {
  if (!(STOREFRONT_LANGUAGES as readonly string[]).includes(lang)) throw new Error(`"${lang}" is not a storefront language`);
  const t = await loadLeafTarget(target);
  const leaves = collectLeaves(t.source);
  const base = JSON.parse(JSON.stringify(t.source));
  const current = t.translated(lang);
  for (const leaf of leaves) {
    const key = JSON.stringify(leaf.path);
    const prev = getAt(current, leaf.path);
    const next = typeof edits[key] === "string" ? edits[key] : typeof prev === "string" ? prev : leaf.text;
    // HTML lines must keep their tags / shortcodes / links
    if (leaf.html && htmlSkeleton(next) !== htmlSkeleton(leaf.text)) {
      throw new Error("A text with HTML or shortcodes lost or changed its tags/links — only change the visible text");
    }
    setAt(base, leaf.path, next);
  }
  await t.save(lang, base);
  return { saved: true };
}

// ---------------------------------------------------------------- queue (after saves)

type Task = { kind: "entity"; type: ContentType; id: string } | { kind: "config"; key: string };
const queue: Task[] = [];
let draining = false;
const taskKey = (t: Task) => (t.kind === "entity" ? `${t.type}:${t.id}` : `config:${t.key}`);

async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (queue.length) {
      const task = queue.shift() as Task;
      try {
        const { translated } = task.kind === "entity" ? await translateEntity(task.type, task.id) : await translateConfig(task.key);
        if (translated.length) console.log(`[ContentTranslate] ${taskKey(task)} -> ${translated.join(", ")}`);
      } catch (err: any) {
        console.error(`[ContentTranslate] ${taskKey(task)} failed:`, err?.message || err);
      }
    }
  } finally {
    draining = false;
  }
}

function enqueue(task: Task) {
  if (queue.some((t) => taskKey(t) === taskKey(task))) return;
  queue.push(task);
  void drain();
}

export const enqueueEntityTranslation = (type: ContentType, id: string | undefined | null) => {
  if (id) enqueue({ kind: "entity", type, id });
};
export const enqueueConfigTranslation = (key: string) => {
  if ((CONFIG_KEYS as readonly string[]).includes(key)) enqueue({ kind: "config", key });
};

// ---------------------------------------------------------------- overview + "translate all" job

export async function contentOverview() {
  const groups: Array<{ id: string; label: string; total: number; current: number }> = [];
  for (const type of Object.keys(ENTITIES) as ContentType[]) {
    const rows: any[] = await delegate(type).findMany();
    const current = rows.filter((r) => STOREFRONT_LANGUAGES.every((l) => translationsOf(r)[l]?.sourceHash === entityHash(type, r))).length;
    groups.push({ id: type, label: ENTITIES[type].label, total: rows.length, current });
  }
  const configs = await prisma.cmsConfig.findMany({ where: { key: { in: [...CONFIG_KEYS] } } });
  const stores = await prisma.cmsConfig.findMany({ where: { key: { in: CONFIG_KEYS.map((k) => CONFIG_PREFIX + k) } } });
  const storeByKey = new Map(stores.map((s) => [s.key.slice(CONFIG_PREFIX.length), s.value as any]));
  const currentConfigs = configs.filter((c) => STOREFRONT_LANGUAGES.every((l) => storeByKey.get(c.key)?.[l]?.sourceHash === hashOf(c.value))).length;
  groups.push({ id: "config", label: "Site texts", total: configs.length, current: currentConfigs });
  return groups;
}

export interface ContentJob {
  status: "idle" | "running" | "completed" | "failed";
  total: number;
  done: number;
  translated: number;
  failed: number;
  current?: string;
  errors?: string[];
  startedAt?: string;
  finishedAt?: string;
}
const IDLE: ContentJob = { status: "idle", total: 0, done: 0, translated: 0, failed: 0 };
let jobRunning = false;

export async function getContentJob(): Promise<ContentJob> {
  const row = await prisma.cmsConfig.findUnique({ where: { key: JOB_KEY } });
  const job = { ...IDLE, ...((row?.value as object) || {}) } as ContentJob;
  if (job.status === "running" && !jobRunning) return { ...job, status: "failed", errors: [...(job.errors || []), "Interrupted by a server restart"] };
  return job;
}
const saveJob = (job: ContentJob) =>
  prisma.cmsConfig.upsert({ where: { key: JOB_KEY }, create: { key: JOB_KEY, value: job as any }, update: { value: job as any } });

export async function startContentJob(opts: { force?: boolean } = {}): Promise<boolean> {
  if (jobRunning) return false;
  jobRunning = true;
  void (async () => {
    const job: ContentJob = { ...IDLE, status: "running", startedAt: new Date().toISOString(), errors: [] };
    try {
      const tasks: Array<{ label: string; run: () => Promise<{ translated: string[] }> }> = [];
      for (const type of Object.keys(ENTITIES) as ContentType[]) {
        const rows: any[] = await delegate(type).findMany();
        for (const r of rows) {
          const current = STOREFRONT_LANGUAGES.every((l) => translationsOf(r)[l]?.sourceHash === entityHash(type, r));
          if (opts.force || !current) tasks.push({ label: `${ENTITIES[type].label}: ${r.title || r.name || r.menu || r.slug}`, run: () => translateEntity(type, r.id, opts) });
        }
      }
      for (const key of CONFIG_KEYS) tasks.push({ label: `Site texts: ${key}`, run: () => translateConfig(key, opts) });
      job.total = tasks.length;
      await saveJob(job);
      for (const task of tasks) {
        job.current = task.label;
        try {
          const { translated } = await task.run();
          if (translated.length) job.translated++;
        } catch (err: any) {
          job.failed++;
          job.errors = [...(job.errors || []), `${task.label}: ${err?.message || err}`].slice(-20);
        }
        job.done++;
        await saveJob(job);
      }
      Object.assign(job, { status: "completed", current: undefined, finishedAt: new Date().toISOString() });
    } catch (err: any) {
      Object.assign(job, { status: "failed", finishedAt: new Date().toISOString(), errors: [...(job.errors || []), err?.message || String(err)] });
    } finally {
      jobRunning = false;
      await saveJob(job).catch(() => undefined);
    }
  })();
  return true;
}

// exported for tests
export const __test = { translateJson, translateHtml, htmlSkeleton, looksLikeNonText };
