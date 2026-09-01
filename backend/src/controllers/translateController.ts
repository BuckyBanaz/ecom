import { Request, Response } from "express";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchTranslation(text: string, lang: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`
      );

      if (response.status === 429) {
        // Rate limited — wait and retry with exponential backoff
        const delay = 500 * Math.pow(2, attempt); // 500ms, 1000ms, 2000ms
        console.warn(`Translation Proxy Error: 429 — retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Google Translate API responded with status ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      if (attempt === retries - 1) throw err;
      await sleep(300 * (attempt + 1));
    }
  }
  throw new Error("Max retries reached");
}

export const proxyTranslate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, lang } = req.body;
    if (!text || !lang) {
      res.status(400).json({ success: false, message: "Missing text or lang" });
      return;
    }

    const data = await fetchTranslation(text, lang);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error("Translation Proxy Error:", error.message);
    // Return 200 with null so frontend gracefully falls back to original text
    res.status(200).json({ success: false, data: null, message: error.message });
  }
};
