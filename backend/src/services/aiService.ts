import { prisma } from "../config/db";
import fs from "fs";
import path from "path";
import { getAiImageCount } from "../utils/aiLimits";
import { buildAiLanguageInstruction, getAiOutputLanguage } from "../utils/aiLanguage";
import {
  buildCmsPageSystemPrompt,
  buildCmsPageUserMessage,
  sanitizeCmsAiHtml,
} from "../utils/cmsAiContent";
import { saveCompressedImageToDir } from "../utils/imageOptimize";

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
        const lifestylePrompt = buildLifestylePrompt(productName, scene);

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

    } catch (error: any) {
      console.error("AI Quick-Add Generation failed:", error);
      throw new Error("Failed to generate product details from AI: " + error.message);
    }
  },

  async generateCmsPage(
    prompt: string,
    options?: {
      existingContent?: string;
      existingSeo?: { seoTitle?: string; seoDesc?: string; seoKeywords?: string };
    },
  ) {
    const cmsExtra = process.env.AI_CMS_SYSTEM_PROMPT || process.env.AI_SYSTEM_PROMPT || "";
    const systemPrompt = buildCmsPageSystemPrompt(cmsExtra, getAiOutputLanguage());
    const userMessage = buildCmsPageUserMessage(
      prompt,
      options?.existingContent,
      options?.existingSeo,
    );

    try {
      const responseText = await callGeminiWithFallback(
        [{ text: `${systemPrompt}\n\n${userMessage}` }],
        0.35
      );
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
};
