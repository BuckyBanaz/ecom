import express from "express";
import { applyColorToTitle, detectProductColor, stripColorWords } from "../utils/productColor";
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
import { bulkOptimizeSeo, enqueueProductOptimizeHandler, enqueueBulkProductEditHandler, dismissSeoJobHandler, generateBlogWithAi, generateFaqsWithAi, getAutopilotConfig, getBlogTopicSuggestionsHandler, getCmsContextSummaryHandler, getInternalLinkSuggestionsHandler, applyInternalLinkSuggestionHandler, generateRobotsTxtHandler, generateLlmsTxtHandler, getRankTrackingHandler, getSearchConsoleOverviewHandler, getSearchConsoleStatusHandler, getSeoAudit, getSeoJobStatusHandler, getSeoPlaybookHandler, optimizeSeoEntity, runAutopilotNow, syncPlaybookToAllPages, syncRankTrackingHandler, updateAutopilotConfig, updateSeoPlaybookHandler } from "../controllers/aiSeoController";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

/** Product specs are stored as `{key: value}` or `[{key, value}]`; flatten to non-empty pairs */
function specEntries(specs: unknown): Array<[string, string]> {
  const pairs: Array<[unknown, unknown]> = Array.isArray(specs)
    ? specs.map((s: any) => [s?.key, s?.value])
    : specs && typeof specs === "object"
    ? Object.entries(specs as Record<string, unknown>)
    : [];
  return pairs
    .map(([k, v]) => [String(k ?? "").trim(), String(v ?? "").trim()] as [string, string])
    .filter(([k, v]) => k && v);
}

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

router.post("/products/check-duplicate", async (req, res) => {
  try {
    const { text } = req.body || {};
    const matches = await aiService.findDuplicateProducts(text || "");
    res.json({
      success: true,
      duplicateWarning: matches.length > 0,
      existingMatches: matches,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/products/:id/suggest-siblings", async (req, res) => {
  try {
    const productId = req.params.id;
    const mode = (req.query.mode as "color" | "size" | "all") || "all";
    const suggestions = await aiService.suggestSiblingsForProduct(productId, mode);
    res.json({ success: true, suggestions });
  } catch (error: any) {
    console.error("AI Sibling Suggestion Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/products/quick-add", upload.single("image"), async (req, res) => {
  try {
    const {
      hint,
      price,
      seriesName,
      category,
      categorySlug,
      imagePromptOverride,
      sizeGroupId,
      siblingGroupId,
      sizeLabel,
      color,
      specDiff,
      baseProductTitle,
      leaderColor,
      leaderCategory,
      linkedExistingProductId,
    } = req.body;
    // Filled from the linked store product when not given
    let brandName: string = req.body.brandName || "";
    const imageFile = req.file;

    if (imageFile) {
      console.log(`📷 Quick-add image: ${imageFile.size} bytes, ${imageFile.mimetype}`);
    } else if (hint) {
      console.warn("⚠️ Quick-add: no image uploaded — AI will invent product photos from text only");
    }

    if (!hint && !imageFile && !color && !specDiff && !sizeLabel && !linkedExistingProductId) {
      return res.status(400).json({ success: false, error: "Please provide either a hint, color, specs, an image, or a linked product." });
    }

    let leaderDraftTitle = (baseProductTitle || "").trim();
    let leaderCategoryVal = (leaderCategory || "").trim();
    let effectiveGroupId = siblingGroupId || sizeGroupId;
    let linkedProductRecord: any = null;

    // Check if user linked to an existing production/store product
    if (linkedExistingProductId) {
      try {
        const { prisma } = await import("../config/db");
        linkedProductRecord = await prisma.product.findUnique({
          where: { id: String(linkedExistingProductId) },
          include: { category: true, brand: true },
        });

        if (linkedProductRecord) {
          const targetGroupId = linkedProductRecord.colorGroupId || `grp-${linkedProductRecord.id}`;
          if (!linkedProductRecord.colorGroupId) {
            await prisma.product.update({
              where: { id: linkedProductRecord.id },
              data: { colorGroupId: targetGroupId },
            });
            linkedProductRecord.colorGroupId = targetGroupId;
          }
          effectiveGroupId = targetGroupId;
          if (!leaderDraftTitle) {
            leaderDraftTitle = linkedProductRecord.name;
          }
          if (!leaderCategoryVal && linkedProductRecord.category?.slug) {
            leaderCategoryVal = linkedProductRecord.category.slug;
          }
          if (!brandName && linkedProductRecord.brand?.name) {
            brandName = linkedProductRecord.brand.name;
          }
        }
      } catch (err) {
        console.error("Error looking up linked existing product:", err);
      }
    }

    // Check if an earlier sibling in this group was already generated (use it as template leader)
    if (!leaderDraftTitle && effectiveGroupId) {
      try {
        const { prisma } = await import("../config/db");
        const existingDrafts = await prisma.productDraft.findMany({
          where: { status: "draft" },
          orderBy: { createdAt: "desc" },
          take: 30,
        });
        const match = existingDrafts.find((d: any) => {
          const p = (d.payload || {}) as Record<string, any>;
          return (
            p.colorGroupId === effectiveGroupId ||
            p.siblingGroupId === effectiveGroupId ||
            p.sizeGroupId === effectiveGroupId
          );
        });
        if (match) {
          const p = (match.payload || {}) as Record<string, any>;
          leaderDraftTitle = match.name || p.name || "";
          if (!leaderCategoryVal && p.category) {
            leaderCategoryVal = p.category;
          }
        }
      } catch (err) {
        console.error("Error looking up group leader draft:", err);
      }
    }

    // Build rich prompt hint incorporating specific color, dimensions, and custom specs
    let effectiveHint = (hint || "").trim();
    // This variant's own colour ("This we have Gold color"); linked siblings used to inherit the leader's
    // colour because the leader's full title (incl. "Zwart") was handed over as the exact title to copy
    const variantColor = detectProductColor(color) ?? detectProductColor(hint);
    if (leaderDraftTitle) {
      const baseModelTitle = stripColorWords(leaderDraftTitle);
      const colorRule = variantColor
        ? `COLOUR: this variant is "${variantColor.title}". Use "${variantColor.title}" as the colour in the title, specs and attributes.`
        : "COLOUR: take this variant's colour from its own photo and the notes below.";
      effectiveHint = `[LINKED VARIANT MANDATORY RULE]: This product is a colour/size variant of the base model "${baseModelTitle}".
Keep the SAME collection name, model name and title structure as "${baseModelTitle}". Do NOT invent a different model name!
${colorRule} NEVER copy the colour of the base model or of other variants.
${effectiveHint}`;
    }
    // Linked store product = reference: same model, so its specs (minus colour) and description carry over
    if (linkedProductRecord) {
      const refSpecs = specEntries(linkedProductRecord.specs)
        .filter(([key]) => !/kleur|colou?r/i.test(key) || /licht/i.test(key))
        .map(([key, value]) => `- ${key}: ${value}`)
        .join("\n");
      const refDescription = String(linkedProductRecord.shortDescription || "").trim().slice(0, 600);
      if (refSpecs || refDescription) {
        effectiveHint = `${effectiveHint}
[REFERENCE PRODUCT "${stripColorWords(linkedProductRecord.name)}"]: use these as the base for this variant's specs and description. Only change what differs (colour, or what the notes/photo say).${refSpecs ? `\nSpecs:\n${refSpecs}` : ""}${refDescription ? `\nShort description: ${stripColorWords(refDescription)}` : ""}`;
      }
    }
    if (color && !effectiveHint.toLowerCase().includes(color.toLowerCase())) {
      effectiveHint = effectiveHint ? `${effectiveHint}\nKleur / Color: ${color}` : `Kleur / Color: ${color}`;
    }
    if (sizeLabel && !effectiveHint.toLowerCase().includes(sizeLabel.toLowerCase())) {
      effectiveHint = effectiveHint ? `${effectiveHint}\nMaat / Afmeting: ${sizeLabel}` : `Maat / Afmeting: ${sizeLabel}`;
    }
    if (specDiff) {
      effectiveHint = effectiveHint ? `${effectiveHint}\nSpecificaties / Variatie: ${specDiff}` : `Specificaties / Variatie: ${specDiff}`;
    }

    const targetCategory = leaderCategoryVal || category || categorySlug || "";

    const draft = await aiService.quickAddProduct(
      imageFile,
      effectiveHint,
      price || (linkedProductRecord?.price ? String(linkedProductRecord.price) : ""),
      brandName || "",
      imagePromptOverride || "",
      seriesName || "",
      targetCategory
    );

    // Apply explicit Color
    if (color) {
      (draft as any).color = color;
      if (!Array.isArray((draft as any).specs)) (draft as any).specs = [];
      const existingKleurIdx = (draft as any).specs.findIndex((s: any) =>
        String(s?.key || "").toLowerCase().includes("kleur") || String(s?.key || "").toLowerCase().includes("color")
      );
      if (existingKleurIdx >= 0) {
        (draft as any).specs[existingKleurIdx].value = color;
      } else {
        (draft as any).specs.unshift({ key: "Kleur", value: color });
      }
      if (!(draft as any).attributes) (draft as any).attributes = {};
      (draft as any).attributes.color = [color];
    }

    // Colour from the hint is the truth: the AI (and its title-based colour guardrails) can still drift
    if (variantColor) {
      const d = draft as any;
      if (d.seoTitle) d.seoTitle = applyColorToTitle(String(d.seoTitle), variantColor);
      if (!color) {
        if (!Array.isArray(d.specs)) d.specs = [];
        const kleurIdx = d.specs.findIndex((s: any) => /kleur|colou?r/i.test(String(s?.key || "")) && !/licht/i.test(String(s?.key || "")));
        if (kleurIdx >= 0) d.specs[kleurIdx].value = variantColor.title;
        else d.specs.unshift({ key: "Kleur", value: variantColor.title });
        if (!d.attributes) d.attributes = {};
        if (variantColor.attribute) d.attributes.color = [variantColor.attribute];
      }
    }

    // Apply explicit Size
    if (sizeLabel) {
      if (!Array.isArray((draft as any).specs)) (draft as any).specs = [];
      const existingAfmIdx = (draft as any).specs.findIndex((s: any) =>
        String(s?.key || "").toLowerCase().includes("afmeting") ||
        String(s?.key || "").toLowerCase().includes("diameter") ||
        String(s?.key || "").toLowerCase().includes("maat") ||
        String(s?.key || "").toLowerCase().includes("size")
      );
      if (existingAfmIdx >= 0) {
        (draft as any).specs[existingAfmIdx].value = sizeLabel;
      } else {
        (draft as any).specs.unshift({ key: "Afmeting", value: sizeLabel });
      }
      if (!(draft as any).attributes) (draft as any).attributes = {};
      (draft as any).attributes.size = [sizeLabel];
    }

    // Apply explicit Specification Differences (only if formatted as Key: Value)
    if (specDiff) {
      if (!Array.isArray((draft as any).specs)) (draft as any).specs = [];
      const parts = String(specDiff).split(/[,;]/).map((p: string) => p.trim()).filter(Boolean);
      parts.forEach((p) => {
        if (p.includes(":")) {
          const [k, v] = p.split(":");
          if (k && v) {
            const cleanKey = k.trim();
            const cleanVal = v.trim();
            const existingIdx = (draft as any).specs.findIndex(
              (s: any) => String(s?.key || "").toLowerCase() === cleanKey.toLowerCase()
            );
            if (existingIdx >= 0) {
              (draft as any).specs[existingIdx].value = cleanVal;
            } else {
              (draft as any).specs.push({ key: cleanKey, value: cleanVal });
            }
          }
        }
      });
    }

    // Strip any generic dummy "Specificatie" or "Specification" keys
    if (Array.isArray((draft as any).specs)) {
      (draft as any).specs = (draft as any).specs.filter(
        (s: any) => s?.key && s.key.toLowerCase() !== "specificatie" && s.key.toLowerCase() !== "specification"
      );
    }

    // Ensure product name and slug reflect variation color and dimensions accurately
    if (draft) {
      // If a group leader title exists, ALWAYS use it as the master template!
      let updatedName = (leaderDraftTitle && leaderDraftTitle.trim()) ? leaderDraftTitle.trim() : (draft.name || "");

      // Siblings share the leader title, so the colour word must be swapped for this variant's own colour
      // (from the hint, or the legacy colour field); a title without a colour word gets it appended
      if (variantColor) {
        updatedName = detectProductColor(updatedName)
          ? applyColorToTitle(updatedName, variantColor)
          : `${updatedName} - ${variantColor.title}`;
      } else if (color && !updatedName.toLowerCase().includes(String(color).toLowerCase())) {
        updatedName = `${updatedName} - ${color}`;
      }

      if (sizeLabel) {
        const dimensionPattern = /(?:Ø\s*\d+(?:[-/]\d+)?\s*(?:cm|mm)?|\b\d+(?:[-/]\d+)?\s*(?:cm|mm)\b|\b\d+\s*x\s*\d+(?:\s*x\s*\d+)?\s*(?:cm|mm)?|\b\d+[- ](?:ring|lichts|rings)\b|\b(?:extra\s+large|small|medium|large|xs|xl|xxl|xxxl|2xl|3xl|klein|groot|middel)\b)/i;
        if (dimensionPattern.test(updatedName) && !updatedName.toLowerCase().includes(sizeLabel.toLowerCase())) {
          updatedName = updatedName.replace(dimensionPattern, sizeLabel);
        } else if (!updatedName.toLowerCase().includes(sizeLabel.toLowerCase())) {
          updatedName = `${updatedName} (${sizeLabel})`;
        }
      }

      draft.name = updatedName;

      // Update slug so sibling variants have distinct SEO friendly URLs
      const newSlug = updatedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (newSlug) {
        (draft as any).slug = newSlug;
      }

      // Force consistent category across all siblings in this group
      if (leaderCategoryVal) {
        (draft as any).category = leaderCategoryVal;
      }
    }

    // Assign Sibling / Variant Group
    if (effectiveGroupId) {
      (draft as any).colorGroupId = effectiveGroupId;
      (draft as any).siblingGroupId = effectiveGroupId;
    }
    if (linkedProductRecord) {
      (draft as any).siblingProductIds = [linkedProductRecord.id];
    }

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
      let items: Array<{ hint?: string; price?: string; brandName?: string; seriesName?: string; category?: string }> = [];

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
            imagePromptOverride,
            row.seriesName || "",
            row.category || ""
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
router.post("/seo/product-optimize", enqueueProductOptimizeHandler);
router.post("/products/bulk-edit", enqueueBulkProductEditHandler);
router.post("/seo/bulk-edit", enqueueBulkProductEditHandler);
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
