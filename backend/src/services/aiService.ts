import { prisma } from "../config/db";
import fs from "fs";
import path from "path";
import { getAiImageCount } from "../utils/aiLimits";
import { buildAiLanguageInstruction, buildAiStoreRoleLine, getAiOutputLanguage } from "../utils/aiLanguage";
import {
  buildPlaybookPromptBlock,
  getSeoPlaybook,
  mergeGlobalKeywords,
  applyTitleTemplate,
} from "./seoPlaybookService";
import {
  buildCmsPageSystemPrompt,
  buildCmsPageUserMessage,
  sanitizeCmsAiHtml,
} from "../utils/cmsAiContent";
import { saveCompressedBlogCoverToDir, saveCompressedImageToDir } from "../utils/imageOptimize";
import { sanitizeRobotsTxt, normalizeRobotsTxtFromAi } from "../utils/robotsTxt";
import { unwrapAiPlainTextPayload } from "../utils/aiPlainTextOutput";
import { getSeoCanonicalBaseUrl } from "./settingsStore";

// ---------------------------------------------------------------------------
// Call Gemini via REST API (same approach as model listing, guaranteed to work)
// ---------------------------------------------------------------------------
async function callGeminiRest(
  modelName: string,
  parts: any[],
  temperature: number = 0.5
): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("Google Gemini API Key is not configured.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const body: any = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature,
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[${response.status} ${response.statusText}] ${errText}`);
  }

  const result: any = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini REST API.");
  return text;
}

// ---------------------------------------------------------------------------
// Try models in order until one works
// ---------------------------------------------------------------------------
async function callGeminiWithFallback(
  parts: any[],
  temperature: number = 0.5
): Promise<string> {
  // Build model list: user-selected first, then safe fallbacks
  const configured = process.env.AI_MODEL || "gemini-2.0-flash";
  const modelsToTry = [...new Set([
    configured,
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.5-flash",
    "gemini-2.5-flash-001",
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
  ])];

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      console.log(`🔄 Trying Gemini model: ${model}`);
      const text = await callGeminiRest(model, parts, temperature);
      console.log(`✅ Gemini model ${model} succeeded.`);
      return text;
    } catch (err: any) {
      console.warn(`⚠️  Model ${model} failed: ${err.message?.slice(0, 120)}`);
      lastError = err;
      // Only continue fallback on 404 / not-found errors
      if (!err.message?.includes("404") && !err.message?.includes("not found") && !err.message?.includes("Not Found")) {
        break;
      }
    }
  }
  throw new Error(`All Gemini models failed. Last error: ${lastError?.message}`);
}

// ---------------------------------------------------------------------------
// Gemini native image generation (reference photo → lifestyle scene, same product)
// Models: gemini-2.5-flash-image, gemini-2.5-flash-image-preview, etc.
// ---------------------------------------------------------------------------
async function callGeminiImageGeneration(
  productImageBuffer: Buffer,
  mimeType: string,
  prompt: string
): Promise<Buffer | null> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.warn("Gemini image gen skipped: no GOOGLE_API_KEY");
    return null;
  }

  const configured = process.env.AI_IMAGE_MODEL || "gemini-2.5-flash-image";
  const modelsToTry = [...new Set([
    configured,
    "gemini-2.5-flash-image",
    "gemini-2.5-flash-image-preview",
    "gemini-2.0-flash-preview-image-generation",
  ])];

  const parts = [
    {
      inlineData: {
        data: productImageBuffer.toString("base64"),
        mimeType: mimeType || "image/jpeg",
      },
    },
    { text: prompt },
  ];

  const generationConfig: Record<string, unknown> = {
    responseModalities: ["TEXT", "IMAGE"],
  };
  const aspectRatio = process.env.AI_IMAGE_ASPECT_RATIO;
  if (aspectRatio) {
    generationConfig.imageConfig = { aspectRatio };
  }

  for (const model of modelsToTry) {
    try {
      console.log(`🎨 Gemini image gen trying model: ${model}`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`⚠️  Gemini image ${model} failed: ${errText.slice(0, 200)}`);
        if (response.status === 404 || errText.includes("not found")) continue;
        continue;
      }

      const result: any = await response.json();
      const responseParts = result?.candidates?.[0]?.content?.parts || [];
      for (const part of responseParts) {
        if (part.inlineData?.data) {
          console.log(`✅ Gemini image generated with ${model}`);
          return Buffer.from(part.inlineData.data, "base64");
        }
      }
    } catch (err: any) {
      console.warn(`⚠️  Gemini image error (${model}):`, err.message?.slice(0, 120));
    }
  }

  return null;
}

async function generateTextToImage(prompt: string, filenamePrefix: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.warn("Blog cover image skipped: no GOOGLE_API_KEY");
    return null;
  }

  const aiImagesDir = path.join(__dirname, "../../public/uploads/ai-images");
  const aiImagesUrlPrefix = "/uploads/ai-images";
  if (!fs.existsSync(aiImagesDir)) fs.mkdirSync(aiImagesDir, { recursive: true });

  const configured = process.env.AI_IMAGE_MODEL || "gemini-2.5-flash-image";
  const modelsToTry = [...new Set([configured, "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"])];

  for (const model of modelsToTry) {
    try {
      console.log(`🎨 Blog cover trying model: ${model}`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      });
      if (!response.ok) continue;
      const result: any = await response.json();
      const parts = result?.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find((p: any) => p.inlineData?.data);
      if (!imgPart) continue;
      const saved = await saveCompressedBlogCoverToDir(
        Buffer.from(imgPart.inlineData.data, "base64"),
        aiImagesDir,
        aiImagesUrlPrefix,
        filenamePrefix,
      );
      console.log(`✅ Blog cover saved: ${saved.publicPath}`);
      return saved.publicPath;
    } catch (err: any) {
      console.warn(`⚠️  Blog cover ${model} failed:`, err.message?.slice(0, 100));
    }
  }
  return null;
}

function buildLifestylePrompt(productName: string, scene: string): string {
  return `You are creating a product gallery photo for an e-commerce lighting store.

REFERENCE IMAGE: The attached photo is the EXACT product being sold (${productName}).

CRITICAL RULES:
- Preserve this EXACT product with 100% fidelity — same shape, same materials, same colors, same decorative details (e.g. number of spheres on the base, shade shape and size).
- Do NOT redesign, simplify, or replace the product with a similar-looking lamp.
- The product in the output must be recognizably the same item as the reference photo.

TASK: Generate one photorealistic lifestyle image showing this EXACT product installed in: ${scene}

Style: warm evening indoor lighting, professional interior photography, European home, no text, no watermark, no people.`;
}

// ---------------------------------------------------------------------------
// Robust JSON extractor — handles markdown fences, trailing text, etc.
// ---------------------------------------------------------------------------
function extractJson(raw: string): any {
  // Remove markdown fences
  let text = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Try parsing directly first
  try { return JSON.parse(text); } catch (_) {}

  // Find the first { and match its closing }
  const start = text.indexOf("{");
  if (start === -1) throw new SyntaxError("No JSON object found in response");

  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
  }

  if (end === -1) throw new SyntaxError("Unterminated JSON object in response");
  return JSON.parse(text.slice(start, end + 1));
}

function stripPlainAiText(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:txt|text|markdown|robots|json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/** Fix UTF-8 punctuation shown as mojibake when em dash was saved wrong. */
function fixUtf8Mojibake(text: string): string {
  const emDash = String.fromCharCode(0x2014);
  const enDash = String.fromCharCode(0x2013);
  const leftQuote = String.fromCharCode(0x201c);
  const rightQuote = String.fromCharCode(0x201d);
  return text
    .replace(/\u00e2\u20ac[\u201c\u201d]/g, emDash)
    .replace(/\u00e2\u20ac\u0093/g, enDash)
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u20ac\u0153/g, leftQuote)
    .replace(/\u00e2\u20ac\u009d/g, rightQuote)
    .replace(/\u00c3\u00a9/g, "\u00e9")
    .replace(/\u00c3\u00ab/g, "\u00eb")
    .replace(/\u00c3\u00af/g, "\u00ef")
    .replace(/\u00c3\u00b6/g, "\u00f6");
}

/** Gemini sometimes wraps llms.txt in JSON — unwrap to plain markdown. */
function normalizeLlmsTxtOutput(raw: string, siteName: string): string {
  let text = fixUtf8Mojibake(unwrapAiPlainTextPayload(raw, ["llms_txt", "llms", "content", "text", "body"]));

  if (!text.startsWith("#")) {
    text = `# ${siteName}\n\n${text}`;
  }

  return text.endsWith("\n") ? text : `${text}\n`;
}

export const aiService = {
  async quickAddProduct(
    imageFile: any,
    hint: string,
    price: string,
    brandName: string,
    imagePromptOverride?: string
  ) {
    try {
      const imageCount = getAiImageCount();
      const defaultImagePrompt = process.env.AI_IMAGE_PROMPT || "in a clean modern aesthetic setting";
      const finalImageScene = imagePromptOverride?.trim() || defaultImagePrompt;

      // Fetch categories & attributes dynamically
      const categories = await prisma.category.findMany({ select: { slug: true, name: true } });
      const categorySlugs = categories.map(c => c.slug).join(", ");

      const attributes = await prisma.attribute.findMany({ include: { attributeValues: true } });

      const dynamicAttributesSchema: Record<string, any> = {};
      attributes.forEach(attr => {
        if (attr.type === "boolean") {
          dynamicAttributesSchema[attr.slug] = ["string array containing exactly 'Yes' or 'No'"];
        } else if (attr.type === "select") {
          const allowedVals = attr.attributeValues.map(v => v.value).join(", ");
          dynamicAttributesSchema[attr.slug] = [`string array containing one of exactly: ${allowedVals}`];
        } else {
          dynamicAttributesSchema[attr.slug] = [`string array of values for ${attr.name} in Title Case`];
        }
      });

      const userSystemPrompt = process.env.AI_SYSTEM_PROMPT || "You are an expert e-commerce catalog manager.";
      const languageInstruction = buildAiLanguageInstruction(getAiOutputLanguage());

      const promptText = `
        ${userSystemPrompt}

        ${languageInstruction}

        I am providing you with an image (if applicable) and a short descriptive hint, along with a target price and brand.
        
        Hint: ${hint}
        Price: ${price}
        Brand: ${brandName}

        Please extract and infer the complete product details to fill an e-commerce product form.
        Return ONLY a valid JSON object with the following structure, and nothing else (no markdown wrapping, no backticks).
        
        {
          "name": "Full product title",
          "shortDescription": "1-2 sentences summarizing the product",
          "description": "A detailed multi-paragraph description suitable for a product page.",
          "price": "number",
          "brand": "string",
          "category": "string (one of EXACTLY: ${categorySlugs})",
          "seoTitle": "A catchy SEO title for the product page (max 60 chars)",
          "seoDescription": "A compelling meta description for search engines (max 160 chars)",
          "seoKeywords": "comma separated keywords like 'modern, lighting, pendant'",
          "inStock": true,
          "attributes": ${JSON.stringify(dynamicAttributesSchema, null, 12).trim()},
          "specs": [
            { "key": "string", "value": "string" }
          ],
          "needsReview": ["array of keys like 'price', 'category' that you are unsure about"]
        }
      `;

      // Build parts — include image inline if uploaded
      const parts: any[] = [];
      if (imageFile) {
        parts.push({
          inlineData: {
            data: imageFile.buffer.toString("base64"),
            mimeType: imageFile.mimetype
          }
        });
      }
      parts.push({ text: promptText });

      const responseText = await callGeminiWithFallback(parts, 0.5);
      const parsedData = extractJson(responseText);

      // ── Image handling ────────────────────────────────────────────────────
      const aiImagesDir = path.join(__dirname, "../../public/uploads/ai-images");
      const aiImagesUrlPrefix = "/uploads/ai-images";
      if (!fs.existsSync(aiImagesDir)) fs.mkdirSync(aiImagesDir, { recursive: true });

      if (imageFile) {
        const cover = await saveCompressedImageToDir(
          imageFile.buffer,
          aiImagesDir,
          aiImagesUrlPrefix,
          "ai-product-cover",
        );
        parsedData.image = cover.publicPath;
        parsedData.images = [];

        const scene = finalImageScene;
        const productName = parsedData.name || hint || "lighting product";
        const lifestylePrompt = `Generate a photorealistic product photo of ${productName}. KEEP THE EXACT SAME PRODUCT DESIGN, SHAPE, AND COLORS AS THE PROVIDED REFERENCE IMAGE. Do not alter the product itself. Just place it in this setting: ${scene}. Professional e-commerce photography, high quality, no text, no watermark.`;

        console.log(`🎨 Generating up to ${imageCount} Gemini lifestyle image(s) from reference photo...`);

        for (let i = 0; i < imageCount; i++) {
          const imageBuffer = await callGeminiImageGeneration(
            imageFile.buffer,
            imageFile.mimetype,
            lifestylePrompt
          );
          if (!imageBuffer) continue;
          const saved = await saveCompressedImageToDir(
            imageBuffer,
            aiImagesDir,
            aiImagesUrlPrefix,
            `gemini-lifestyle-${i}`,
          );
          parsedData.images.push(saved.publicPath);
        }

        if (parsedData.images.length === 0) {
          console.warn("⚠️  Gemini lifestyle generation failed — using uploaded photo as cover only.");
          parsedData.images = [parsedData.image];
        } else {
          console.log(`✅ Gemini gallery: ${parsedData.images.length} image(s) from reference product.`);
        }
      } else {
        // No reference photo — Gemini text-to-image (still better than Pollinations)
        const productName = parsedData.name || hint || "lighting product";
        const scene = finalImageScene;
        const textOnlyPrompt = `Generate a photorealistic product photo of: ${productName}. Setting: ${scene}. Professional e-commerce photography, high quality, no text, no watermark.`;

        console.log(`🎨 No reference photo — Gemini text-to-image for "${productName}"`);

        const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;

        if (apiKey && imageCount > 0) {
          const configured = process.env.AI_IMAGE_MODEL || "gemini-2.5-flash-image";
          const modelsToTry = [...new Set([configured, "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"])];
          const urls: string[] = [];

          for (let i = 0; i < imageCount; i++) {
            for (const model of modelsToTry) {
              try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: textOnlyPrompt }] }],
                    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
                  }),
                });
                if (!response.ok) continue;
                const result: any = await response.json();
                const parts = result?.candidates?.[0]?.content?.parts || [];
                const imgPart = parts.find((p: any) => p.inlineData?.data);
                if (!imgPart) continue;
                const saved = await saveCompressedImageToDir(
                  Buffer.from(imgPart.inlineData.data, "base64"),
                  aiImagesDir,
                  aiImagesUrlPrefix,
                  `gemini-product-${i}`,
                );
                urls.push(saved.publicPath);
                break;
              } catch {
                /* try next model */
              }
            }
          }

          if (urls.length > 0) {
            parsedData.image = urls[0];
            parsedData.images = urls;
          }
        }
      }

      return parsedData;

    } catch (error) {
      console.error("AI Quick-Add Generation failed:", error);
      throw error;
    }
  },

  async regenerateImagesForDraft(draftId: string, overridePrompt?: string, imageIndex?: number): Promise<string[]> {
    const { prisma } = await import("../config/db");
    const draft = await prisma.productDraft.findUnique({ where: { id: draftId } });
    if (!draft) throw new Error("Draft not found");
    
    const payload = draft.payload as any;
    const productName = payload.name || "product";
    const imageCount = imageIndex !== undefined ? 1 : getAiImageCount();
    if (imageCount <= 0) return payload.images || [];

    const aiImagesDir = path.join(__dirname, "../../public/uploads/ai-images");
    const aiImagesUrlPrefix = "/uploads/ai-images";
    if (!fs.existsSync(aiImagesDir)) fs.mkdirSync(aiImagesDir, { recursive: true });

    let newImages: string[] = [];
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;

    let scene = process.env.AI_PRODUCT_SCENE || "A well-lit, modern European interior setting, softly styled, emphasizing quality and design.";
    if (overridePrompt) {
        scene = overridePrompt;
    }
    const textOnlyPrompt = `Generate a photorealistic product photo of: ${productName}. Setting: ${scene}. Professional e-commerce photography, high quality, no text, no watermark.`;

    let referenceImageBuffer: Buffer | null = null;
    let referenceMimeType = "image/jpeg";

    if (payload.image) {
      try {
        const publicPath = payload.image as string;
        const relativePath = publicPath.replace(/^\//, ""); 
        const absolutePath = path.join(__dirname, "../../public", relativePath);
        if (fs.existsSync(absolutePath)) {
          referenceImageBuffer = fs.readFileSync(absolutePath);
          if (absolutePath.toLowerCase().endsWith(".png")) referenceMimeType = "image/png";
          else if (absolutePath.toLowerCase().endsWith(".webp")) referenceMimeType = "image/webp";
        }
      } catch (e) {
        console.warn("Could not load reference image for regen", e);
      }
    }

    let visualDescription = "";
    if (referenceImageBuffer) {
      try {
        const visualPrompt = "Describe the physical product in this image in extreme detail so it can be accurately reproduced. Focus STRICTLY on its shape, structure, materials, colors, and unique design features (e.g., 'A floor lamp with a wavy/squiggly black metal stem, a white fabric cone shade, and a round black flat base'). Do not describe the background or setting. Keep it under 40 words.";
        const parts = [
          { inlineData: { data: referenceImageBuffer.toString("base64"), mimeType: referenceMimeType } },
          { text: visualPrompt }
        ];
        // Using callGeminiWithFallback which hits the vision model
        const res = await callGeminiWithFallback(parts, 0.2);
        if (res) {
          visualDescription = res.replace(/\*|#|`|_/g, "").trim();
          console.log("🎨 Extracted visual description:", visualDescription);
        }
      } catch (e) {
        console.warn("Failed to extract visual description", e);
      }
    }

    let lifestylePrompt = `Generate a photorealistic product photo of ${productName}. KEEP THE EXACT SAME PRODUCT DESIGN, SHAPE, AND COLORS AS THE PROVIDED REFERENCE IMAGE. Do not alter the product itself. Just place it in this setting: ${scene}.`;
    if (visualDescription) {
        lifestylePrompt = `Generate a photorealistic product photo of a ${visualDescription}. KEEP THE EXACT SAME PRODUCT DESIGN, SHAPE, AND DETAILS AS THE PROVIDED REFERENCE IMAGE. Do not alter the product itself, only change the background. Setting: ${scene}. Professional e-commerce photography, high quality, no text, no watermark.`;
    }

    const finalPrompt = `${lifestylePrompt} perfectly lit.`;

    if (apiKey) {
      const configured = process.env.AI_IMAGE_MODEL || "gemini-2.5-flash-image";
      const modelsToTry = [...new Set([configured, "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"])];

      for (let i = 0; i < imageCount; i++) {
        try {
          let imgBuffer: Buffer | null = null;

          // Use image-to-image with the highly detailed visual description if we have a reference photo
          if (referenceImageBuffer) {
            imgBuffer = await callGeminiImageGeneration(referenceImageBuffer, referenceMimeType, finalPrompt);
          } else {
            // Fallback to text-to-image if no reference photo
            for (const model of modelsToTry) {
              try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
                    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
                  }),
                });
                if (!response.ok) continue;
                const result: any = await response.json();
                const parts = result?.candidates?.[0]?.content?.parts || [];
                const imgPart = parts.find((p: any) => p.inlineData?.data);
                if (imgPart) {
                  imgBuffer = Buffer.from(imgPart.inlineData.data, "base64");
                  break;
                }
              } catch { /* next model */ }
            }
          }

          if (imgBuffer) {
            const saved = await saveCompressedImageToDir(
              imgBuffer,
              aiImagesDir,
              aiImagesUrlPrefix,
              `gemini-product-regen-${Date.now()}-${i}`,
            );
            newImages.push(saved.publicPath);
          }
        } catch (e) {
          console.error("Regen generation error", e);
        }
      }
    }

    if (newImages.length > 0) {
      const currentImages = payload.images || [];
      let updatedImages = [...currentImages];
      
      if (imageIndex !== undefined && imageIndex >= 0 && imageIndex < currentImages.length) {
         // Replace specific image
         updatedImages[imageIndex] = newImages[0];
      } else {
         // Append
         updatedImages = [...currentImages, ...newImages];
      }

      const updatedPayload = {
        ...payload,
        images: updatedImages,
      };
      if (!updatedPayload.image || (imageIndex !== undefined && updatedPayload.image === currentImages[imageIndex])) {
        updatedPayload.image = updatedImages[0];
      }
      
      await prisma.productDraft.update({
        where: { id: draftId },
        data: { payload: updatedPayload },
      });
      return newImages;
    }
    
    throw new Error("Failed to regenerate images");
  },

  async generateCmsPage(
    prompt: string,
    options?: {
      existingContent?: string;
      existingSeo?: { seoTitle?: string; seoDesc?: string; seoKeywords?: string };
    },
  ) {
    const { loadCmsContextForAi } = await import("./cmsContextService");
    const { contextBlock } = await loadCmsContextForAi();
    const cmsExtra = process.env.AI_CMS_SYSTEM_PROMPT || process.env.AI_SYSTEM_PROMPT || "";
    const systemPrompt = buildCmsPageSystemPrompt(cmsExtra, getAiOutputLanguage());
    const userMessage = buildCmsPageUserMessage(
      prompt,
      options?.existingContent,
      options?.existingSeo,
    );
    const fullPrompt = `${systemPrompt}

--- FULL WEBSITE CMS CONTEXT (dynamic pages, categories, blogs, offers — use for accurate copy & SEO/AEO/GEO) ---
${contextBlock}
---

${userMessage}`;

    try {
      const responseText = await callGeminiWithFallback([{ text: fullPrompt }], 0.35);
      const parsed = extractJson(responseText);

      if (!parsed.htmlContent || typeof parsed.htmlContent !== "string") {
        throw new Error("AI response missing htmlContent field");
      }

      parsed.htmlContent = sanitizeCmsAiHtml(parsed.htmlContent);

      if (!parsed.htmlContent) {
        throw new Error("AI generated empty page content after sanitization");
      }

      return {
        htmlContent: parsed.htmlContent,
        seoTitle: String(parsed.seoTitle || "").slice(0, 60),
        seoDesc: String(parsed.seoDesc || parsed.seoDescription || "").slice(0, 160),
        seoKeywords: String(parsed.seoKeywords || ""),
      };
    } catch (error: any) {
      console.error("CMS Page AI Generation failed:", error);
      throw new Error("Failed to generate CMS page: " + error.message);
    }
  },

  async optimizeSeoEntity(input: {
    entityType: "product" | "category" | "blog" | "cms_page" | "homepage";
    label: string;
    url: string;
    content: string;
    existingSeo?: { seoTitle?: string | null; seoDescription?: string | null; seoKeywords?: string | null };
    customPrompt?: string;
  }) {
    const languageInstruction = buildAiLanguageInstruction(getAiOutputLanguage());
    const playbook = await getSeoPlaybook();
    const playbookBlock = buildPlaybookPromptBlock(playbook);

    const prompt = `
${buildAiStoreRoleLine(playbook.siteName)}

${playbookBlock}

${languageInstruction}

${input.customPrompt ? `CUSTOM INSTRUCTIONS FROM USER FOR THIS SEO OPTIMIZATION:
---
${input.customPrompt}
---
(You MUST strictly follow these custom instructions if they dictate specific keywords, tone, or structure.)` : ""}

Optimize meta tags for this page:
- Page type: ${input.entityType}
- Page title/label: ${input.label}
- URL path: ${input.url}

Page content (for context):
${input.content.slice(0, 3500)}

Current SEO (may be empty):
- Title: ${input.existingSeo?.seoTitle || "(none)"}
- Description: ${input.existingSeo?.seoDescription || "(none)"}
- Keywords: ${input.existingSeo?.seoKeywords || "(none)"}

Rules:
- seoTitle: max 60 chars BEFORE template — we apply "${playbook.titleTemplate}" after
- seoDescription: max 160 chars, include playbook CTA if space allows
- seoKeywords: page-specific + global playbook keywords
- faqSuggestions: 2-3 FAQ pairs for AEO
- internalLinkHint: one sentence for internal linking

Return ONLY valid JSON:
{
  "seoTitle": "string",
  "seoDescription": "string",
  "seoKeywords": "string",
  "faqSuggestions": [{ "question": "string", "answer": "string" }],
  "internalLinkHint": "string"
}`;

    const responseText = await callGeminiWithFallback([{ text: prompt }], 0.35);
    const parsed = extractJson(responseText);

    const rawTitle = String(parsed.seoTitle || input.label).slice(0, 60);
    const seoTitle = applyTitleTemplate(rawTitle, playbook.titleTemplate, playbook.siteName);
    const seoDescription = String(parsed.seoDescription || parsed.seoDesc || "").slice(0, 160);
    const seoKeywords = mergeGlobalKeywords(
      String(parsed.seoKeywords || ""),
      playbook.globalKeywords,
      playbook.mergeGlobalKeywords,
    );

    return {
      seoTitle,
      seoDescription,
      seoKeywords,
      faqSuggestions: Array.isArray(parsed.faqSuggestions) ? parsed.faqSuggestions.slice(0, 3) : [],
      internalLinkHint: String(parsed.internalLinkHint || ""),
    };
  },

  async generateBlog(input: { topic?: string; targetKeywords?: string; productImageUrl?: string }) {
    const { pickAutoBlogTopic } = await import("./blogContextService");
    const playbook = await getSeoPlaybook();
    const languageInstruction = buildAiLanguageInstruction(getAiOutputLanguage());
    const keywords = input.targetKeywords || playbook.targetRankKeywords || playbook.globalKeywords;
    const topic =
      input.topic?.trim() ||
      (await pickAutoBlogTopic()) ||
      `Expert lighting guide targeting keywords: ${keywords.split(",").slice(0, 3).join(", ")}`;

    const prompt = `
${buildAiStoreRoleLine(playbook.siteName)}

${buildPlaybookPromptBlock(playbook)}
${languageInstruction}

Write a complete SEO + GEO + AEO optimized blog article.

Topic / angle: ${topic}
Target rank keywords (use naturally in title, headings, body, meta): ${keywords}

Requirements:
- 800–1200 words of useful, factual content for homeowners in NL/BE
- Include 3–4 H2 sections, bullet lists where helpful
- FAQ section at end (2–3 Q&A) for AEO — use <h2>FAQ</h2> and <h3> for questions
- body: valid HTML only (<p>, <h2>, <h3>, <ul>, <li>, <strong>) — no markdown
- Optimize for Google Search, ChatGPT/Gemini discovery (GEO), and voice/AI answers (AEO)
- seoTitle max 60 chars, seoDescription max 160 chars
- If the topic mentions a product, offer, or sale — weave it in naturally with helpful buyer advice

Return ONLY valid JSON:
{
  "title": "string",
  "slug": "url-friendly-slug",
  "excerpt": "2 sentence summary",
  "body": "full HTML article",
  "author": "Schip & Ster",
  "seoTitle": "string",
  "seoDescription": "string",
  "seoKeywords": "comma separated",
  "coverImagePrompt": "detailed photorealistic scene description for blog hero image, no text"
}`;

    const responseText = await callGeminiWithFallback([{ text: prompt }], 0.45);
    const parsed = extractJson(responseText);
    const slug = String(parsed.slug || parsed.title || "blog")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80);

    const title = String(parsed.title || "Lighting Guide");
    const coverScene = String(parsed.coverImagePrompt || parsed.coverImageQuery || "modern Scandinavian living room with pendant lighting, warm ambient light, editorial photography");
    const coverPrompt = `Generate a photorealistic blog hero cover image. Article: "${title}". Scene: ${coverScene}. Professional interior photography, high quality, no text, no watermark, no logos.`;

    let cover: string | null = null;
    if (input.productImageUrl) {
      try {
        const imgPath = input.productImageUrl.startsWith("http")
          ? input.productImageUrl
          : path.join(__dirname, "../../public", input.productImageUrl.replace(/^\//, ""));
        if (fs.existsSync(imgPath)) {
          const buf = fs.readFileSync(imgPath);
          const lifestyleBuf = await callGeminiImageGeneration(buf, "image/jpeg", coverPrompt);
          if (lifestyleBuf) {
            const aiImagesDir = path.join(__dirname, "../../public/uploads/ai-images");
            const saved = await saveCompressedBlogCoverToDir(lifestyleBuf, aiImagesDir, "/uploads/ai-images", `blog-cover-${Date.now()}`);
            cover = saved.publicPath;
          }
        }
      } catch (err: any) {
        console.warn("Blog cover from product image failed:", err.message);
      }
    }
    if (!cover) {
      cover = await generateTextToImage(coverPrompt, `blog-cover-${Date.now()}`);
    }

    return {
      title,
      slug,
      excerpt: String(parsed.excerpt || "").slice(0, 300),
      body: String(parsed.body || ""),
      author: String(parsed.author || "Schip & Ster"),
      seoTitle: applyTitleTemplate(String(parsed.seoTitle || parsed.title || "").slice(0, 60), playbook.titleTemplate, playbook.siteName),
      seoDescription: String(parsed.seoDescription || parsed.excerpt || "").slice(0, 160),
      seoKeywords: mergeGlobalKeywords(String(parsed.seoKeywords || ""), keywords, true),
      cover,
    };
  },

  async generateFaqs(input: {
    focus?: string;
    mergeWithExisting?: boolean;
    existingFaqs?: Array<{ q: string; a: string; published?: boolean }>;
    limit?: number;
  }) {
    const { loadCmsContextForAi } = await import("./cmsContextService");
    const { contextBlock, summary } = await loadCmsContextForAi();
    const playbook = await getSeoPlaybook();
    const languageInstruction = buildAiLanguageInstruction(getAiOutputLanguage());
    const cap = Math.min(Math.max(Number(input.limit) || 12, 5), 20);
    const keywords = playbook.targetRankKeywords || playbook.globalKeywords;
    const existing = input.existingFaqs || [];
    const merge = input.mergeWithExisting !== false;

    const prompt = `
${buildAiStoreRoleLine(playbook.siteName)}

${buildPlaybookPromptBlock(playbook)}
${languageInstruction}

Generate ${cap} FAQ question-answer pairs optimized for:
- **SEO** — natural keywords: ${keywords}
- **AEO** — direct, factual answers AI assistants (ChatGPT, Gemini, Google AI Overviews) can cite
- **GEO** — helpful for homeowners in NL/BE shopping for lighting online

${input.focus?.trim() ? `Focus area: ${input.focus.trim()}` : "Cover shipping, returns, warranty, payments, products, and store policies based on the website context below."}

${merge && existing.length ? `Keep these existing FAQs unchanged in your output (include them first):\n${existing.map((f) => `- Q: ${f.q}\n  A: ${f.a}`).join("\n")}\n\nAdd NEW FAQs that fill gaps — do not duplicate topics already covered.` : "Generate a fresh complete FAQ set."}

--- FULL WEBSITE CMS CONTEXT ---
${contextBlock}
---

Rules:
- Answers: 2–4 sentences, plain text (no HTML)
- Questions: natural language customers would ask
- Accurate to the store context — do not invent policies not supported by context
- Include at least 2 product/lighting-specific FAQs
- Include at least 1 shipping/delivery FAQ for NL/BE
- NEW FAQs must use the OUTPUT LANGUAGE above (existing FAQs kept as-is when merging)

Return ONLY valid JSON:
{
  "faqs": [
    { "q": "question", "a": "answer", "published": true }
  ]
}`;

    const responseText = await callGeminiWithFallback([{ text: prompt }], 0.4);
    const parsed = extractJson(responseText);
    let faqs = Array.isArray(parsed.faqs)
      ? parsed.faqs.map((f: any) => ({
          q: String(f.q || f.question || "").trim(),
          a: String(f.a || f.answer || "").trim(),
          published: f.published !== false,
        }))
      : [];

    faqs = faqs.filter((f: { q: string; a: string }) => f.q && f.a).slice(0, cap + (merge ? existing.length : 0));

    if (merge && existing.length) {
      const existingQs = new Set(existing.map((f) => f.q.toLowerCase().trim()));
      const newOnly = faqs.filter((f: { q: string }) => !existingQs.has(f.q.toLowerCase().trim()));
      faqs = [...existing, ...newOnly].slice(0, cap + existing.length);
    }

    return { faqs, contextSummary: summary };
  },

  async generateBacklinkSuggestions(targetKeywords: string): Promise<string[]> {
    const playbook = await getSeoPlaybook();
    const languageInstruction = buildAiLanguageInstruction(getAiOutputLanguage());
    const prompt = `
${buildAiStoreRoleLine(playbook.siteName)}

${languageInstruction}

Target keywords to rank for: ${targetKeywords}

Generate 8 realistic backlink outreach opportunities (NOT spam). Each line format:
"[Site type] Site name — angle: one sentence pitch for guest post or partnership"

Focus: home & garden blogs, interior design magazines, sustainable living sites, and relevant EU business directories for the NL/BE market.

Return ONLY valid JSON: { "suggestions": ["line1", "line2", ...] }`;

    const responseText = await callGeminiWithFallback([{ text: prompt }], 0.4);
    const parsed = extractJson(responseText);
    return Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 10).map(String) : [];
  },

  async analyzeReturn(input: {
    reason: string;
    customerNote: string;
    orderItems: Array<{ productName: string; productImage: string; quantity: number }>;
    customerPhotos: Array<{ buffer: Buffer; mimeType: string }>;
  }) {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return {
        aiFraudScore: null,
        aiSummary: "AI not configured — manual review required.",
        aiRecommendation: "needs_review",
      };
    }

    const itemsSummary = input.orderItems
      .map((i) => `- ${i.productName} (qty ${i.quantity})`)
      .join("\n");

    const promptText = `You are a returns fraud-detection assistant for an e-commerce lighting store.

Customer return reason: ${input.reason}
Customer note: ${input.customerNote || "(none)"}

Ordered items:
${itemsSummary}

Analyze the attached customer photos against the return claim.
Return ONLY valid JSON:
{
  "fraudScore": number 0-100 (0=legitimate, 100=highly suspicious),
  "summary": "2-3 sentence assessment for admin",
  "recommendation": "auto_approve" | "needs_review" | "likely_fraud",
  "productMatch": boolean,
  "damageVisible": boolean
}`;

    const parts: any[] = [];
    for (const photo of input.customerPhotos.slice(0, 3)) {
      parts.push({
        inlineData: {
          data: photo.buffer.toString("base64"),
          mimeType: photo.mimeType || "image/jpeg",
        },
      });
    }
    parts.push({ text: promptText });

    const responseText = await callGeminiWithFallback(parts, 0.2);
    const parsed = extractJson(responseText);

    const fraudScore = Math.min(100, Math.max(0, Number(parsed.fraudScore) || 50));
    let recommendation = String(parsed.recommendation || "needs_review");
    if (!["auto_approve", "needs_review", "likely_fraud"].includes(recommendation)) {
      recommendation = fraudScore >= 70 ? "likely_fraud" : fraudScore <= 25 ? "auto_approve" : "needs_review";
    }

    return {
      aiFraudScore: fraudScore,
      aiSummary: String(parsed.summary || "AI analysis completed."),
      aiRecommendation: recommendation,
    };
  },

  async generateRobotsTxt(input?: { existingContent?: string; canonicalUrl?: string }) {
    const { loadCmsContextForAi } = await import("./cmsContextService");
    const playbook = await getSeoPlaybook();
    const { contextBlock } = await loadCmsContextForAi();
    const languageInstruction = buildAiLanguageInstruction(getAiOutputLanguage());
    const baseUrl = (input?.canonicalUrl || getSeoCanonicalBaseUrl()).replace(/\/$/, "");
    const existing = input?.existingContent?.trim() || "";

    const prompt = `
You are an expert technical SEO engineer for "${playbook.siteName}" (${playbook.geoFocus}).

${buildPlaybookPromptBlock(playbook)}

Generate a complete robots.txt for the storefront at ${baseUrl}.

${languageInstruction}
Comments in robots.txt may use the output language; directives must stay in English (User-agent, Disallow, Allow, Sitemap).

REQUIRED structure:
1. User-agent: * block — Disallow: /admin/, /cart, /checkout/, /account/, /dashboard, /search, /api/ — Allow: /
2. Separate Allow blocks for AI crawlers: GPTBot, ChatGPT-User, Google-Extended, anthropic-ai, PerplexityBot, ClaudeBot
3. Sitemap: ${baseUrl}/sitemap.xml
4. Final comment line: # LLM context: ${baseUrl}/llms.txt

Use ONLY valid robots.txt syntax. Comments MUST start with #.

CRITICAL OUTPUT FORMAT:
- Return ONLY raw robots.txt plain text.
- Do NOT return JSON. Do NOT use { "robots_txt": "..." } or any JSON wrapper.
- Do NOT wrap in code fences.
- Start with: User-agent: *
- Use real newlines, not \\n escapes.

${existing ? `Current robots.txt (improve and keep valid parts):\n${existing.slice(0, 2500)}` : ""}

--- Store catalog context (for reference) ---
${contextBlock.slice(0, 2000)}
---`;

    const responseText = await callGeminiWithFallback([{ text: prompt }], 0.25);
    return normalizeRobotsTxtFromAi(responseText);
  },

  async generateLlmsTxt(input?: { existingContent?: string; canonicalUrl?: string }) {
    const { loadCmsContextForAi } = await import("./cmsContextService");
    const playbook = await getSeoPlaybook();
    const { contextBlock, summary } = await loadCmsContextForAi();
    const languageInstruction = buildAiLanguageInstruction(getAiOutputLanguage());
    const baseUrl = (input?.canonicalUrl || getSeoCanonicalBaseUrl()).replace(/\/$/, "");
    const existing = input?.existingContent?.trim() || "";

    const prompt = `
You are an expert in GEO (Generative Engine Optimization) and llms.txt files for "${playbook.siteName}".

${buildPlaybookPromptBlock(playbook)}

${languageInstruction}

Write a complete llms.txt file (Markdown-style plain text) for ${baseUrl} so AI assistants (ChatGPT, Gemini, Perplexity, Claude) can accurately cite and recommend this store.

Required sections:
1. # Site name as H1
2. > One-paragraph summary (lighting e-commerce, NL/BE, shipping/returns/warranty from playbook)
3. Languages & currency
4. ## Key pages — markdown links: /, /categories, /category/deals, /blogs, /faqs, /brands (full URLs with ${baseUrl})
5. ## CMS pages — MUST list EVERY page from "DYNAMIC CMS PAGES" in the context below as [Title](${baseUrl}/{slug}) with a one-line description from its SEO/summary
6. ## Product categories — list main category slugs from context with full URLs
7. ## Policies — shipping, returns, warranty, payment methods
8. ## Contact — website + email if known
9. ## For AI systems — routing hints: /product/{slug}, /category/{slug}, /blogs/{slug}, /{cms-page-slug}, /faqs

Use REAL slugs from the store context below — especially all CMS pages under "DYNAMIC CMS PAGES".
Keep under 150 lines. No HTML.

CRITICAL OUTPUT FORMAT:
- Return ONLY the raw llms.txt document (markdown plain text).
- Do NOT return JSON. Do NOT use { "llms_txt": "..." } or any JSON wrapper.
- Do NOT wrap in code fences.
- Start your response with: # ${playbook.siteName}
- Use UTF-8 punctuation (em dash — is OK). Do not escape newlines as \\n.

${existing ? `Current llms.txt (refresh and improve):\n${existing.slice(0, 3500)}` : ""}

--- LIVE STORE CONTEXT (${summary.productCount} products, ${summary.pageCount} CMS pages, ${summary.categoryCount} categories, ${summary.blogCount} blogs) ---
${contextBlock.slice(0, 9000)}
---`;

    const responseText = await callGeminiWithFallback([{ text: prompt }], 0.35);
    return normalizeLlmsTxtOutput(responseText, playbook.siteName);
  },
};
