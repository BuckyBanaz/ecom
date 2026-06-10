/**
 * Flatten null brand/category for API clients.
 * JS: typeof null === "object" — old frontends crash on brand.name when brand is null.
 */
export function sanitizeProductForClient<T extends Record<string, unknown>>(product: T): T {
  if (!product || typeof product !== "object") return product;

  const raw = product as T & {
    brand?: { id?: string; name?: string | null } | string | null;
    category?: { id?: string; name?: string | null; slug?: string | null } | string | null;
  };

  const brand =
    raw.brand == null
      ? ""
      : typeof raw.brand === "object"
        ? raw.brand.name ?? ""
        : String(raw.brand);

  let category: typeof raw.category;
  if (raw.category == null) {
    category = "";
  } else if (typeof raw.category === "object") {
    category = {
      ...raw.category,
      name: raw.category.name ?? "",
      slug: raw.category.slug ?? "",
    };
  } else {
    category = raw.category;
  }

  return { ...raw, brand, category };
}

export function sanitizeProductsForClient<T extends Record<string, unknown>>(products: T[]): T[] {
  return products.map(sanitizeProductForClient);
}
