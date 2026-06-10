import { getProductBrandName } from "@/utils/formatters";

/** Map product spec labels to attribute slugs used in filters. */
const SPEC_KEY_TO_ATTR_SLUG: Record<string, string> = {
  Material: "material",
  Color: "color",
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
  Height: "height",
  Width: "width",
  Diameter: "diameter",
  "Number of lights": "number-of-lights",
  Series: "series",
};

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

/** Collect all filterable values for an attribute slug from attributes + specs + legacy fields. */
export function getProductFilterValues(
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

/** OR within one attribute, AND across attributes (handled by caller loop). */
export function productMatchesAttributeFilter(
  product: any,
  attrSlug: string,
  selectedValues: string[],
  attributeName?: string
): boolean {
  if (!selectedValues.length) return true;

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
