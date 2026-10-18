/**
 * Length / Diameter / Width hold size buckets ("20-40 cm"); exact sizes live in specs. Mirrors
 * backend/src/utils/dimensionAttributes.ts, but reads the bucket ranges from the attribute's own
 * values so the bucket list is only defined on the backend. Ranges are (min, max]: 40 cm -> "20-40 cm".
 */

export const DIMENSION_ATTRIBUTE_SLUGS = ["length", "diameter", "width"];

const SPEC_KEYS: Record<string, string[]> = {
  length: ["length", "lengte"],
  diameter: ["diameter", "doorsnede", "ø"],
  width: ["width", "breedte"],
};

export function isDimensionAttributeSlug(slug: string | undefined): boolean {
  return !!slug && DIMENSION_ATTRIBUTE_SLUGS.includes(slug.toLowerCase());
}

/** Dimension attribute a spec key feeds ("Lengte" -> "length"); null for anything else ("Kabellengte"). */
export function dimensionSlugForSpecKey(key: string | undefined): string | null {
  if (!key) return null;
  const last = key.includes("::") ? key.split("::").pop()! : key;
  const clean = last.toLowerCase().replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
  return DIMENSION_ATTRIBUTE_SLUGS.find((slug) => SPEC_KEYS[slug].includes(clean)) ?? null;
}

/** Size in cm: "36cm", "Ø 40 cm", "800 mm", "1,2 m", "25x25" (largest side), "30-40 cm" (midpoint). */
export function parseCentimeters(raw: unknown): number | null {
  const text = String(raw ?? "").toLowerCase().replace(/,/g, ".").trim();
  if (!text) return null;

  const num = "(\\d+(?:\\.\\d+)?)";
  const range = text.match(new RegExp(`${num}\\s*(?:cm|mm)?\\s*(?:-|–|—|tot)\\s*${num}`));
  const cross = text.match(new RegExp(`${num}\\s*(?:cm|mm)?\\s*[x×*]\\s*${num}`));
  const single = text.match(new RegExp(num));

  let cm: number | null = null;
  if (range) cm = (parseFloat(range[1]) + parseFloat(range[2])) / 2;
  else if (cross) cm = Math.max(parseFloat(cross[1]), parseFloat(cross[2]));
  else if (single) cm = parseFloat(single[1]);
  if (cm === null || isNaN(cm)) return null;

  if (/\d\s*mm\b/.test(text)) cm /= 10;
  else if (/\d\s*m\b/.test(text)) cm *= 100;

  return cm > 0 && cm <= 1000 ? cm : null;
}

function bucketRange(label: string): { min: number; max: number } | null {
  const text = label.toLowerCase();
  const under = text.match(/^(?:onder|under)\s*(\d+)/);
  if (under) return { min: 0, max: Number(under[1]) };
  const over = text.match(/^(?:boven|over)\s*(\d+)/);
  if (over) return { min: Number(over[1]), max: Infinity };
  const between = text.match(/^(\d+)\s*-\s*(\d+)/);
  if (between) return { min: Number(between[1]), max: Number(between[2]) };
  return null;
}

/** The bucket label (one of `labels`) that a raw size such as "36cm" belongs to, or null. */
export function pickDimensionBucket(raw: unknown, labels: string[]): string | null {
  const compact = (v: string) => v.toLowerCase().replace(/\s+/g, "");
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const exact = labels.find((l) => compact(l) === compact(value));
  if (exact) return exact;

  const cm = parseCentimeters(value);
  if (cm === null) return null;
  return (
    labels.find((l) => {
      const range = bucketRange(l);
      return !!range && cm > range.min && cm <= range.max;
    }) ?? null
  );
}
