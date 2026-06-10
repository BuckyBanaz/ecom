export function parseOrderMetadata(shippingAddressRaw: string) {
  let formattedAddress = shippingAddressRaw;
  let tax = 0;
  let discount = 0;
  let phone = "";
  let email = "";
  let firstName = "";
  let lastName = "";
  let street = "";
  let houseNumber = "";
  let landmark = "";
  let city = "";
  let state = "";
  let pincode = "";
  let country = "";

  try {
    if (shippingAddressRaw && shippingAddressRaw.startsWith("{")) {
      const parsed = JSON.parse(shippingAddressRaw);
      firstName = parsed.firstName || "";
      lastName = parsed.lastName || "";
      phone = parsed.phone || "";
      email = parsed.email || "";
      street = parsed.street || "";
      houseNumber = parsed.houseNumber || "";
      landmark = parsed.landmark || "";
      city = parsed.city || "";
      state = parsed.state || "";
      pincode = parsed.pincode || "";
      country = parsed.country || "";

      const parts = [
        `${firstName} ${lastName}`.trim(),
        `${street} ${houseNumber}`.trim(),
        landmark ? `Landmark: ${landmark}` : "",
        `${city} ${pincode}`.trim(),
        state,
        country
      ].filter(Boolean);

      if (parts.length > 0) {
        formattedAddress = parts.join(", ");
      }

      if (parsed._meta) {
        tax = Number(parsed._meta.tax) || 0;
        discount = Number(parsed._meta.discount) || 0;
      }
    }
  } catch (e) {
    // Ignore parse errors, fallback to raw
  }

  return {
    formattedAddress,
    tax,
    discount,
    phone,
    email,
    firstName,
    lastName,
    street,
    houseNumber,
    landmark,
    city,
    state,
    pincode,
    country
  };
}

/** Safe brand label — API may return brand: null (typeof null === "object" in JS). */
export function getProductBrandName(brand: unknown): string {
  if (brand == null) return "";
  if (typeof brand === "string") return brand;
  if (typeof brand === "object" && !Array.isArray(brand)) {
    return (brand as { name?: string | null }).name ?? "";
  }
  return "";
}

export function getProductCategorySlug(category: unknown): string {
  if (category == null) return "";
  if (typeof category === "string") return category;
  if (typeof category === "object" && !Array.isArray(category)) {
    return String((category as { slug?: string }).slug ?? "");
  }
  return "";
}

/** Normalize API product so null brand/category never crash the UI. */
export function normalizeApiProduct<T extends Record<string, unknown>>(product: T): T {
  if (!product || typeof product !== "object") return product;
  return {
    ...product,
    brand: getProductBrandName(product.brand),
    category:
      product.category == null
        ? ""
        : typeof product.category === "object" && !Array.isArray(product.category)
          ? {
              ...(product.category as object),
              name: (product.category as { name?: string | null }).name ?? "",
              slug: getProductCategorySlug(product.category),
            }
          : product.category,
    rating: (product.rating as number) ?? 0,
    reviewCount: (product.reviewCount as number) ?? 0,
  };
}

