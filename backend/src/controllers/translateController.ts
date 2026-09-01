import { Request, Response, NextFunction } from "express";

export const proxyTranslate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { text, lang } = req.body;
    if (!text || !lang) {
      res.status(400).json({ success: false, message: "Missing text or lang" });
      return;
    }

    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`
    );

    if (!response.ok) {
      throw new Error(`Google Translate API responded with status ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error("Translation Proxy Error:", error.message);
    res.status(500).json({ success: false, message: "Translation failed" });
  }
};
