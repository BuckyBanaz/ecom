/** AI-generated catalog/CMS text language (separate from storefront i18n). */

export type AiOutputLanguage = "nl" | "en" | "de" | "fr";

export const AI_OUTPUT_LANGUAGES: { code: AiOutputLanguage; label: string; native: string }[] = [
  { code: "nl", label: "Dutch", native: "Nederlands" },
  { code: "en", label: "English", native: "English" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "fr", label: "French", native: "Français" },
];

const LANGUAGE_NAMES: Record<AiOutputLanguage, string> = {
  nl: "Dutch (Nederlands)",
  en: "English",
  de: "German (Deutsch)",
  fr: "French (Français)",
};

export function normalizeAiOutputLanguage(raw?: string | null): AiOutputLanguage {
  const code = (raw || "nl").split("-")[0].toLowerCase();
  if (code === "en" || code === "de" || code === "fr" || code === "nl") return code;
  return "nl";
}

export function getAiOutputLanguage(): AiOutputLanguage {
  return normalizeAiOutputLanguage(process.env.AI_OUTPUT_LANGUAGE);
}

export function getAiOutputLanguageLabel(lang?: AiOutputLanguage): string {
  const code = lang || getAiOutputLanguage();
  return LANGUAGE_NAMES[code];
}

/** Neutral store role line — market is NL/BE but text language comes from AI Brain setting. */
export function buildAiStoreRoleLine(siteName: string): string {
  return `You are an expert for "${siteName}", a premium online lighting store serving the Netherlands & Belgium.`;
}

/** Instruction block injected into every customer-facing AI prompt. */
export function buildAiLanguageInstruction(lang?: AiOutputLanguage): string {
  const code = lang || getAiOutputLanguage();
  const name = LANGUAGE_NAMES[code];

  return `
=== OUTPUT LANGUAGE (REQUIRED — HIGHEST PRIORITY) ===
Write ALL customer-facing text EXCLUSIVELY in ${name}.
This OVERRIDES: SEO playbook brand voice, GEO focus, any "Dutch primary" hints, and the language of existing CMS/product context below (translate or rewrite into ${name} for new output).

Applies to:
- Product: name, shortDescription, description, seoTitle, seoDescription, seoKeywords, specs (values), attribute values
- CMS: htmlContent visible text, seoTitle, seoDesc, seoKeywords, shortcode title/subtitle/description/button text
- SEO meta, FAQ questions & answers, blog title/body/excerpt, llms.txt prose, robots.txt comments

Keep JSON property names in English. Do NOT mix languages in one response.
Use natural ${name} e-commerce copy for a lighting store in the Netherlands/EU market.
`.trim();
}
