import { Request, Response } from "express";
import fs from "fs";
import path from "path";

// Persist translation cache to disk so it survives server restarts
const CACHE_FILE = path.join(__dirname, "../../.translation-cache.json");
const translationCache: Record<string, string> = (() => {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    }
  } catch {}
  return {};
})();

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(translationCache));
  } catch {}
}

/**
 * Batch translate multiple texts in ONE Google API request.
 * Google supports multiple &q= params in a single call.
 */
async function batchTranslate(texts: string[], lang: string): Promise<(string | null)[]> {
  const params = new URLSearchParams({ client: "gtx", sl: "auto", tl: lang, dt: "t" });
  for (const t of texts) params.append("q", t);

  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?${params.toString()}`
    );

    if (response.status === 429) return texts.map(() => null); // rate limited, return null
    if (!response.ok) return texts.map(() => null);

    const data = await response.json();

    // For multiple q params, Google returns array-of-arrays
    if (texts.length === 1) {
      // Single text: standard response format
      const translation = data[0]?.map((item: any) => item?.[0]).join("") || null;
      return [translation];
    }

    // Multiple texts: each element in data[0] corresponds to one text
    return data[0]?.map((item: any) => {
      if (Array.isArray(item) && Array.isArray(item[0])) {
        return item[0][0] || null;
      }
      return item?.[0] || null;
    }) ?? texts.map(() => null);
  } catch {
    return texts.map(() => null);
  }
}

// Single translate (used by translateText in translator.ts)
export const proxyTranslate = async (req: Request, res: Response): Promise<void> => {
  const { text, lang } = req.body;

  if (!text || !lang) {
    res.status(400).json({ success: false, message: "Missing text or lang" });
    return;
  }

  const cacheKey = `${lang}:${text}`;
  if (translationCache[cacheKey]) {
    res.status(200).json({ success: true, data: translationCache[cacheKey], cached: true });
    return;
  }

  try {
    const [translation] = await batchTranslate([text], lang);

    if (translation) {
      // Store raw Google response format for compatibility
      const data = [[[ translation, text ]]];
      translationCache[cacheKey] = translation;
      saveCache();
      res.status(200).json({ success: true, data });
    } else {
      res.status(200).json({ success: false, data: null });
    }
  } catch (error: any) {
    console.warn("Translation Proxy Error:", error.message);
    res.status(200).json({ success: false, data: null });
  }
};

// Batch translate (multiple texts in one request)
export const proxyTranslateBatch = async (req: Request, res: Response): Promise<void> => {
  const { texts, lang } = req.body as { texts: string[]; lang: string };

  if (!texts?.length || !lang) {
    res.status(400).json({ success: false, message: "Missing texts or lang" });
    return;
  }

  // Check cache first for all texts
  const results: Record<string, string | null> = {};
  const uncachedTexts: string[] = [];

  for (const text of texts) {
    const key = `${lang}:${text}`;
    if (translationCache[key]) {
      results[text] = translationCache[key];
    } else {
      uncachedTexts.push(text);
    }
  }

  // Translate uncached ones in one Google call (max 30 at a time to avoid URL length limits)
  const BATCH_SIZE = 30;
  for (let i = 0; i < uncachedTexts.length; i += BATCH_SIZE) {
    const batch = uncachedTexts.slice(i, i + BATCH_SIZE);
    const translations = await batchTranslate(batch, lang);

    for (let j = 0; j < batch.length; j++) {
      const text = batch[j];
      const translation = translations[j];
      if (translation) {
        results[text] = translation;
        translationCache[`${lang}:${text}`] = translation;
      } else {
        results[text] = null;
      }
    }

    if (translations.some(t => t === null) && i + BATCH_SIZE < uncachedTexts.length) {
      // Rate limited — wait before next batch
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  saveCache();
  res.status(200).json({ success: true, results });
};


