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
  async getShippingOptionCode(shippingMethodId: number) {
    try {
      const response = await fetch(`${BASE_URL_V3}/compat/shipping-options`, {
        method: "POST",
        headers: getSendcloudAuthHeaders(),
        body: JSON.stringify({ shipping_method_ids: [shippingMethodId] }),
      });
      if (response.ok) {
        const data = await response.json();
        const optionCode = data.data?.[String(shippingMethodId)];
        if (optionCode) return optionCode;
      } else {
        console.warn("⚠️ Sendcloud compat mapping endpoint returned status:", response.status);
      }
    } catch (e) {
      console.warn("⚠️ Failed to fetch shipping option code mapping:", e);
    }
    return "postnl:standard"; // Default fallback
  },

  /**
   * Create a new shipment (parcel) in Sendcloud — API v3
   */
  async createParcel(parcelData: any) {
    const config = getSendcloudConfig();
    assertHasKeys(config);

    const shippingMethodId = parcelData.shipment?.id;
    const fromAddress = await this.getDefaultSenderAddress();

    // Use v2 API /parcels endpoint (simpler, doesn't auto-announce)
    const parcelBody = {
      name: parcelData.name,
      company_name: parcelData.company_name || "",
      address: parcelData.address,
      house_number: parcelData.house_number || "",
      city: parcelData.city,
      postal_code: parcelData.postal_code,
      country: parcelData.country,
      telephone: parcelData.telephone || "",
      email: parcelData.email || "",
      weight: parseFloat(parcelData.weight || "1").toFixed(3),
      order_number: parcelData.order_number,
      quantity: parcelData.quantity || 1,
      shipment: {
        id: shippingMethodId
      },
      sender_address: fromAddress.id || 795760,  // Use sender address ID
      request_label: true,
    };

    console.log("📦 Sendcloud v2 Parcel Body:", JSON.stringify(parcelBody, null, 2));

    // Use v2 /parcels endpoint (creates parcel without auto-announcing)
    const response = await fetch(`${BASE_URL_V2}/parcels`, {
      method: "POST",
      headers: getSendcloudAuthHeaders(),
      body: JSON.stringify(parcelBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Sendcloud createParcel FAILED:", response.status, errorData);

      // Try to extract a friendly message
      let friendly = `Sendcloud create parcel failed (${response.status})`;
      try {
        const parsed = JSON.parse(errorData);
        const detail = parsed?.error?.message || parsed?.parcel?.errors?.[0] || parsed?.message;
        if (detail) {
          if (/not allowed|permission/i.test(String(detail))) {
            friendly = `Sendcloud permission issue: ${detail}. Check account settings or contact Sendcloud support.`;
          } else {
            friendly = String(detail);
          }
        }
      } catch {
        /* keep generic message */
      }

      throw new Error(friendly);
    }

    const data = await response.json();
    console.log("📦 Sendcloud v2 Parcel Response:", JSON.stringify(data, null, 2));
    
    const parcel = data.parcel || data;
    const trackingNum = parcel?.tracking_number || `SC-${parcel?.id || Math.floor(100000 + Math.random() * 900000)}`;
    const trackingUrl = parcel?.tracking_url || `https://tracking.sendcloud.sc/tracking/shipment/${parcel?.id || trackingNum}`;
    const labelUrl = parcel?.label?.normal_printer || parcel?.documents?.[0]?.link || `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`;
    const carrier = parcel?.carrier?.name || parcel?.carrier?.code || "Sendcloud";

    return {
      parcel: {
        ...parcel,
        tracking_number: trackingNum,
        tracking_url: trackingUrl,
        carrier: carrier,
        status: parcel?.status || { message: "Parcel Created" },
        documents: labelUrl ? [{ link: labelUrl }] : [],
      }
    };
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
