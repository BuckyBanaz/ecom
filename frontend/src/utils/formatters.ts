export function parseOrderMetadata(shippingAddressRaw: string) {
  let formattedAddress = shippingAddressRaw;
  let tax = 0;
  let discount = 0;
  let phone = "";
  let email = "";
  let firstName = "";
  let lastName = "";
  let street = "";
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
      city = parsed.city || "";
      state = parsed.state || "";
      pincode = parsed.pincode || "";
      country = parsed.country || "";

      const parts = [
        `${firstName} ${lastName}`.trim(),
        street,
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
    city,
    state,
    pincode,
    country
  };
}

