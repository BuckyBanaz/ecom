// Helper to get Sendcloud config (similar to how the API endpoint works)
export const getSendcloudConfig = () => {
  return {
    enabled: process.env.SENDCLOUD_ENABLED === "true" || process.env.SENDCLOUD_ENABLED === "1",
    publicKey: process.env.SENDCLOUD_PUBLIC_KEY || "",
    secretKey: process.env.SENDCLOUD_SECRET_KEY || "",
  };
};

const assertHasKeys = (config: ReturnType<typeof getSendcloudConfig>) => {
  if (!config.publicKey || !config.secretKey) {
    throw new Error("Sendcloud API keys are not configured. Please add them in Admin > Settings > Shipping.");
  }
};

export const getSendcloudAuthHeaders = () => {
  const config = getSendcloudConfig();
  const token = Buffer.from(`${config.publicKey}:${config.secretKey}`).toString("base64");
  
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  };
};

const BASE_URL_V3 = "https://panel.sendcloud.sc/api/v3";
const BASE_URL_V2 = "https://panel.sendcloud.sc/api/v2";

const normalizePostalCode = (postalCode: string, countryCode: string) => {
  const trimmed = String(postalCode || "").trim();
  if (!trimmed) return trimmed;
  const compact = trimmed.replace(/\s+/g, "");
  if (countryCode === "NL" && /^\d{4}[A-Za-z]{2}$/.test(compact)) {
    return compact.toUpperCase();
  }
  return trimmed;
};

export const sendcloudApi = {
  /**
   * Helper to fetch the default sender address from the Sendcloud account
   */
  async getDefaultSenderAddress() {
    try {
      const response = await fetch(`${BASE_URL_V2}/user/addresses/sender`, {
        method: "GET",
        headers: getSendcloudAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const defaultAddr = data.sender_addresses?.find((addr: any) => addr.is_default) || data.sender_addresses?.[0];
        if (defaultAddr) {
          console.log("📦 Default Sender Address from Sendcloud API:", JSON.stringify(defaultAddr, null, 2));
          return {
            id: defaultAddr.id,
            name: defaultAddr.contact_name || defaultAddr.company_name || "Sender",
            company_name: defaultAddr.company_name || "",
            address_line_1: defaultAddr.address || defaultAddr.street || defaultAddr.address_line_1 || defaultAddr.address1 || "Zegwaardstraat",
            house_number: defaultAddr.house_number || "1",
            postal_code: defaultAddr.postal_code || "3035 TM",
            city: defaultAddr.city || "Rotterdam",
            country_code: defaultAddr.country || "NL",
            phone_number: defaultAddr.telephone || "",
            email: defaultAddr.email || "",
          };
        }
      }
    } catch (e) {
      console.warn("⚠️ Failed to fetch default sender address from Sendcloud:", e);
    }
    // Return a default fallback if API call fails or no address is set up
    return {
      name: "MERN Shop Warehouse",
      company_name: "MERN Shop",
      address_line_1: "Zegwaardstraat",
      house_number: "1",
      postal_code: "3035 TM",
      city: "Rotterdam",
      country_code: "NL",
      phone_number: "+31612345678",
      email: "warehouse@example.com"
    };
  },

  /**
   * Helper to resolve the V3 shipping option code from a V2 method ID
   */
  async getV2ShippingMethodById(shippingMethodId: number) {
    const data = await this.getShippingMethods();
    return data.shipping_methods?.find((method: any) => Number(method.id) === Number(shippingMethodId));
  },

  async getShippingOptionCode(shippingMethodId: number) {
    try {
      const response = await fetch(`${BASE_URL_V3}/compat/shipping-options`, {
        method: "POST",
        headers: getSendcloudAuthHeaders(),
        body: JSON.stringify({ shipping_method_ids: [shippingMethodId] }),
      });

      const raw = await response.text();
      if (response.ok) {
        const data = JSON.parse(raw);
        const optionCode = data.data?.[String(shippingMethodId)];
        if (optionCode) {
          console.log(`📦 Mapped shipping method ${shippingMethodId} → ${optionCode}`);
          return optionCode;
        }
      } else {
        console.warn("⚠️ Sendcloud compat mapping failed:", response.status, raw);
      }
    } catch (e) {
      console.warn("⚠️ Failed to fetch shipping option code mapping:", e);
    }

    const method = await this.getV2ShippingMethodById(shippingMethodId);
    const methodName = String(method?.name || "").toLowerCase();
    if (methodName.includes("unstamp") || methodName.includes("letter")) {
      return "sendcloud:letter";
    }

    throw new Error(
      `Could not map shipping method ${shippingMethodId}${method?.name ? ` (${method.name})` : ""} to a Sendcloud v3 option.`
    );
  },

  async fetchShippingOptions(filter: Record<string, unknown>) {
    const response = await fetch(`${BASE_URL_V3}/shipping-options`, {
      method: "POST",
      headers: getSendcloudAuthHeaders(),
      body: JSON.stringify(filter),
    });

    const raw = await response.text();
    if (!response.ok) {
      console.warn("⚠️ Sendcloud shipping-options failed:", response.status, raw);
      return [];
    }

    const data = JSON.parse(raw);
    const options = Array.isArray(data.data) ? data.data : [];
    console.log(`📦 Sendcloud shipping-options returned ${options.length} option(s)`);
    return options;
  },

  pickShippingOption(options: any[], preferredCode: string, v2Method?: any) {
    if (!options.length) return null;

    const exact = options.find((option) => option.code === preferredCode);
    if (exact) return exact;

    const byPrefix = options.find(
      (option) =>
        option.code?.startsWith(`${preferredCode}/`) ||
        option.code?.startsWith(`${preferredCode}:`) ||
        preferredCode.startsWith(String(option.product?.code || ""))
    );
    if (byPrefix) return byPrefix;

    if (v2Method?.name) {
      const targetName = String(v2Method.name).toLowerCase();
      const byName = options.find((option) => String(option.name || "").toLowerCase() === targetName);
      if (byName) return byName;
    }

    if (v2Method?.carrier) {
      const byCarrier = options.find((option) => option.carrier?.code === v2Method.carrier);
      if (byCarrier) return byCarrier;
    }

    return options[0];
  },

  async resolveShipmentShippingOption(params: {
    senderAddress: any;
    parcelData: any;
    shippingMethodId: number;
    preferredCode: string;
    v2Method?: any;
  }) {
    const { senderAddress, parcelData, shippingMethodId, preferredCode, v2Method } = params;
    const weightValue = parseFloat(parcelData.weight || "1").toFixed(3);
    const toCountry = parcelData.country;
    const fromCountry = senderAddress.country_code || "NL";

    if (preferredCode === "sendcloud:letter") {
      return { code: "sendcloud:letter", contractId: undefined, name: "Unstamped letter" };
    }

    const baseFilter = {
      from_address: {
        country_code: fromCountry,
        postal_code: normalizePostalCode(senderAddress.postal_code, fromCountry),
        address_line_1: senderAddress.address_line_1,
        city: senderAddress.city,
      },
      to_address: {
        country_code: toCountry,
        postal_code: normalizePostalCode(parcelData.postal_code, toCountry),
        address_line_1: parcelData.address,
        city: parcelData.city,
      },
      parcels: [{ weight: { value: weightValue, unit: "kg" } }],
      calculate_quotes: false,
    };

    let options = await this.fetchShippingOptions({
      ...baseFilter,
      shipping_option_code: preferredCode,
    });

    if (!options.length && v2Method?.carrier) {
      options = await this.fetchShippingOptions({
        ...baseFilter,
        carrier_code: v2Method.carrier,
      });
    }

    if (!options.length) {
      options = await this.fetchShippingOptions(baseFilter);
    }

    const selected = this.pickShippingOption(options, preferredCode, v2Method);
    if (!selected) {
      throw new Error(
        `No active Sendcloud shipping option found for method ${shippingMethodId}${v2Method?.name ? ` (${v2Method.name})` : ""} on route ${fromCountry} → ${toCountry}. Enable the carrier in Sendcloud or choose another method.`
      );
    }

    console.log(
      `📦 Resolved shipping option: ${selected.code} (contract ${selected.contract?.id ?? "n/a"}) for method ${shippingMethodId}`
    );

    return {
      code: selected.code,
      contractId: selected.contract?.id,
      name: selected.name,
    };
  },

  /**
   * Create and announce a shipment in Sendcloud — API v3
   */
  async createParcel(parcelData: any) {
    const config = getSendcloudConfig();
    assertHasKeys(config);

    const shippingMethodId = Number(parcelData.shipment?.id);
    if (!shippingMethodId || Number.isNaN(shippingMethodId)) {
      throw new Error("Please select a shipping carrier before creating the label.");
    }

    const [senderAddress, preferredCode, v2Method] = await Promise.all([
      this.getDefaultSenderAddress(),
      this.getShippingOptionCode(shippingMethodId),
      this.getV2ShippingMethodById(shippingMethodId),
    ]);

    const resolvedOption = await this.resolveShipmentShippingOption({
      senderAddress,
      parcelData,
      shippingMethodId,
      preferredCode,
      v2Method,
    });

    const shipWithProperties: Record<string, unknown> = {
      shipping_option_code: resolvedOption.code,
    };
    if (resolvedOption.contractId) {
      shipWithProperties.contract_id = resolvedOption.contractId;
    }

    const toCountry = parcelData.country;
    const shipmentBody = {
      to_address: {
        name: parcelData.name,
        company_name: parcelData.company_name || "",
        address_line_1: parcelData.address,
        house_number: parcelData.house_number || "",
        postal_code: normalizePostalCode(parcelData.postal_code, toCountry),
        city: parcelData.city,
        country_code: toCountry,
        phone_number: parcelData.telephone || "",
        email: parcelData.email || "",
      },
      from_address: senderAddress.id
        ? { sender_address_id: senderAddress.id }
        : {
            name: senderAddress.name,
            company_name: senderAddress.company_name || "",
            address_line_1: senderAddress.address_line_1,
            house_number: senderAddress.house_number || "",
            postal_code: senderAddress.postal_code,
            city: senderAddress.city,
            country_code: senderAddress.country_code,
            phone_number: senderAddress.phone_number || "",
            email: senderAddress.email || "",
          },
      ship_with: {
        type: "shipping_option_code",
        properties: shipWithProperties,
      },
      order_number: parcelData.order_number,
      parcels: [
        {
          weight: {
            value: parseFloat(parcelData.weight || "1").toFixed(3),
            unit: "kg",
          },
        },
      ],
    };

    console.log("📦 Sendcloud v3 Shipment Body:", JSON.stringify(shipmentBody, null, 2));

    const response = await fetch(`${BASE_URL_V3}/shipments/announce`, {
      method: "POST",
      headers: getSendcloudAuthHeaders(),
      body: JSON.stringify(shipmentBody),
    });

    const raw = await response.text();
    if (!response.ok) {
      console.error("❌ Sendcloud createParcel FAILED:", response.status, raw);
      throw new Error(this.parseSendcloudError(raw, response.status));
    }

    const data = JSON.parse(raw);
    console.log("📦 Sendcloud v3 Shipment Response:", JSON.stringify(data, null, 2));

    const shipment = data.data;
    const parcel = shipment?.parcels?.[0];
    if (!parcel) {
      throw new Error("Sendcloud accepted the request but returned no parcel data.");
    }

    const shipmentErrors = Array.isArray(shipment?.errors) ? shipment.errors : [];
    if (shipmentErrors.length > 0) {
      const detail = shipmentErrors.map((err: any) => err.detail || err.title).filter(Boolean).join(" | ");
      throw new Error(detail || "Sendcloud could not announce this shipment.");
    }

    const labelUrl = parcel?.documents?.find((doc: any) => doc.link)?.link || "";
    const carrier = shipment?.carrier?.name || shipment?.carrier?.code || v2Method?.carrier || "Sendcloud";

    return {
      parcel: {
        ...parcel,
        tracking_number: parcel.tracking_number || "",
        tracking_url: parcel.tracking_url || "",
        carrier,
        status: parcel.status || { message: "Label Generated" },
        documents: labelUrl ? [{ link: labelUrl }] : parcel.documents || [],
      },
    };
  },

  parseSendcloudError(raw: string, status: number) {
    let friendly = `Sendcloud create shipment failed (${status})`;
    try {
      const parsed = JSON.parse(raw);
      const detail =
        parsed?.errors?.[0]?.detail ||
        parsed?.error?.message ||
        parsed?.parcel?.errors?.[0] ||
        parsed?.message;
      if (detail) {
        friendly = String(detail);
      }
    } catch {
      if (raw) friendly = raw;
    }

    if (/not allowed to announce/i.test(friendly)) {
      friendly +=
        " Enable direct debit billing in the Sendcloud panel (Settings > Billing) and ensure the selected carrier contract is active.";
    }

    return friendly;
  },

  /**
   * Get available shipping methods (using v2 for dropdown selection compatibility)
   * Note: Sendcloud v2 doesn't support query filters. We fetch all and return them.
   * Frontend will filter by destination country and weight constraints.
   */
  async getShippingMethods(_toCountry?: string, _weight?: number) {
    const config = getSendcloudConfig();
    assertHasKeys(config);

    // Sendcloud v2 doesn't support ?to_country or ?weight filters in API
    // Always fetch all methods; filtering is done client-side
    const url = `${BASE_URL_V2}/shipping_methods`;
    console.log(`📡 Sendcloud v2 API - Fetching all shipping methods`);

    const response = await fetch(url, {
      method: "GET",
      headers: getSendcloudAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Sendcloud shipping_methods failed (${response.status}):`, errorData);
      throw new Error(`Sendcloud get shipping methods failed: ${errorData}`);
    }

    const data = await response.json();
    const methodCount = data?.shipping_methods?.length || 0;
    console.log(`✅ Sendcloud returned ${methodCount} shipping methods (total available)`);
    if (methodCount > 0 && methodCount <= 20) {
      console.log("   Methods:", data.shipping_methods.map((m: any) => ({ id: m.id, name: m.name, to_country: m.to_country })));
    }

    return data;
  },

  /**
   * Generate label for a parcel (after it's announced)
   */
  async getLabel(parcelId: string | number) {
    const config = getSendcloudConfig();
    assertHasKeys(config);

    const response = await fetch(`${BASE_URL_V2}/parcels/${parcelId}/documents/label`, {
      method: "GET",
      headers: getSendcloudAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Sendcloud get label failed: ${errorData}`);
    }

    return response.buffer ? await response.buffer() : await response.arrayBuffer();
  },

  /**
   * Cancel parcel in Sendcloud by order number
   */
  async cancelParcelByOrderNumber(orderNumber: string) {
    const config = getSendcloudConfig();
    try {
      assertHasKeys(config);

      // 1. Find the parcel by order number
      const response = await fetch(`${BASE_URL_V2}/parcels?order_number=${encodeURIComponent(orderNumber)}`, {
        method: "GET",
        headers: getSendcloudAuthHeaders(),
      });

      if (!response.ok) {
        console.warn(`⚠️ Failed to find Sendcloud parcel for order ${orderNumber}`);
        return;
      }

      const data = await response.json();
      const parcels = data.parcels || [];
      
      // 2. Cancel all active parcels for this order number
      for (const parcel of parcels) {
        if (parcel.id && parcel.status?.id !== 999 && parcel.status?.id !== 1000) { // Keep out already cancelled/failed statuses
          console.log(`📦 Cancelling Sendcloud parcel ${parcel.id} for order ${orderNumber}`);
          const cancelResponse = await fetch(`${BASE_URL_V2}/parcels/${parcel.id}/cancel`, {
            method: "POST",
            headers: getSendcloudAuthHeaders(),
            body: JSON.stringify({}),
          });
          if (!cancelResponse.ok) {
            const errText = await cancelResponse.text();
            console.warn(`⚠️ Failed to cancel parcel ${parcel.id}:`, errText);
          } else {
            console.log(`✅ Successfully cancelled Sendcloud parcel ${parcel.id}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error cancelling Sendcloud parcel for order ${orderNumber}:`, error);
    }
  }
};
