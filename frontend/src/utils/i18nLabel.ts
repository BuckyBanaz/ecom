import type { TFunction } from "i18next";
import { lookupStaticPhrase } from "./cmsPhrases";

/**
 * Translate a dynamic CMS / API label safely for the active locale.
 * Never returns empty for non-empty input — falls back to original text.
 */
export function labelT(t: TFunction, text: string | undefined | null, lang?: string): string {
  if (!text?.trim()) return text ?? "";

  const trimmed = text.trim();
  const activeLang = lang ?? (typeof localStorage !== "undefined" ? localStorage.getItem("i18nextLng") : "nl") ?? "nl";

  // 1. i18n flat/nested key (Header/Footer mega menu pattern)
  const fromI18n = t(trimmed, { defaultValue: "" });
  if (fromI18n && fromI18n !== trimmed) return fromI18n;

  // 2. Curated CMS phrase map
  const staticPhrase = lookupStaticPhrase(trimmed, activeLang);
  if (staticPhrase) return staticPhrase;

  // 3. English mode — show source text
  if (activeLang.split("-")[0].toLowerCase() === "en") return trimmed;

  return trimmed;
}
