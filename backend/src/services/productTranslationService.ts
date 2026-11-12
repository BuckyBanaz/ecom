/**
 * AI translations of product content, stored in `products.translations`:
 *   { en: { name, shortDescription, description, specs, seoTitle, seoDescription, seoKeywords,
 *           sourceHash, translatedAt, manual } }
 * The source language is the AI output language (Admin → AI Brain); every other storefront language is a
 * target. A translation is redone only when the source content changed (sourceHash), so re-saving a product
 * costs nothing.
 */
import crypto from "crypto";
import { prisma } from "../config/db";
import { callGeminiWithFallback, extractJson } from "./aiService";
import { getAiOutputLanguage, type AiOutputLanguage } from "../utils/aiLanguage";

/** Languages the storefront can show */
export const STOREFRONT_LANGUAGES = ["nl", "en"] as const;
export type StorefrontLanguage = (typeof STOREFRONT_LANGUAGES)[number];

const LANGUAGE_NAMES: Record<string, string> = { nl: "Dutch (Nederlands)", en: "English", de: "German", fr: "French" };
const JOB_KEY = "product_translation_job";

export interface SpecRow {
  key: string;
  value: string;
  link?: string;
}

export interface ProductTranslation {
  name: string;
  shortDescription: string;
  description: string;
  specs: SpecRow[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  sourceHash: string;
  translatedAt: string;
  /** Edited by hand in the admin; kept until the source content changes */
  manual?: boolean;
}

export type TranslationMap = Partial<Record<string, ProductTranslation>>;

type SourceProduct = {
  id: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  specs: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  translations?: unknown;
};

export const sourceLanguage = (): AiOutputLanguage => getAiOutputLanguage();
export const targetLanguages = (): string[] => STOREFRONT_LANGUAGES.filter((l) => l !== sourceLanguage());

export function specRows(specs: unknown): SpecRow[] {
  if (Array.isArray(specs)) {
    return specs
      .filter((s: any) => s && String(s.key ?? "").trim())
      .map((s: any) => ({ key: String(s.key), value: String(s.value ?? ""), ...(s.link ? { link: String(s.link) } : {}) }));
  }
  if (specs && typeof specs === "object") {
    return Object.entries(specs as Record<string, unknown>).map(([key, value]) => ({ key, value: String(value ?? "") }));
  }
  return [];
}

function sourceFields(p: SourceProduct) {
  return {
    name: p.name || "",
    shortDescription: p.shortDescription || "",
    description: p.description || "",
    specs: specRows(p.specs).map(({ key, value }) => ({ key, value })),
    seoTitle: p.seoTitle || "",
    seoDescription: p.seoDescription || "",
    seoKeywords: p.seoKeywords || "",
  };
}

export const sourceHash = (p: SourceProduct) =>
  crypto.createHash("sha1").update(JSON.stringify(sourceFields(p))).digest("hex");

export const translationsOf = (p: { translations?: unknown }): TranslationMap =>
  p.translations && typeof p.translations === "object" && !Array.isArray(p.translations) ? (p.translations as TranslationMap) : {};

/** Status per target language: missing / outdated (source changed since) / current */
export function translationStatus(p: SourceProduct): Record<string, "missing" | "outdated" | "current"> {
  const hash = sourceHash(p);
  const map = translationsOf(p);
  return Object.fromEntries(
    targetLanguages().map((lang) => [lang, !map[lang] ? "missing" : map[lang]!.sourceHash === hash ? "current" : "outdated"])
  );
}

// ---------------------------------------------------------------- AI translation

async function aiTranslate(fields: ReturnType<typeof sourceFields>, from: string, to: string) {
  const prompt = `You translate product content for Schip & Ster, a premium lighting webshop in the Netherlands.
Translate the JSON values below from ${LANGUAGE_NAMES[from] || from} to ${LANGUAGE_NAMES[to] || to}.

RULES:
- Natural, fluent e-commerce copy in ${LANGUAGE_NAMES[to] || to}, as a native copywriter would write it. Not word-for-word.
- Keep brand, collection and model names exactly as written (e.g. "Schip & Ster", "Ambiance Royale", "Miami Orbit", "Stockholm").
- Keep numbers, units, sizes and codes unchanged (e.g. "Ø45cm", "2700K", "E27", "G9", "IP44", "L100").
- "description" is HTML: keep every tag and attribute exactly as it is, translate only the visible text. Translate headings such as "Belangrijkste kenmerken" too.
- "specs": return exactly ${fields.specs.length} rows in the same order; translate both "key" and "value".
- "seoTitle" max 60 characters, "seoDescription" max 160 characters. "seoKeywords" stays a comma-separated list.
- Empty strings stay empty.

Return ONLY a JSON object with exactly these keys: name, shortDescription, description, specs, seoTitle, seoDescription, seoKeywords.

${JSON.stringify(fields)}`;
  const parsed = extractJson(await callGeminiWithFallback([{ text: prompt }], 0.2));
  const text = (v: unknown, fallback: string) => (typeof v === "string" && (v.trim() || !fallback) ? v.trim() : fallback);
  // Specs map back by position; a row the AI dropped keeps the source text rather than shifting the table
  const aiSpecs = Array.isArray(parsed.specs) ? parsed.specs : [];
  return {
    name: text(parsed.name, fields.name),
    shortDescription: text(parsed.shortDescription, fields.shortDescription),
    description: text(parsed.description, fields.description),
    specs: fields.specs.map((row, i) => ({
      key: text(aiSpecs[i]?.key, row.key),
      value: text(aiSpecs[i]?.value, row.value),
    })),
    seoTitle: text(parsed.seoTitle, fields.seoTitle),
    seoDescription: text(parsed.seoDescription, fields.seoDescription),
    seoKeywords: text(parsed.seoKeywords, fields.seoKeywords),
  };
}

const productSelect = {
  id: true, name: true, shortDescription: true, description: true, specs: true,
  seoTitle: true, seoDescription: true, seoKeywords: true, translations: true,
} as const;

/**
 * Translates one product into every target language whose translation is missing or outdated.
 * `force` redoes current (and manually edited) translations too.
 */
export async function translateProduct(productId: string, opts: { force?: boolean } = {}) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: productSelect });
  if (!product) return { translated: [] as string[], skipped: [] as string[] };
  const hash = sourceHash(product);
  const map = { ...translationsOf(product) };
  const translated: string[] = [];
  const skipped: string[] = [];
  const from = sourceLanguage();
  const fields = sourceFields(product);

  for (const lang of targetLanguages()) {
    if (!opts.force && map[lang]?.sourceHash === hash) {
      skipped.push(lang);
      continue;
    }
    // Keep the source spec links (URLs are not translated)
    const sourceLinks = specRows(product.specs).map((s) => s.link);
    const result = await aiTranslate(fields, from, lang);
    map[lang] = {
      ...result,
      specs: result.specs.map((s, i) => (sourceLinks[i] ? { ...s, link: sourceLinks[i] } : s)),
      sourceHash: hash,
      translatedAt: new Date().toISOString(),
      manual: false,
    };
    translated.push(lang);
  }

  if (translated.length) {
    // Write only the translations column: a concurrent admin save of the content must not be overwritten
    await prisma.product.update({ where: { id: productId }, data: { translations: map as any } });
    invalidateTranslationCounts();
  }
  return { translated, skipped };
}

/** Saves a hand-edited translation (admin "English" tab); stays until the source content changes */
export async function saveManualTranslation(productId: string, lang: string, input: Partial<ProductTranslation>) {
  if (!targetLanguages().includes(lang)) throw new Error(`"${lang}" is not a translation language`);
  const product = await prisma.product.findUnique({ where: { id: productId }, select: productSelect });
  if (!product) throw new Error("Product not found");
  const map = { ...translationsOf(product) };
  const current = map[lang];
  const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
  map[lang] = {
    name: str(input.name, current?.name),
    shortDescription: str(input.shortDescription, current?.shortDescription),
    description: str(input.description, current?.description),
    specs: Array.isArray(input.specs) ? specRows(input.specs) : current?.specs || [],
    seoTitle: str(input.seoTitle, current?.seoTitle),
    seoDescription: str(input.seoDescription, current?.seoDescription),
    seoKeywords: str(input.seoKeywords, current?.seoKeywords),
    sourceHash: sourceHash(product),
    translatedAt: new Date().toISOString(),
    manual: true,
  };
  await prisma.product.update({ where: { id: productId }, data: { translations: map as any } });
  invalidateTranslationCounts();
  return map[lang];
}

// ---------------------------------------------------------------- overview counts (cached)

export type TranslationCounts = { total: number; current: number; outdated: number; missing: number };
let countsCache: { at: number; value: TranslationCounts } | null = null;
const COUNTS_TTL_MS = 60_000;

/** Any product content / translation change makes the cached counts stale */
export const invalidateTranslationCounts = () => {
  countsCache = null;
};

/**
 * How many products are translated / outdated / missing. Needs every product's full content (to hash it),
 * so the result is cached for a minute instead of being recomputed on every products page view.
 */
export async function productTranslationCounts(): Promise<TranslationCounts> {
  if (countsCache && Date.now() - countsCache.at < COUNTS_TTL_MS) return countsCache.value;
  const products = await prisma.product.findMany({ select: productSelect });
  const value: TranslationCounts = { total: products.length, current: 0, outdated: 0, missing: 0 };
  for (const p of products) {
    const states = Object.values(translationStatus(p));
    if (states.includes("missing")) value.missing++;
    else if (states.includes("outdated")) value.outdated++;
    else value.current++;
  }
  countsCache = { at: Date.now(), value };
  return value;
}

// ---------------------------------------------------------------- auto queue (after a product save)

type QueueItem = { kind: "product" | "draft"; id: string };
const queue: QueueItem[] = [];
let draining = false;
/** Products wait this long before translating: several quick saves (or a draft publish that copies the draft's
 *  translation right after creating the product) then cost one AI call or none. */
const PRODUCT_DEBOUNCE_MS = 5_000;
const pendingProducts = new Map<string, NodeJS.Timeout>();

async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (queue.length) {
      const item = queue.shift() as QueueItem;
      try {
        const { translated } = item.kind === "product" ? await translateProduct(item.id) : await translateDraft(item.id);
        if (translated.length) console.log(`[Translate] ${item.kind} ${item.id} -> ${translated.join(", ")}`);
      } catch (err: any) {
        console.error(`[Translate] ${item.kind} ${item.id} failed:`, err?.message || err);
      }
    }
  } finally {
    draining = false;
  }
}

function push(item: QueueItem) {
  if (queue.some((q) => q.kind === item.kind && q.id === item.id)) return;
  queue.push(item);
  void drain();
}

/** Fire-and-forget: translate after a save without slowing the admin down. One item at a time. */
export function enqueueProductTranslation(productId: string) {
  invalidateTranslationCounts();
  if (!productId) return;
  clearTimeout(pendingProducts.get(productId));
  const timer = setTimeout(() => {
    pendingProducts.delete(productId);
    push({ kind: "product", id: productId });
  }, PRODUCT_DEBOUNCE_MS);
  timer.unref?.();
  pendingProducts.set(productId, timer);
}

export function enqueueDraftTranslation(draftId: string) {
  if (draftId) push({ kind: "draft", id: draftId });
}

// ---------------------------------------------------------------- Quick Add drafts

const draftPayload = (payload: unknown): Record<string, any> =>
  payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, any>) : {};

/** Draft payload in the shape the hash / AI functions expect */
const draftAsProduct = (id: string, p: Record<string, any>): SourceProduct => ({
  id,
  name: String(p.name || ""),
  shortDescription: p.shortDescription ?? null,
  description: p.description ?? null,
  specs: p.specs,
  seoTitle: p.seoTitle ?? null,
  seoDescription: p.seoDescription ?? null,
  seoKeywords: p.seoKeywords ?? null,
  translations: p.translations,
});

/** Quick Add drafts get their translation right away (stored in payload.translations), so the admin can review
 *  the English before publishing and the publish copies it to the product. */
export async function translateDraft(draftId: string, opts: { force?: boolean } = {}) {
  const draft = await prisma.productDraft.findUnique({ where: { id: draftId } });
  if (!draft || draft.status !== "draft") return { translated: [] as string[] };
  const payload = draftPayload(draft.payload);
  const source = draftAsProduct(draftId, payload);
  if (!source.name) return { translated: [] as string[] };
  const hash = sourceHash(source);
  const map = { ...translationsOf(source) };
  const translated: string[] = [];
  const fields = sourceFields(source);
  const links = specRows(source.specs).map((s) => s.link);
  for (const lang of targetLanguages()) {
    if (!opts.force && map[lang]?.sourceHash === hash) continue;
    const result = await aiTranslate(fields, sourceLanguage(), lang);
    map[lang] = {
      ...result,
      specs: result.specs.map((s, i) => (links[i] ? { ...s, link: links[i] } : s)),
      sourceHash: hash,
      translatedAt: new Date().toISOString(),
      manual: false,
    };
    translated.push(lang);
  }
  if (translated.length) {
    // Re-read: the draft may have changed while the AI was busy; only the translations key is written
    const fresh = await prisma.productDraft.findUnique({ where: { id: draftId } });
    if (fresh) {
      await prisma.productDraft.update({ where: { id: draftId }, data: { payload: { ...draftPayload(fresh.payload), translations: map } as any } });
    }
  }
  return { translated };
}

export async function getDraftTranslations(draftId: string) {
  const draft = await prisma.productDraft.findUnique({ where: { id: draftId } });
  if (!draft) return null;
  const source = draftAsProduct(draftId, draftPayload(draft.payload));
  return { status: translationStatus(source), translations: translationsOf(source) };
}

export async function saveDraftTranslation(draftId: string, lang: string, input: Partial<ProductTranslation>) {
  if (!targetLanguages().includes(lang)) throw new Error(`"${lang}" is not a translation language`);
  const draft = await prisma.productDraft.findUnique({ where: { id: draftId } });
  if (!draft) throw new Error("Draft not found");
  const payload = draftPayload(draft.payload);
  const source = draftAsProduct(draftId, payload);
  const current = translationsOf(source)[lang];
  const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
  const translation: ProductTranslation = {
    name: str(input.name, current?.name),
    shortDescription: str(input.shortDescription, current?.shortDescription),
    description: str(input.description, current?.description),
    specs: Array.isArray(input.specs) ? specRows(input.specs) : current?.specs || [],
    seoTitle: str(input.seoTitle, current?.seoTitle),
    seoDescription: str(input.seoDescription, current?.seoDescription),
    seoKeywords: str(input.seoKeywords, current?.seoKeywords),
    sourceHash: sourceHash(source),
    translatedAt: new Date().toISOString(),
    manual: true,
  };
  await prisma.productDraft.update({
    where: { id: draftId },
    data: { payload: { ...payload, translations: { ...translationsOf(source), [lang]: translation } } as any },
  });
  return translation;
}

/** Draft published as `productId`: give the product the draft's translations (still re-checked by hash) */
export async function copyDraftTranslations(draftId: string, productId: string) {
  const draft = await prisma.productDraft.findUnique({ where: { id: draftId } });
  const map = translationsOf({ translations: draftPayload(draft?.payload).translations });
  if (!Object.keys(map).length) return false;
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { translations: true } });
  if (!product || Object.keys(translationsOf(product)).length) return false;
  await prisma.product.update({ where: { id: productId }, data: { translations: map as any } });
  invalidateTranslationCounts();
  return true;
}

// ---------------------------------------------------------------- "translate all" background job

export interface TranslationJob {
  status: "idle" | "running" | "completed" | "failed";
  total: number;
  done: number;
  translated: number;
  skipped: number;
  failed: number;
  current?: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

const IDLE_JOB: TranslationJob = { status: "idle", total: 0, done: 0, translated: 0, skipped: 0, failed: 0 };
let jobRunning = false;

export async function getTranslationJob(): Promise<TranslationJob> {
  const row = await prisma.cmsConfig.findUnique({ where: { key: JOB_KEY } });
  const job = { ...IDLE_JOB, ...((row?.value as object) || {}) } as TranslationJob;
  // A "running" job without a live worker was cut off by a restart
  if (job.status === "running" && !jobRunning) return { ...job, status: "failed", error: job.error || "Interrupted by a server restart" };
  return job;
}

const saveJob = (job: TranslationJob) =>
  prisma.cmsConfig.upsert({ where: { key: JOB_KEY }, create: { key: JOB_KEY, value: job as any }, update: { value: job as any } });

/** Translates every product that has a missing/outdated translation. Returns false if already running. */
export async function startTranslateAllJob(opts: { force?: boolean } = {}): Promise<boolean> {
  if (jobRunning) return false;
  jobRunning = true;
  void (async () => {
    const job: TranslationJob = { ...IDLE_JOB, status: "running", startedAt: new Date().toISOString() };
    try {
      const products = await prisma.product.findMany({ select: productSelect, orderBy: { createdAt: "desc" } });
      const todo = opts.force ? products : products.filter((p) => Object.values(translationStatus(p)).some((s) => s !== "current"));
      job.total = todo.length;
      job.skipped = products.length - todo.length;
      await saveJob(job);
      for (const p of todo) {
        job.current = p.name;
        try {
          const { translated } = await translateProduct(p.id, { force: opts.force });
          if (translated.length) job.translated++;
          else job.skipped++;
        } catch (err: any) {
          job.failed++;
          console.error(`[Translate] ${p.name} failed:`, err?.message || err);
        }
        job.done++;
        await saveJob(job);
      }
      Object.assign(job, { status: "completed", current: undefined, finishedAt: new Date().toISOString() });
    } catch (err: any) {
      Object.assign(job, { status: "failed", error: err?.message || String(err), finishedAt: new Date().toISOString() });
    } finally {
      jobRunning = false;
      await saveJob(job).catch(() => undefined);
    }
  })();
  return true;
}

// ---------------------------------------------------------------- storefront

/** Language the storefront asked for (X-Content-Language header or ?lang=), when it is not the source */
export function requestedTranslationLanguage(req: { headers: Record<string, unknown>; query: Record<string, unknown> }): string | null {
  const raw = String(req.headers["x-content-language"] || req.query.lang || "").split(/[-_,;]/)[0].trim().toLowerCase();
  if (!raw || !(STOREFRONT_LANGUAGES as readonly string[]).includes(raw)) return null;
  return raw === sourceLanguage() ? null : raw;
}

/**
 * Storefront copy of a product in `lang`: content fields from the translation when one exists (source text
 * otherwise), and without the raw `translations` blob. Admin requests (no language) get the product unchanged.
 */
export function localizeProduct<T extends Record<string, any>>(product: T, lang: string | null, isStorefront: boolean): T {
  if (!product || typeof product !== "object") return product;
  if (!isStorefront) return product;
  const { translations, ...rest } = product as any;
  const tr = lang ? translationsOf({ translations })[lang] : undefined;
  if (!tr) return rest as T;
  const pick = (key: keyof ProductTranslation) => (key in rest && typeof tr[key] === "string" && (tr[key] as string).trim() ? tr[key] : rest[key]);
  return {
    ...rest,
    name: pick("name"),
    ...("shortDescription" in rest ? { shortDescription: pick("shortDescription") } : {}),
    ...("description" in rest ? { description: pick("description") } : {}),
    ...("seoTitle" in rest ? { seoTitle: pick("seoTitle") } : {}),
    ...("seoDescription" in rest ? { seoDescription: pick("seoDescription") } : {}),
    ...("seoKeywords" in rest ? { seoKeywords: pick("seoKeywords") } : {}),
    ...("specs" in rest && tr.specs?.length ? { specs: tr.specs } : {}),
  } as T;
}

// exported for tests
export const __test = { aiTranslate, sourceFields };
