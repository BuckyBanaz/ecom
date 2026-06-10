import { ENDPOINTS, getBaseUrl, API_PREFIX } from "../utils/endpoints";
import { cacheKey, getCached, isCacheStale, setCache } from "../lib/apiCache";
import { normalizeApiProduct } from "../utils/formatters";
import { translateJsonObject } from "../utils/translator";

type RequestOptions = RequestInit & { cacheTtl?: number };

const inflight = new Map<string, Promise<unknown>>();

async function fetchAndParse<T>(url: string, config: RequestInit): Promise<T> {
  const isAdminPanel = window.location.pathname.startsWith("/admin");
  const token = isAdminPanel
    ? (localStorage.getItem("admin_token") || localStorage.getItem("customer_token"))
    : (localStorage.getItem("customer_token") || localStorage.getItem("admin_token"));

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...config.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...config, headers });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || `HTTP Error ${response.status}`;
    if (response.status === 403 && message.toLowerCase().includes("suspended")) {
      window.dispatchEvent(new CustomEvent("admin-suspended", { detail: message }));
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

// Helper request wrapper around fetch with optional GET caching
async function request<T>(url: string, config: RequestOptions = {}): Promise<T> {
  const method = (config.method || "GET").toUpperCase();
  const isAdminPanel = window.location.pathname.startsWith("/admin");
  const { cacheTtl, ...fetchConfig } = config;
  const key = cacheKey(method, url);

  if (method === "GET" && cacheTtl && !isAdminPanel) {
    const cached = getCached<T>(key);
    if (cached) {
      const staleAfter = Math.floor(cacheTtl / 3);
      if (isCacheStale(key, staleAfter) && !inflight.has(key)) {
        inflight.set(
          key,
          fetchAndParse<T>(url, fetchConfig)
            .then(async (fresh) => {
              const currentLang = localStorage.getItem("i18nextLng") || "nl";
              const translated = await translateJsonObject(fresh, currentLang);
              setCache(key, translated, cacheTtl);
              return translated;
            })
            .finally(() => inflight.delete(key))
        );
      }
      return cached;
    }
  }

  const promise = fetchAndParse<T>(url, fetchConfig);
  if (method === "GET" && cacheTtl && !isAdminPanel) {
    return promise.then(async (data) => {
      const currentLang = localStorage.getItem("i18nextLng") || "nl";
      const translated = await translateJsonObject(data, currentLang);
      setCache(key, translated, cacheTtl);
      return translated;
    });
  }

  return promise.then(async (data) => {
    if (!isAdminPanel && method === "GET") {
      const currentLang = localStorage.getItem("i18nextLng") || "nl";
      return await translateJsonObject(data, currentLang);
    }
    return data;
  });
}

const CACHE = {
  SHORT: 5 * 60_000,
  MEDIUM: 15 * 60_000,
  LONG: 30 * 60_000,
} as const;

// 1. Products Repository
export const productRepository = {
  getAll: async (filters: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        query.append(key, String(val));
      }
    });
    const queryString = query.toString();
    const url = queryString ? `${ENDPOINTS.PRODUCTS}?${queryString}` : ENDPOINTS.PRODUCTS;
    const data = await request<any>(url, { method: "GET", cacheTtl: CACHE.MEDIUM });
    if (data?.products) {
      data.products = data.products.map(normalizeApiProduct);
    }
    return data;
  },
  
  getByIdOrSlug: async (idOrSlug: string) => {
    const data = await request<any>(`${ENDPOINTS.PRODUCTS}/${idOrSlug}`, { method: "GET", cacheTtl: CACHE.MEDIUM });
    if (data?.product) {
      data.product = normalizeApiProduct(data.product);
    }
    return data;
  },
  
  create: async (data: any) => {
    return request<any>(ENDPOINTS.PRODUCTS, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  update: async (id: string, data: any) => {
    return request<any>(`${ENDPOINTS.PRODUCTS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  
  delete: async (id: string) => {
    return request<any>(`${ENDPOINTS.PRODUCTS}/${id}`, { method: "DELETE" });
  },
};

// 2. Categories Repository
export const categoryRepository = {
  getAll: async () => {
    return request<any>(ENDPOINTS.CATEGORIES, { method: "GET", cacheTtl: CACHE.LONG });
  },
  
  create: async (data: any) => {
    return request<any>(ENDPOINTS.CATEGORIES, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  update: async (id: string, data: any) => {
    return request<any>(`${ENDPOINTS.CATEGORIES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  
  delete: async (id: string, options?: { reassignToCategoryId?: string }) => {
    const qs = options?.reassignToCategoryId
      ? `?reassignTo=${encodeURIComponent(options.reassignToCategoryId)}`
      : "";
    return request<any>(`${ENDPOINTS.CATEGORIES}/${id}${qs}`, { method: "DELETE" });
  },
};

// 3. Brands Repository
export const brandRepository = {
  getAll: async () => {
    return request<any>(ENDPOINTS.BRANDS, { method: "GET", cacheTtl: CACHE.LONG });
  },
  
  getById: async (id: string) => {
    return request<any>(`${ENDPOINTS.BRANDS}/${id}`, { method: "GET", cacheTtl: CACHE.MEDIUM });
  },
  
  create: async (data: any) => {
    return request<any>(ENDPOINTS.BRANDS, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  update: async (id: string, data: any) => {
    return request<any>(`${ENDPOINTS.BRANDS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  
  delete: async (id: string) => {
    return request<any>(`${ENDPOINTS.BRANDS}/${id}`, { method: "DELETE" });
  },
};

// 4. Series Repository
export const seriesRepository = {
  getAll: async () => {
    return request<any>(ENDPOINTS.SERIES, { method: "GET" });
  },
  
  create: async (data: any) => {
    return request<any>(ENDPOINTS.SERIES, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  update: async (id: string, data: any) => {
    return request<any>(`${ENDPOINTS.SERIES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  
  delete: async (id: string) => {
    return request<any>(`${ENDPOINTS.SERIES}/${id}`, { method: "DELETE" });
  },
};

// 5. Attributes Repository
export const attributeRepository = {
  getAll: async () => {
    return request<any>(ENDPOINTS.ATTRIBUTES, { method: "GET" });
  },
  
  getById: async (id: string) => {
    return request<any>(`${ENDPOINTS.ATTRIBUTES}/${id}`, { method: "GET" });
  },
  
  create: async (data: any) => {
    return request<any>(ENDPOINTS.ATTRIBUTES, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  update: async (id: string, data: any) => {
    return request<any>(`${ENDPOINTS.ATTRIBUTES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  
  delete: async (id: string) => {
    return request<any>(`${ENDPOINTS.ATTRIBUTES}/${id}`, { method: "DELETE" });
  },
};

// 6. Mega Menu Repository
export const megaMenuRepository = {
  getAll: async () => {
    return request<any>(ENDPOINTS.MEGAMENUS, { method: "GET", cacheTtl: CACHE.LONG });
  },
  
  sync: async (data: any) => {
    return request<any>(`${ENDPOINTS.MEGAMENUS}/sync`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  create: async (data: any) => {
    return request<any>(ENDPOINTS.MEGAMENUS, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  update: async (id: string, data: any) => {
    return request<any>(`${ENDPOINTS.MEGAMENUS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  
  delete: async (id: string) => {
    return request<any>(`${ENDPOINTS.MEGAMENUS}/${id}`, { method: "DELETE" });
  },
};

// 7. Auth Repository
export const authRepository = {
  getAllUsers: async () => {
    return request<any>(`${ENDPOINTS.AUTH}/users`, { method: "GET" });
  },
  getConfig: async () => {
    return request<any>(`${ENDPOINTS.AUTH}/config`, { method: "GET" });
  },
  login: async (data: any) => {
    return request<any>(`${ENDPOINTS.AUTH}/login`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  register: async (data: any) => {
    return request<any>(`${ENDPOINTS.AUTH}/register`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  loginAdmin: async (data: { email: string; password: string; role: string }) => {
    return request<any>(`${ENDPOINTS.AUTH}/login-admin`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  sendOTP: async (phone: string, type: "login" | "register" = "login") => {
    return request<any>(`${ENDPOINTS.AUTH}/send-otp`, {
      method: "POST",
      body: JSON.stringify({ phone, type }),
    });
  },
  verifyOTP: async (data: { phone: string; otp: string }) => {
    return request<any>(`${ENDPOINTS.AUTH}/verify-otp`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  getProfile: async () => {
    return request<any>(`${ENDPOINTS.AUTH}/profile`, { method: "GET" });
  },
  updateProfile: async (data: any) => {
    return request<any>(`${ENDPOINTS.AUTH}/profile`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  changePassword: async (data: any) => {
    return request<any>(`${ENDPOINTS.AUTH}/change-password`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  forgotPassword: async (data: { email: string }) => {
    return request<any>(`${ENDPOINTS.AUTH}/forgot-password`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  resetPassword: async (data: { email: string; otp: string; newPassword: string }) => {
    return request<any>(`${ENDPOINTS.AUTH}/reset-password`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  getAdmins: async () => {
    return request<any>(`${ENDPOINTS.AUTH}/admins`, { method: "GET" });
  },
  updateAdmin: async (id: string, data: { role?: string; name?: string; email?: string; status?: string; permissions?: string[] }) => {
    return request<any>(`${ENDPOINTS.AUTH}/admins/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  updateAdminRole: async (id: string, role: string) => {
    return request<any>(`${ENDPOINTS.AUTH}/admins/${id}`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  },
  deleteAdmin: async (id: string) => {
    return request<any>(`${ENDPOINTS.AUTH}/admins/${id}`, { method: "DELETE" });
  },
};

// 8. CMS Homepage Repository
export const cmsHomepageRepository = {
  get: async () => {
    return request<any>(ENDPOINTS.CMS_HOMEPAGE, { method: "GET", cacheTtl: CACHE.MEDIUM });
  },
  
  update: async (data: any) => {
    return request<any>(ENDPOINTS.CMS_HOMEPAGE, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

// 8.5 CMS Relief Repository
export const cmsReliefRepository = {
  get: async () => {
    return request<any>(ENDPOINTS.CMS_RELIEF, { method: "GET", cacheTtl: CACHE.MEDIUM });
  },
  
  update: async (data: any) => {
    return request<any>(ENDPOINTS.CMS_RELIEF, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

// 8.6 CMS Features Repository
export const cmsFeaturesRepository = {
  get: async () => {
    return request<any>(ENDPOINTS.CMS_FEATURES, { method: "GET", cacheTtl: CACHE.MEDIUM });
  },
  
  update: async (data: any) => {
    return request<any>(ENDPOINTS.CMS_FEATURES, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

// 9. CMS Pages Repository
export const cmsPagesRepository = {
  getAll: async () => {
    return request<any>(ENDPOINTS.CMS_PAGES, { method: "GET" });
  },
  
  getBySlug: async (slug: string) => {
    return request<any>(`${ENDPOINTS.CMS_PAGE}/${slug}`, { method: "GET", cacheTtl: CACHE.MEDIUM });
  },
  
  create: async (data: any) => {
    return request<any>(ENDPOINTS.CMS_PAGES, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  update: async (slug: string, data: any) => {
    return request<any>(`${ENDPOINTS.CMS_PAGE}/${slug}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  
  delete: async (slug: string) => {
    return request<any>(`${ENDPOINTS.CMS_PAGE}/${slug}`, { method: "DELETE" });
  },
};

// 9.5 CMS Header & Footer Repository
export const cmsHeaderFooterRepository = {
  get: async () => {
    return request<any>(ENDPOINTS.CMS_HEADER_FOOTER, { method: "GET", cacheTtl: CACHE.LONG });
  },
  
  update: async (data: any) => {
    return request<any>(ENDPOINTS.CMS_HEADER_FOOTER, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

// 10. Media Repository
export const mediaRepository = {
  list: async (folder: string = "") => {
    return request<any>(`${ENDPOINTS.MEDIA}?folder=${encodeURIComponent(folder)}`, { method: "GET" });
  },
  
  createFolder: async (path: string, name: string) => {
    return request<any>(`${ENDPOINTS.MEDIA}/folder`, {
      method: "POST",
      body: JSON.stringify({ path, name }),
    });
  },
  
  delete: async (path: string) => {
    return request<any>(`${ENDPOINTS.MEDIA}?path=${encodeURIComponent(path)}`, { method: "DELETE" });
  },

  rename: async (oldPath: string, newName: string) => {
    return request<any>(`${ENDPOINTS.MEDIA}/rename`, {
      method: "PUT",
      body: JSON.stringify({ oldPath, newName }),
    });
  },
  
  upload: (
    folder: string,
    file: File,
    onProgress?: (percent: number) => void
  ): { promise: Promise<any>; abort: () => void } => {
    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("admin_token");
    const xhr = new XMLHttpRequest();

    const promise = new Promise<any>((resolve, reject) => {
      xhr.open("POST", `${ENDPOINTS.MEDIA}/upload?path=${encodeURIComponent(folder)}`);

      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve({});
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.message || `HTTP Error ${xhr.status}`));
          } catch {
            reject(new Error(`HTTP Error ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onabort = () => reject(new Error("ABORTED"));

      xhr.send(formData);
    });

    return { promise, abort: () => xhr.abort() };
  },

  move: async (paths: string[], destination: string) => {
    return request<any>(`${ENDPOINTS.MEDIA}/move`, {
      method: "PUT",
      body: JSON.stringify({ paths, destination }),
    });
  },

  copy: async (paths: string[], destination: string) => {
    return request<any>(`${ENDPOINTS.MEDIA}/copy`, {
      method: "POST",
      body: JSON.stringify({ paths, destination }),
    });
  },
};

// 11. Blogs Repository
export const blogRepository = {
  getAll: async (params: { published?: boolean } = {}) => {
    const query = params.published !== undefined ? `?published=${params.published}` : "";
    return request<any>(`${ENDPOINTS.BLOGS}${query}`, { method: "GET", cacheTtl: CACHE.MEDIUM });
  },
  getById: async (id: string) => {
    return request<any>(`${ENDPOINTS.BLOGS}/${id}`, { method: "GET", cacheTtl: CACHE.MEDIUM });
  },
  create: async (data: any) => {
    return request<any>(ENDPOINTS.BLOGS, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return request<any>(`${ENDPOINTS.BLOGS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return request<any>(`${ENDPOINTS.BLOGS}/${id}`, { method: "DELETE" });
  },
};

// 12. Reviews Repository
export const reviewRepository = {
  getByProduct: async (productId: string) => {
    return request<any>(`${ENDPOINTS.REVIEWS}/product/${productId}`, { method: "GET", cacheTtl: CACHE.SHORT });
  },
  create: async (productId: string, data: any) => {
    return request<any>(`${ENDPOINTS.REVIEWS}/product/${productId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  getAll: async () => {
    return request<any>(ENDPOINTS.REVIEWS, { method: "GET" });
  },
  delete: async (id: string) => {
    return request<any>(`${ENDPOINTS.REVIEWS}/${id}`, { method: "DELETE" });
  },
};


// 13. Address Repository
export const addressRepository = {
  getAll: async () => request<any>(ENDPOINTS.ADDRESSES, { method: "GET" }),
  create: async (data: any) => request<any>(ENDPOINTS.ADDRESSES, { method: "POST", body: JSON.stringify(data) }),
  update: async (id: string, data: any) => request<any>(`${ENDPOINTS.ADDRESSES}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: async (id: string) => request<any>(`${ENDPOINTS.ADDRESSES}/${id}`, { method: "DELETE" }),
};



// 14. Admin Settings Repository
export const adminSettingsRepository = {
  getSmtpSettings: async () => {
    return request<any>(`${ENDPOINTS.ADMIN_SETTINGS}/smtp`, { method: "GET" });
  },
  updateSmtpSettings: async (data: any) => {
    return request<any>(`${ENDPOINTS.ADMIN_SETTINGS}/smtp`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  testSmtpSettings: async (to: string) => {
    return request<any>(`${ENDPOINTS.ADMIN_SETTINGS}/smtp/test`, {
      method: "POST",
      body: JSON.stringify({ to }),
    });
  },
  getPaymentSettings: async () => {
    return request<any>(`${ENDPOINTS.ADMIN_SETTINGS}/payments`, { method: "GET" });
  },
  updatePaymentSettings: async (data: any) => {
    return request<any>(`${ENDPOINTS.ADMIN_SETTINGS}/payments`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  getShippingSettings: async () => {
    return request<any>(`${ENDPOINTS.ADMIN_SETTINGS}/shipping/config`, { method: "GET" });
  },
  updateShippingSettings: async (data: any) => {
    return request<any>(`${ENDPOINTS.ADMIN_SETTINGS}/shipping/config`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  getAuthSettings: async () => {
    return request<any>(`${ENDPOINTS.ADMIN_SETTINGS}/auth`, { method: "GET" });
  },
  updateAuthSettings: async (data: any) => {
    return request<any>(`${ENDPOINTS.ADMIN_SETTINGS}/auth`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  getGeneralSettings: async () => {
    return request<any>(ENDPOINTS.ADMIN_GENERAL_SETTINGS, { method: "GET" });
  },
  updateGeneralSettings: async (data: any) => {
    return request<any>(ENDPOINTS.ADMIN_GENERAL_SETTINGS, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  getMaintenanceStatus: async () => {
    return request<any>(ENDPOINTS.PUBLIC_MAINTENANCE_STATUS, { method: "GET", cacheTtl: CACHE.SHORT });
  },
};

// 15. Email Templates Repository
export const emailTemplateRepository = {
  getAll: async () => {
    return request<any>(ENDPOINTS.EMAIL_TEMPLATES, { method: "GET" });
  },
  getById: async (id: string) => {
    return request<any>(`${ENDPOINTS.EMAIL_TEMPLATES}/${id}`, { method: "GET" });
  },
  create: async (data: any) => {
    return request<any>(ENDPOINTS.EMAIL_TEMPLATES, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return request<any>(`${ENDPOINTS.EMAIL_TEMPLATES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return request<any>(`${ENDPOINTS.EMAIL_TEMPLATES}/${id}`, { method: "DELETE" });
  },
  getChannelsConfig: async () => {
    return request<any>(`${ENDPOINTS.EMAIL_TEMPLATES}/channels/config`, { method: "GET" });
  },
  updateChannelsConfig: async (data: any) => {
    return request<any>(`${ENDPOINTS.EMAIL_TEMPLATES}/channels/config`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// 16. Wishlist Repository
export const wishlistRepository = {
  get: async () => {
    return request<any>(ENDPOINTS.WISHLIST, { method: "GET" });
  },
  add: async (productId: string) => {
    return request<any>(ENDPOINTS.WISHLIST, {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
  },
  remove: async (productId: string) => {
    return request<any>(`${ENDPOINTS.WISHLIST}/${productId}`, {
      method: "DELETE",
    });
  },
};

// 17. Coupon Repository
export const couponRepository = {
  getAll: async () => {
    return request<any>(ENDPOINTS.COUPONS, { method: "GET" });
  },
  create: async (data: any) => {
    return request<any>(ENDPOINTS.COUPONS, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return request<any>(`${ENDPOINTS.COUPONS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return request<any>(`${ENDPOINTS.COUPONS}/${id}`, { method: "DELETE" });
  },
  validate: async (code: string, orderValue: number) => {
    return request<any>(`${ENDPOINTS.COUPONS}/validate`, {
      method: "POST",
      body: JSON.stringify({ code, orderValue }),
    });
  },
};

// 18. Store Charge Repository
export const chargeRepository = {
  getAll: async () => {
    return request<any>(ENDPOINTS.CHARGES, { method: "GET" });
  },
  save: async (data: any) => {
    return request<any>(ENDPOINTS.CHARGES, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return request<any>(`${ENDPOINTS.CHARGES}/${id}`, { method: "DELETE" });
  },
};

// 25. Shipping Settings Config (Public)
export const shippingRepository = {
  getConfig: async () => {
    return request<any>(`${getBaseUrl()}${API_PREFIX}/shipping/config`, { method: "GET", cacheTtl: CACHE.LONG });
  }
};

// 26. Payment Config (Public)
export const paymentRepository = {
  getConfig: async () => {
    return request<any>(`${getBaseUrl()}${API_PREFIX}/payments/config`, { method: "GET", cacheTtl: CACHE.LONG });
  }
};

// 20. Orders Repository (Checkout & Verification)
export const ordersRepository = {
  initiateCheckout: async (data: any) => {
    return request<any>(`${ENDPOINTS.ORDERS}/initiate`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  verifySession: async (sessionId: string) => {
    return request<any>(`${ENDPOINTS.ORDERS}/verify/${sessionId}`);
  },
  getAll: async (filters: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        query.append(key, String(val));
      }
    });
    const queryString = query.toString();
    const url = queryString ? `${ENDPOINTS.ORDERS}?${queryString}` : ENDPOINTS.ORDERS;
    return request<any>(url, { method: "GET" });
  },
  getById: async (id: string) => {
    return request<any>(`${ENDPOINTS.ORDERS}/${id}`, { method: "GET" });
  },
  updateStatus: async (id: string, status: string) => {
    return request<any>(`${ENDPOINTS.ORDERS}/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
  getMyOrders: async () => {
    return request<any>(`${ENDPOINTS.ORDERS}/my`, { method: "GET" });
  },
  getMyOrderById: async (id: string) => {
    return request<any>(`${ENDPOINTS.ORDERS}/my/${id}`, { method: "GET" });
  },
  retryPayment: async (id: string) => {
    return request<any>(`${ENDPOINTS.ORDERS}/my/${id}/pay`, { method: "POST" });
  },
  getInvoice: async (token: string) => {
    return request<any>(`${ENDPOINTS.ORDERS}/invoice/${token}`, { method: "GET" });
  },
  getShippingMethods: async (params?: { toCountry?: string; weight?: number }) => {
    const qs = new URLSearchParams();
    if (params?.toCountry) qs.set("to_country", params.toCountry);
    if (params?.weight && params.weight > 0) qs.set("weight", String(params.weight));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<any>(`${ENDPOINTS.ORDERS}/sendcloud/methods${suffix}`, { method: "GET" });
  },
  createShipment: async (id: string, weight: number, shippingMethodId: number) => {
    return request<any>(`${ENDPOINTS.ORDERS}/${id}/sendcloud/shipment`, {
      method: "POST",
      body: JSON.stringify({ weight, shippingMethodId }),
    });
  }
};

// 27. Admin Backups Repository
export const backupsRepository = {
  list: async () => request<any>(ENDPOINTS.ADMIN_BACKUPS, { method: "GET" }),
  create: async (type: "database" | "uploads" | "full") =>
    request<any>(ENDPOINTS.ADMIN_BACKUPS, {
      method: "POST",
      body: JSON.stringify({ type }),
    }),
  remove: async (id: string) =>
    request<any>(`${ENDPOINTS.ADMIN_BACKUPS}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  download: async (id: string, filename: string) => {
    const token = localStorage.getItem("admin_token") || localStorage.getItem("customer_token");
    const response = await fetch(`${ENDPOINTS.ADMIN_BACKUPS}/${encodeURIComponent(id)}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `Download failed (${response.status})`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};

// 28. Admin Logs Repository
export const logsRepository = {
  list: async (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        query.append(key, String(val));
      }
    });
    const qs = query.toString();
    const url = qs ? `${ENDPOINTS.ADMIN_LOGS}?${qs}` : ENDPOINTS.ADMIN_LOGS;
    return request<any>(url, { method: "GET" });
  },
  stats: async () => request<any>(`${ENDPOINTS.ADMIN_LOGS}/stats`, { method: "GET" }),
  clear: async () => request<any>(ENDPOINTS.ADMIN_LOGS, { method: "DELETE" }),
};

const apiClient = {
  get: <T>(url: string, config?: RequestInit) => request<T>(url, { ...config, method: "GET" }),
  post: <T>(url: string, body?: any, config?: RequestInit) => request<T>(url, { ...config, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: any, config?: RequestInit) => request<T>(url, { ...config, method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string, config?: RequestInit) => request<T>(url, { ...config, method: "DELETE" }),
};

export default apiClient;
