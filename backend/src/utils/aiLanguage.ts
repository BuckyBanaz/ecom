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

/** Instruction block injected into product + CMS AI prompts. */
export function buildAiLanguageInstruction(lang?: AiOutputLanguage): string {
  const code = lang || getAiOutputLanguage();
  const name = LANGUAGE_NAMES[code];

  return `
=== OUTPUT LANGUAGE (REQUIRED) ===
Write ALL customer-facing text in ${name}:
- Product: name, shortDescription, description, seoTitle, seoDescription, seoKeywords, specs (values), attribute values
- CMS: htmlContent visible text, seoTitle, seoDesc, seoKeywords, shortcode title/subtitle/description/button text attributes
Keep JSON property names in English. Do not mix languages unless the user hint is explicitly in another language.
Use natural ${name} e-commerce copy for a lighting store in the Netherlands/EU market.
`.trim();
}
