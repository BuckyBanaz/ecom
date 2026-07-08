import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { aiService } from "../services/aiService";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";
import { getAiBulkLimit, getAiImageCount } from "../utils/aiLimits";
import { getAiOutputLanguage, getAiOutputLanguageLabel } from "../utils/aiLanguage";
import {
  listProductDrafts,
  getProductDraft,
  deleteProductDraft,
  markDraftPublished,
  saveProductDraft,
} from "../controllers/productDraftController";
import { bulkOptimizeSeo, dismissSeoJobHandler, generateBlogWithAi, generateFaqsWithAi, getAutopilotConfig, getBlogTopicSuggestionsHandler, getCmsContextSummaryHandler, getInternalLinkSuggestionsHandler, applyInternalLinkSuggestionHandler, generateRobotsTxtHandler, generateLlmsTxtHandler, getRankTrackingHandler, getSearchConsoleOverviewHandler, getSearchConsoleStatusHandler, getSeoAudit, getSeoJobStatusHandler, getSeoPlaybookHandler, optimizeSeoEntity, runAutopilotNow, syncPlaybookToAllPages, syncRankTrackingHandler, updateAutopilotConfig, updateSeoPlaybookHandler } from "../controllers/aiSeoController";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticateJWT, requireAdmin);

router.get("/limits", (_req, res) => {
  res.json({
    success: true,
    bulkLimit: getAiBulkLimit(),
    imageCount: getAiImageCount(),
    outputLanguage: getAiOutputLanguage(),
    outputLanguageLabel: getAiOutputLanguageLabel(),
  });
});

router.get("/drafts", listProductDrafts);
router.get("/drafts/:id", getProductDraft);
router.delete("/drafts/:id", deleteProductDraft);
router.patch("/drafts/:id/published", markDraftPublished);

router.post("/drafts/:id/regenerate-images", async (req, res) => {
  try {
    const draftId = req.params.id;
    const { prompt, index } = req.body || {};
    const newImages = await aiService.regenerateImagesForDraft(draftId, prompt, index);
    res.json({ success: true, images: newImages });
  } catch (error: any) {
    console.error("Draft image regeneration failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/products/:id/regenerate-images", async (req, res) => {
  try {
    const productId = req.params.id;
    const { prompt, index } = req.body || {};
    const newImages = await aiService.regenerateImagesForProduct(productId, prompt, index);
    res.json({ success: true, images: newImages });
  } catch (error: any) {
    console.error("Product image regeneration failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/products/quick-add", upload.single("image"), async (req, res) => {
  try {
    const { hint, price, brandName, imagePromptOverride } = req.body;
    const imageFile = req.file;

    if (imageFile) {
      console.log(`📷 Quick-add image: ${imageFile.size} bytes, ${imageFile.mimetype}`);
    } else if (hint) {
      console.warn("⚠️ Quick-add: no image uploaded — AI will invent product photos from text only");
    }

    if (!hint && !imageFile) {
      return res.status(400).json({ success: false, error: "Please provide either a hint or an image." });
    }

    const draft = await aiService.quickAddProduct(
      imageFile,
      hint || "",
      price || "",
      brandName || "",
      imagePromptOverride || ""
    );

    const saved = await saveProductDraft(draft, { createdBy: (req as any).user?.id });

    res.json({ success: true, draft, draftId: saved.id });
  } catch (error: any) {
    console.error("Quick Add Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** Bulk Quick Add — up to AI_BULK_LIMIT products (default 5) in one request */
router.post(
  "/products/bulk-quick-add",
  upload.any(),
  async (req, res) => {
    try {
      const bulkLimit = getAiBulkLimit();
      let items: Array<{ hint?: string; price?: string; brandName?: string }> = [];

      try {
        items = JSON.parse(req.body.items || "[]");
      } catch {
        return res.status(400).json({ success: false, error: "Invalid items JSON." });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: "Add at least one product row." });
      }

      if (items.length > bulkLimit) {
        return res.status(400).json({
          success: false,
          error: `Maximum ${bulkLimit} products per batch. Change limit in Admin → Settings → AI.`,
        });
      }

      const allFiles = (req.files as Express.Multer.File[]) || [];
      const imagePromptOverride = req.body.imagePromptOverride || "";
      const batchId = randomUUID();
      const userId = (req as any).user?.id;
      const results: Array<{ draftId?: string; draft?: unknown; error?: string; status: string }> = [];

      for (let i = 0; i < items.length; i++) {
        const row = items[i];
        const hint = (row.hint || "").trim();
        const imageFile =
          allFiles.find((f) => f.fieldname === `image_${i}`) ||
          allFiles.find((f) => f.fieldname === "images" && allFiles.indexOf(f) === i) ||
          null;

        if (!hint && !imageFile) {
          results.push({ status: "failed", error: "Row needs image or hint" });
          continue;
        }

        try {
          const draft = await aiService.quickAddProduct(
            imageFile,
            hint,
            row.price || "",
            row.brandName || "",
            imagePromptOverride
          );
          const saved = await saveProductDraft(draft, { batchId, createdBy: userId });
          results.push({ status: "draft", draftId: saved.id, draft });
        } catch (err: any) {
          const failed = await saveProductDraft(
            { hint, price: row.price, brandName: row.brandName },
            { batchId, createdBy: userId, error: err.message, status: "failed" }
          );
          results.push({ status: "failed", draftId: failed.id, error: err.message });
        }
      }

      const succeeded = results.filter((r) => r.status === "draft").length;
      res.json({
        success: true,
        batchId,
        total: items.length,
        succeeded,
        failed: items.length - succeeded,
        results,
      });
    } catch (error: any) {
      console.error("Bulk Quick Add Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get("/seo/audit", getSeoAudit);
router.get("/seo/playbook", getSeoPlaybookHandler);
router.put("/seo/playbook", updateSeoPlaybookHandler);
router.post("/seo/playbook/sync-all", syncPlaybookToAllPages);
router.post("/seo/optimize", optimizeSeoEntity);
router.post("/seo/bulk-optimize", bulkOptimizeSeo);
router.get("/seo/job", getSeoJobStatusHandler);
router.post("/seo/job/dismiss", dismissSeoJobHandler);
router.get("/seo/autopilot", getAutopilotConfig);
router.put("/seo/autopilot", updateAutopilotConfig);
router.post("/seo/autopilot/run", runAutopilotNow);
router.get("/seo/search-console/status", getSearchConsoleStatusHandler);
router.get("/seo/search-console/overview", getSearchConsoleOverviewHandler);
router.get("/seo/rank-tracking", getRankTrackingHandler);
router.post("/seo/rank-tracking/sync", syncRankTrackingHandler);
router.get("/seo/internal-links", getInternalLinkSuggestionsHandler);
router.post("/seo/internal-links/apply", applyInternalLinkSuggestionHandler);
router.post("/seo/generate-robots", generateRobotsTxtHandler);
router.post("/seo/generate-llms", generateLlmsTxtHandler);
router.get("/blogs/suggestions", getBlogTopicSuggestionsHandler);
router.post("/blogs/generate", generateBlogWithAi);
router.get("/cms/context", getCmsContextSummaryHandler);
router.post("/faqs/generate", generateFaqsWithAi);

router.post("/generate-return-email", async (req, res) => {
  try {
    const { prompt, resolutionType, customerName, orderNumber, reason } = req.body;
    if (!prompt || !resolutionType) {
      return res.status(400).json({ success: false, error: "Prompt and resolutionType are required." });
    }
    const generatedEmail = await aiService.generateReturnEmail({
      prompt,
      resolutionType,
      customerName,
      orderNumber,
      reason
    });
    res.json({ success: true, email: generatedEmail });
  } catch (error: any) {
    console.error("AI Return Email Generation Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/cms/generate", async (req, res) => {
  try {
    const { prompt, existingContent, existingSeo } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: "Prompt is required." });
    }

    const { htmlContent, seoTitle, seoDesc, seoKeywords } = await aiService.generateCmsPage(prompt, {
      existingContent: typeof existingContent === "string" ? existingContent : undefined,
      existingSeo:
        existingSeo && typeof existingSeo === "object"
          ? {
              seoTitle: existingSeo.seoTitle,
              seoDesc: existingSeo.seoDesc,
              seoKeywords: existingSeo.seoKeywords,
            }
          : undefined,
    });
    res.json({ success: true, htmlContent, seoTitle, seoDesc, seoKeywords });
  } catch (error: any) {
    console.error("CMS AI Generation Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
