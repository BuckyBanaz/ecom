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
  if (typeof brand === "object" && "name" in brand) {
    const name = (brand as { name?: string }).name;
    return name ?? "";
  }
  return String(brand);
}

export function getProductCategorySlug(category: unknown): string {
  if (category == null) return "";
  if (typeof category === "object" && "slug" in category) {
    return String((category as { slug?: string }).slug ?? "");
  }
  return String(category);
}

