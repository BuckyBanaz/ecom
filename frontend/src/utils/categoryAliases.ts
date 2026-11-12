/**
 * Centralized Category Aliases & Slug Normalization for Schip & Ster
 * Handles English, Dutch, singular/plural, hyphens, and parent groupings.
 */

export const CATEGORY_ALIAS_MAP: Record<string, string> = {
  // Master Indoor lighting / Parent / All
  "binnenverlichting": "interior-lighting",
  "binnen-verlichting": "interior-lighting",
  "indoor-lighting": "interior-lighting",
  "indoor": "interior-lighting",
  "interior-lighting": "interior-lighting",
  "interior": "interior-lighting",
  "all-lamps": "all-lamps",
  "alle-lampen": "all-lamps",
  "all-products": "all-lamps",
  "alle-producten": "all-lamps",
  "all-lights": "all-lamps",
  "alle-lichten": "all-lamps",
  "all": "all-lamps",

  // Pendant lights / Hanglampen
  "hanglampen": "pendant-light",
  "hanglamp": "pendant-light",
  "pendant": "pendant-light",
  "pendants": "pendant-light",
  "pendant-lamps": "pendant-light",
  "pendant-lights": "pendant-light",
  "pendant-light": "pendant-light",

  // Table lamps / Tafellampen
  "tafellampen": "table-lamps",
  "tafellamp": "table-lamps",
  "table-lamps": "table-lamps",
  "table-lamp": "table-lamps",
  "table-lights": "table-lamps",

  // Ceiling lights / Plafondlampen
  "plafondlampen": "plafondlamp",
  "plafondlamp": "plafondlamp",
  "ceiling-lamps": "plafondlamp",
  "ceiling-lights": "plafondlamp",
  "ceiling-light": "plafondlamp",

  // Wall lights / Wandlampen
  "wandlampen": "wall-lights",
  "wandlamp": "wall-lights",
  "wall-lamps": "wall-lights",
  "wall-lights": "wall-lights",

  // Floor lamps / Vloerlampen
  "vloerlampen": "floor-lamps",
  "vloerlamp": "floor-lamps",
  "floor-lamps": "floor-lamps",
  "floor-lights": "floor-lamps",

  // Spots / Spotlights
  "spots": "spotlights",
  "spot": "spotlights",
  "spotlights": "spotlights",
  "opbouwspots": "spotlights",
  "opbouwspot": "spotlights",

  // Light sources / Lichtbronnen
  "lichtbronnen": "light-sources",
  "lichtbron": "light-sources",
  "light-sources": "light-sources",
  "light-source": "light-sources",
  "smart-bulbs": "light-sources",
  "led-bulbs": "light-sources",
  "bulbs": "light-sources",

  // Outdoor / Buitenverlichting
  "buitenverlichting": "outdoor-lighting",
  "outdoor-lighting": "outdoor-lighting",
  "outdoor-lamps": "outdoor-lighting",
  "outdoor": "outdoor-lighting",

  // Commercial / Kantoorverlichting
  "kantoorverlichting": "office-lighting",
  "office-lighting": "office-lighting",
  "commercial-lighting": "office-lighting",

  // Chandeliers / Kroonluchters
  "kroonluchters": "chandeliers",
  "kroonluchter": "chandeliers",
  "chandeliers": "chandeliers",
  "chandelier": "chandeliers",
};

/**
 * Normalizes any category string or slug into canonical slug
 */
export function normalizeCategorySlug(raw: string): string {
  if (!raw) return "";
  const clean = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return CATEGORY_ALIAS_MAP[clean] || CATEGORY_ALIAS_MAP[raw.toLowerCase().trim()] || clean;
}

/**
 * Checks if a category slug represents the master Indoor Lighting parent
 */
export function isIndoorParentCategory(slug: string): boolean {
  if (!slug) return false;
  const canonical = normalizeCategorySlug(slug);
  return (
    canonical === "interior-lighting" ||
    canonical === "all-lamps" ||
    slug.toLowerCase().trim() === "binnenverlichting" ||
    slug.toLowerCase().trim() === "indoor-lighting"
  );
}
