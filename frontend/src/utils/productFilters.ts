import { getProductBrandName } from "@/utils/formatters";

/** Map product spec labels to attribute slugs used in filters. */
const SPEC_KEY_TO_ATTR_SLUG: Record<string, string> = {
  Material: "material",
  Color: "color",
  Colour: "color",
  colour: "color",
  Style: "style",
  Room: "room",
  "Bulb Fitting": "fitting",
  "Bulb fitting": "fitting",
  Fitting: "fitting",
  Dimmable: "dimmable",
  "IP Rating": "ip-rating",
  "Light color": "light-color",
  "Light Color": "light-color",
  "Dimmer type": "dimmer-type",
  Length: "length",
  Lengte: "length",
  Height: "height",
  Hoogte: "height",
  Width: "width",
  Breedte: "width",
  Diameter: "diameter",
  Afmeting: "diameter",
  Afmetingen: "diameter",
  "Number of lights": "number-of-lights",
  Series: "series",
};

export const DIMENSION_ATTR_SLUGS = new Set([
  "diameter",
  "width",
  "length",
  "height",
  "breedte",
  "lengte",
  "hoogte",
]);

export function isDimensionAttribute(slug?: string): boolean {
  if (!slug) return false;
  return DIMENSION_ATTR_SLUGS.has(slug.toLowerCase());
}

export interface ParsedRange {
  min: number;
  max: number;
}

/** Standard clean range buckets for dimension filters */
export const STANDARD_DIMENSION_BUCKETS: Record<string, string[]> = {
  diameter: [
    "Onder 20 cm",
    "20-40 cm",
    "40-60 cm",
    "60-80 cm",
    "80-100 cm",
    "Boven 100 cm",
  ],
  width: [
    "Onder 20 cm",
    "20-40 cm",
    "40-60 cm",
    "60-80 cm",
    "80-100 cm",
    "Boven 100 cm",
  ],
  breedte: [
    "Onder 20 cm",
    "20-40 cm",
    "40-60 cm",
    "60-80 cm",
    "80-100 cm",
    "Boven 100 cm",
  ],
  length: [
    "Onder 40 cm",
    "40-60 cm",
    "60-80 cm",
    "80-100 cm",
    "100-120 cm",
    "Boven 120 cm",
  ],
  lengte: [
    "Onder 40 cm",
    "40-60 cm",
    "60-80 cm",
    "80-100 cm",
    "100-120 cm",
    "Boven 120 cm",
  ],
  height: [
    "Onder 20 cm",
    "20-50 cm",
    "50-100 cm",
    "100-150 cm",
    "Boven 150 cm",
  ],
  hoogte: [
    "Onder 20 cm",
    "20-50 cm",
    "50-100 cm",
    "100-150 cm",
    "Boven 150 cm",
  ],
};

export function getStandardDimensionOptions(slug?: string): string[] {
  if (!slug) return [];
  const normalized = slug.toLowerCase();
  return STANDARD_DIMENSION_BUCKETS[normalized] || [
    "Onder 20 cm",
    "20-40 cm",
    "40-60 cm",
    "60-80 cm",
    "80-100 cm",
    "Boven 100 cm",
  ];
}

/**
 * Parses numeric dimension range from any string format:
 * - "36cm" -> { min: 36, max: 36 }
 * - "Ø 40 cm" -> { min: 40, max: 40 }
 * - "20-40 cm" / "20 - 40 cm" -> { min: 20, max: 40 }
 * - "Onder 20 cm" / "Under 20 cm" / "< 20 cm" -> { min: 0, max: 20 }
 * - "Boven 80 cm" / "Over 80 cm" / "> 80 cm" -> { min: 80, max: 9999 }
 * - "25x25" -> { min: 25, max: 25 }
 * - "80 Cm" -> { min: 80, max: 80 }
 * - "L100" / "C2609-L100" -> { min: 100, max: 100 }
 */
export function parseDimensionRange(raw: string): ParsedRange | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // 1. Explicit range: "20-40 cm", "20 - 40 cm", "20 tot 40"
  const rangeMatch = str.match(/(\d+(?:[.,]\d+)?)\s*(?:cm|mm)?\s*[-–—totot]+\s*(\d+(?:[.,]\d+)?)\s*(?:cm|mm)?/i);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1].replace(",", "."));
    const max = parseFloat(rangeMatch[2].replace(",", "."));
    if (!isNaN(min) && !isNaN(max)) {
      return { min: Math.min(min, max), max: Math.max(min, max) };
    }
  }

  // 2. Under / Onder / <
  const underMatch = str.match(/(?:under|onder|<|tot)\s*(\d+(?:[.,]\d+)?)/i);
  if (underMatch) {
    const val = parseFloat(underMatch[1].replace(",", "."));
    if (!isNaN(val)) return { min: 0, max: val };
  }

  // 3. Over / Boven / >
  const overMatch = str.match(/(?:over|boven|>|vanaf)\s*(\d+(?:[.,]\d+)?)/i);
  if (overMatch) {
    const val = parseFloat(overMatch[1].replace(",", "."));
    if (!isNaN(val)) return { min: val, max: 9999 };
  }

  // 4. Matrix size like "25x25" or "25×25"
  const xMatch = str.match(/(\d+(?:[.,]\d+)?)\s*[x×X*]\s*(\d+(?:[.,]\d+)?)/);
  if (xMatch) {
    const d1 = parseFloat(xMatch[1].replace(",", "."));
    const d2 = parseFloat(xMatch[2].replace(",", "."));
    if (!isNaN(d1) && !isNaN(d2)) {
      return { min: Math.min(d1, d2), max: Math.max(d1, d2) };
    }
  }

  // 5. SKU/Code size prefix: "L100", "L-100", "D80", "D100", "W60"
  const prefixMatch = str.match(/(?:^|[^a-zA-Z0-9])(?:L|D|W|H)[-–—_]?(\d{2,4})\b/i);
  if (prefixMatch) {
    let val = parseFloat(prefixMatch[1]);
    if (!isNaN(val)) {
      if (val > 300) val = val / 10; // e.g. L1000mm -> 100cm
      return { min: val, max: val };
    }
  }

  // 6. Single number: "36cm", "Ø 40 cm", "80 Cm", "12 cm", "100 cm"
  const numMatch = str.match(/\b(\d+(?:[.,]\d+)?)\s*(?:cm|mm)?\b/i);
  if (numMatch) {
    let val = parseFloat(numMatch[1].replace(",", "."));
    if (/mm/i.test(str) && val > 100) {
      val = val / 10; // convert mm to cm
    }
    if (!isNaN(val)) {
      return { min: val, max: val };
    }
  }

  return null;
}

/** Check if two parsed ranges overlap */
function rangesOverlap(r1: ParsedRange, r2: ParsedRange): boolean {
  // If r1 is a single point (e.g. 36cm):
  if (r1.min === r1.max) {
    return r1.min >= r2.min && r1.min <= r2.max;
  }
  // If r2 is a single point:
  if (r2.min === r2.max) {
    return r2.min >= r1.min && r2.min <= r1.max;
  }
  // If both are ranges:
  return r1.min < r2.max && r1.max > r2.min;
}

function cleanSpecKey(key: string): string {
  return (key.includes("::") ? key.split("::").pop()! : key).trim();
}

function specKeyToAttrSlug(key: string): string {
  const clean = cleanSpecKey(key);
  if (SPEC_KEY_TO_ATTR_SLUG[clean]) return SPEC_KEY_TO_ATTR_SLUG[clean];
  return clean.toLowerCase().replace(/\s+/g, "-");
}

function pushValue(bucket: string[], value: unknown): void {
  if (value == null || value === "") return;
  if (Array.isArray(value)) {
    value.forEach((v) => pushValue(bucket, v));
    return;
  }
  bucket.push(String(value).trim());
}

function specKeyMatchesAttr(specKey: string, attrSlug: string, attributeName?: string): boolean {
  const clean = cleanSpecKey(specKey);
  if (specKeyToAttrSlug(specKey) === attrSlug.toLowerCase()) return true;
  if (attributeName && clean.toLowerCase() === attributeName.toLowerCase()) return true;
  return false;
}

/** Collect raw filterable values from product records */
export function getProductRawFilterValues(
  product: any,
  attrSlug: string,
  attributeName?: string
): string[] {
  const values: string[] = [];

  // Legacy flat map: { color: "Black", material: ["Metal"] }
  if (product?.attributes?.[attrSlug] != null) {
    pushValue(values, product.attributes[attrSlug]);
  }

  // API EAV: productAttributeValues[]
  if (Array.isArray(product?.productAttributeValues)) {
    product.productAttributeValues.forEach((pav: any) => {
      if (pav?.attribute?.slug === attrSlug) {
        pushValue(values, pav?.attributeValue?.value);
      }
    });
  }

  // Legacy top-level fields (mock data)
  const flat = product?.[attrSlug];
  if (flat != null) {
    pushValue(values, flat);
  }

  // Specs — object or [{ key, value }]
  const specs = product?.specs;
  if (specs) {
    if (Array.isArray(specs)) {
      specs.forEach((entry: any) => {
        if (!entry?.key) return;
        if (specKeyMatchesAttr(entry.key, attrSlug, attributeName)) {
          pushValue(values, entry.value);
        }
      });
    } else if (typeof specs === "object") {
      Object.entries(specs).forEach(([rawKey, val]) => {
        if (specKeyMatchesAttr(rawKey, attrSlug, attributeName)) {
          pushValue(values, val);
        }
      });
    }
  }

  return [...new Set(values.filter(Boolean))];
}

/** Collect all filterable values for an attribute slug from attributes + specs + legacy fields. */
export function getProductFilterValues(
  product: any,
  attrSlug: string,
  attributeName?: string
): string[] {
  const rawValues = getProductRawFilterValues(product, attrSlug, attributeName);

  // If this is a dimension attribute, map the raw values into standard range buckets
  if (isDimensionAttribute(attrSlug)) {
    const standardBuckets = getStandardDimensionOptions(attrSlug);
    const matchedBuckets: string[] = [];

    const productRanges = rawValues.map(parseDimensionRange).filter(Boolean) as ParsedRange[];
    for (const bucketLabel of standardBuckets) {
      const bucketRange = parseDimensionRange(bucketLabel);
      if (bucketRange) {
        const matches = productRanges.some((pRange) => rangesOverlap(pRange, bucketRange));
        if (matches) {
          matchedBuckets.push(bucketLabel);
        }
      }
    }

    if (matchedBuckets.length > 0) {
      return matchedBuckets;
    }
  }

  return rawValues;
}

/** OR within one attribute, AND across attributes (handled by caller loop). */
export function productMatchesAttributeFilter(
  product: any,
  attrSlug: string,
  selectedValues: string[],
  attributeName?: string
): boolean {
  if (!selectedValues.length) return true;

  // For dimension attributes, compare parsed numeric ranges
  if (isDimensionAttribute(attrSlug)) {
    const rawValues = getProductRawFilterValues(product, attrSlug, attributeName);
    const productRanges = rawValues.map(parseDimensionRange).filter(Boolean) as ParsedRange[];
    if (!productRanges.length) return false;

    return selectedValues.some((selectedVal) => {
      const filterRange = parseDimensionRange(selectedVal);
      if (!filterRange) {
        return rawValues.some((rv) => rv.toLowerCase() === selectedVal.toLowerCase());
      }
      return productRanges.some((pRange) => rangesOverlap(pRange, filterRange));
    });
  }

  const productValues = getProductFilterValues(product, attrSlug, attributeName);
  if (!productValues.length) return false;

  const normalizedSelected = selectedValues.map((v) => v.toLowerCase());
  return productValues.some((pv) => normalizedSelected.includes(pv.toLowerCase()));
}

export function countProductsWithFilterValue(
  products: any[],
  type: "brand" | "attribute",
  attrSlug: string,
  value: string,
  attributeName?: string
): number {
  if (type === "brand") {
    return products.filter((p) => getProductBrandName(p.brand) === value).length;
  }
  return products.filter((p) => productMatchesAttributeFilter(p, attrSlug, [value], attributeName)).length;
}

