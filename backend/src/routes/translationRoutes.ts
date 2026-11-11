import { Router, Request, Response, NextFunction } from "express";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";
import { prisma } from "../config/db";
import {
  getTranslationJob,
  saveManualTranslation,
  sourceLanguage,
  startTranslateAllJob,
  targetLanguages,
  translateProduct,
  translationStatus,
  translationsOf,
} from "../services/productTranslationService";
import { STOREFRONT_LANGUAGES } from "../services/productTranslationService";
import {
  CONFIG_KEYS,
  ENTITIES,
  type ContentType,
  contentOverview,
  getContentJob,
  startContentJob,
  translateConfig,
  translateEntity,
} from "../services/contentTranslationService";

/** AI content translations (products now; CMS pages and blogs later) — admin only */
const router = Router();
router.use(authenticateJWT, requireAdmin);

const productSelect = {
  id: true, name: true, shortDescription: true, description: true, specs: true,
  seoTitle: true, seoDescription: true, seoKeywords: true, translations: true,
} as const;

/** The admin edit URL may hold the id or the slug */
const findProduct = (idOrSlug: string) =>
  prisma.product.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] }, select: productSelect });

const wrap = (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) =>
  fn(req, res).catch(next);

// Overview + "translate all" job progress
router.get("/products/status", wrap(async (_req, res) => {
  const products = await prisma.product.findMany({ select: productSelect });
  const counts = { total: products.length, current: 0, outdated: 0, missing: 0 };
  for (const p of products) {
    const states = Object.values(translationStatus(p));
    if (states.includes("missing")) counts.missing++;
    else if (states.includes("outdated")) counts.outdated++;
    else counts.current++;
  }
  res.json({ success: true, source: sourceLanguage(), targets: targetLanguages(), counts, job: await getTranslationJob() });
}));

router.post("/products/translate-all", wrap(async (req, res) => {
  const started = await startTranslateAllJob({ force: req.body?.force === true });
  if (!started) {
    res.status(409).json({ success: false, message: "A translation job is already running" });
    return;
  }
  res.status(202).json({ success: true, job: await getTranslationJob() });
}));

// One product: its translations + status, re-translate, manual edit
router.get("/products/:id", wrap(async (req, res) => {
  const product = await findProduct(req.params.id);
  if (!product) {
    res.status(404).json({ success: false, message: "Product not found" });
    return;
  }
  res.json({
    success: true,
    source: sourceLanguage(),
    targets: targetLanguages(),
    status: translationStatus(product),
    translations: translationsOf(product),
  });
}));

router.post("/products/:id/translate", wrap(async (req, res) => {
  const found = await findProduct(req.params.id);
  if (!found) {
    res.status(404).json({ success: false, message: "Product not found" });
    return;
  }
  const result = await translateProduct(found.id, { force: true });
  const product = (await findProduct(found.id)) || found;
  res.json({ success: true, ...result, status: translationStatus(product), translations: translationsOf(product) });
}));

router.put("/products/:id/:lang", wrap(async (req, res) => {
  try {
    const found = await findProduct(req.params.id);
    if (!found) throw new Error("Product not found");
    const translation = await saveManualTranslation(found.id, req.params.lang, req.body || {});
    res.json({ success: true, translation });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err?.message || "Could not save translation" });
  }
}));

// ---------------------------------------------------------------- CMS pages, blogs, categories, menus, site texts

router.get("/content/status", wrap(async (_req, res) => {
  res.json({ success: true, languages: [...STOREFRONT_LANGUAGES], groups: await contentOverview(), job: await getContentJob() });
}));

router.post("/content/translate-all", wrap(async (req, res) => {
  const started = await startContentJob({ force: req.body?.force === true });
  if (!started) {
    res.status(409).json({ success: false, message: "A translation job is already running" });
    return;
  }
  res.status(202).json({ success: true, job: await getContentJob() });
}));

/** Re-translate one item now: /content/blog/<id>, /content/cmsPage/<id>, /content/config/homepage_data */
router.post("/content/:type/:id/translate", wrap(async (req, res) => {
  const { type, id } = req.params;
  if (type === "config") {
    if (!(CONFIG_KEYS as readonly string[]).includes(id)) {
      res.status(400).json({ success: false, message: "Unknown setting" });
      return;
    }
    res.json({ success: true, ...(await translateConfig(id, { force: true })) });
    return;
  }
  if (!(type in ENTITIES)) {
    res.status(400).json({ success: false, message: "Unknown content type" });
    return;
  }
  res.json({ success: true, ...(await translateEntity(type as ContentType, id, { force: true })) });
}));

export default router;
