/**
 * Length / Diameter / Width filter attributes.
 *
 * These attributes only ever hold the fixed bucket values below. Exact sizes live in product specs
 * ("Diameter: 36 cm"); the bucket ("20-40 cm") is derived from them. Ranges are (min, max]: a size
 * exactly on a boundary belongs to the lower bucket, so 40 cm -> "20-40 cm".
 */

export type DimensionSlug = "length" | "diameter" | "width";

export interface DimensionBucket {
  label: string;
  min: number;
  max: number;
}

const bucket = (label: string, min: number, max: number): DimensionBucket => ({ label, min, max });

const ROUND_BUCKETS: DimensionBucket[] = [
  bucket("Onder 20 cm", 0, 20),
  bucket("20-40 cm", 20, 40),
  bucket("40-60 cm", 40, 60),
  bucket("60-80 cm", 60, 80),
  bucket("80-100 cm", 80, 100),
  bucket("Boven 100 cm", 100, Infinity),
];

export const DIMENSION_BUCKETS: Record<DimensionSlug, DimensionBucket[]> = {
  length: [
    bucket("Onder 40 cm", 0, 40),
    bucket("40-60 cm", 40, 60),
    bucket("60-80 cm", 60, 80),
    bucket("80-100 cm", 80, 100),
    bucket("100-120 cm", 100, 120),
    bucket("Boven 120 cm", 120, Infinity),
  ],
  diameter: ROUND_BUCKETS,
  width: ROUND_BUCKETS,
};

export const DIMENSION_SLUGS = Object.keys(DIMENSION_BUCKETS) as DimensionSlug[];

/** Spec keys (lowercased, unit suffix stripped) that hold the exact size for each attribute. */
const SPEC_KEYS: Record<DimensionSlug, string[]> = {
  length: ["length", "lengte"],
  diameter: ["diameter", "doorsnede", "ø"],
  width: ["width", "breedte"],
};

export function isDimensionSlug(slug: unknown): slug is DimensionSlug {
  return typeof slug === "string" && slug.toLowerCase() in DIMENSION_BUCKETS;
}

export function getBucketLabels(slug: DimensionSlug): string[] {
  return DIMENSION_BUCKETS[slug].map((b) => b.label);
}

const compact = (value: string) => value.toLowerCase().replace(/\s+/g, "");

/** Canonical label when the value is already a bucket ("20 - 40 cm", "onder 20cm"), else null. */
export function matchBucketLabel(slug: DimensionSlug, value: string): string | null {
  const key = compact(String(value));
  return DIMENSION_BUCKETS[slug].find((b) => compact(b.label) === key)?.label ?? null;
}

/**
 * Size in cm from free text: "36cm", "Ø 40 cm", "D55cm", "800 mm", "1,2 m", "25x25" (largest side),
 * "30-40 cm" (midpoint). Returns null when no plausible size is found.
 */
export function parseCentimeters(raw: unknown): number | null {
  const text = String(raw ?? "").toLowerCase().replace(/,/g, ".").trim();
  if (!text) return null;

  const num = "(\\d+(?:\\.\\d+)?)";
  let cm: number | null = null;

  const range = text.match(new RegExp(`${num}\\s*(?:cm|mm)?\\s*(?:-|–|—|tot)\\s*${num}`));
  const cross = text.match(new RegExp(`${num}\\s*(?:cm|mm)?\\s*[x×*]\\s*${num}`));
  const single = text.match(new RegExp(num));

  if (range) {
    cm = (parseFloat(range[1]) + parseFloat(range[2])) / 2;
  } else if (cross) {
    cm = Math.max(parseFloat(cross[1]), parseFloat(cross[2]));
  } else if (single) {
    cm = parseFloat(single[1]);
  }
  if (cm === null || isNaN(cm)) return null;

  if (/\d\s*mm\b/.test(text)) cm /= 10;
  else if (/\d\s*m\b/.test(text)) cm *= 100;

  return cm > 0 && cm <= 1000 ? cm : null;
}

export function bucketForCentimeters(slug: DimensionSlug, cm: number): string | null {
  return DIMENSION_BUCKETS[slug].find((b) => cm > b.min && cm <= b.max)?.label ?? null;
}

/** Any raw value ("36cm", "20-40 cm", "25x25") -> canonical bucket label, or null if it has no size. */
export function normalizeDimensionValue(slug: DimensionSlug, raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const label = matchBucketLabel(slug, value);
  if (label) return label;
  const cm = parseCentimeters(value);
  return cm === null ? null : bucketForCentimeters(slug, cm);
}

function cleanSpecKey(key: string): string {
  const last = key.includes("::") ? key.split("::").pop()! : key;
  return last.toLowerCase().replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
}

/** Dimension attribute a spec key feeds ("Lengte" -> "length"); null for anything else ("Kabellengte"). */
export function dimensionSlugForSpecKey(key: unknown): DimensionSlug | null {
  if (typeof key !== "string") return null;
  const clean = cleanSpecKey(key);
  return DIMENSION_SLUGS.find((slug) => SPEC_KEYS[slug].includes(clean)) ?? null;
}

/** Bucket per dimension attribute from product specs (array of {key, value} or a plain object). */
export function deriveDimensionBucketsFromSpecs(specs: unknown): Partial<Record<DimensionSlug, string>> {
  const entries: Array<[unknown, unknown]> = Array.isArray(specs)
    ? specs.map((s: any) => [s?.key, s?.value])
    : specs && typeof specs === "object"
      ? Object.entries(specs as Record<string, unknown>)
      : [];

  const result: Partial<Record<DimensionSlug, string>> = {};
  for (const [key, value] of entries) {
    const slug = dimensionSlugForSpecKey(key);
    if (!slug || result[slug]) continue;
    const label = normalizeDimensionValue(slug, value);
    if (label) result[slug] = label;
  }
  return result;
}

export function bucketSortIndex(slug: DimensionSlug, value: string): number {
  const index = DIMENSION_BUCKETS[slug].findIndex((b) => b.label === value);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

// ── One-off cleanup planning (pure, so it can run against an API snapshot) ──

export interface PlanAttribute {
  id: string;
  slug: string;
  type: string;
  values: Array<{ id: string; value: string }>;
}

export interface PlanProduct {
  id: string;
  name: string;
  specs: unknown;
  /** Current links to dimension attributes */
  links: Array<{ attributeId: string; valueId: string }>;
}

export interface DimensionCleanupPlan {
  attributes: Array<{
    slug: DimensionSlug;
    attributeId: string;
    typeChange: string | null;
    createLabels: string[];
    remap: Array<{ valueId: string; value: string; target: string | null; linkedProducts: number }>;
    deleteValueIds: string[];
  }>;
  productChanges: Array<{
    productId: string;
    name: string;
    slug: DimensionSlug;
    attributeId: string;
    before: string[];
    after: string[];
    source: "spec" | "existing";
  }>;
  conflicts: Array<{ productId: string; name: string; slug: DimensionSlug; spec: string; existing: string[] }>;
  missingAttributes: DimensionSlug[];
}

/**
 * Spec wins over existing links (those were machine-made); otherwise existing raw values are mapped
 * onto their bucket. Every non-bucket value is deleted afterwards.
 */
export function planDimensionCleanup(attributes: PlanAttribute[], products: PlanProduct[]): DimensionCleanupPlan {
  const plan: DimensionCleanupPlan = { attributes: [], productChanges: [], conflicts: [], missingAttributes: [] };

  for (const slug of DIMENSION_SLUGS) {
    const attribute = attributes.find((a) => a.slug.toLowerCase() === slug);
    if (!attribute) {
      plan.missingAttributes.push(slug);
      continue;
    }

    const labels = getBucketLabels(slug);
    const valueById = new Map(attribute.values.map((v) => [v.id, v.value]));
    const canonical = new Set(attribute.values.filter((v) => labels.includes(v.value)).map((v) => v.value));

    const remap = attribute.values
      .filter((v) => !labels.includes(v.value))
      .map((v) => ({
        valueId: v.id,
        value: v.value,
        target: normalizeDimensionValue(slug, v.value),
        linkedProducts: products.filter((p) => p.links.some((l) => l.valueId === v.id)).length,
      }));
    const targetByValueId = new Map(remap.map((r) => [r.valueId, r.target]));

    plan.attributes.push({
      slug,
      attributeId: attribute.id,
      typeChange: attribute.type === "dimension" ? null : attribute.type,
      createLabels: labels.filter((l) => !canonical.has(l)),
      remap,
      deleteValueIds: remap.map((r) => r.valueId),
    });

    for (const product of products) {
      const currentValues = product.links
        .filter((l) => l.attributeId === attribute.id)
        .map((l) => valueById.get(l.valueId))
        .filter((v): v is string => typeof v === "string");
      const mappedExisting = [
        ...new Set(
          product.links
            .filter((l) => l.attributeId === attribute.id)
            .map((l) => (labels.includes(valueById.get(l.valueId) ?? "") ? valueById.get(l.valueId)! : targetByValueId.get(l.valueId)))
            .filter((v): v is string => !!v)
        ),
      ];

      const specLabel = deriveDimensionBucketsFromSpecs(product.specs)[slug];
      const after = specLabel ? [specLabel] : mappedExisting;
      const source = specLabel ? "spec" : "existing";

      if (specLabel && mappedExisting.length > 0 && !(mappedExisting.length === 1 && mappedExisting[0] === specLabel)) {
        plan.conflicts.push({ productId: product.id, name: product.name, slug, spec: specLabel, existing: currentValues });
      }

      const unchanged =
        currentValues.length === after.length && currentValues.every((v) => after.includes(v));
      if (!unchanged) {
        plan.productChanges.push({
          productId: product.id,
          name: product.name,
          slug,
          attributeId: attribute.id,
          before: currentValues,
          after,
          source,
        });
      }
    }
  }

  return plan;
}
