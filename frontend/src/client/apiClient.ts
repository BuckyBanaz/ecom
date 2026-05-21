import { ENDPOINTS } from "../utils/endpoints";

// Helper request wrapper around fetch
async function request<T>(url: string, config: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("admin_token");
  
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
    throw new Error(errorBody.message || `HTTP Error ${response.status}`);
  }
  
  return response.json() as Promise<T>;
}

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
    return request<any>(url, { method: "GET" });
  },
  
  getByIdOrSlug: async (idOrSlug: string) => {
    return request<any>(`${ENDPOINTS.PRODUCTS}/${idOrSlug}`, { method: "GET" });
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
    return request<any>(ENDPOINTS.CATEGORIES, { method: "GET" });
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
  
  delete: async (id: string) => {
    return request<any>(`${ENDPOINTS.CATEGORIES}/${id}`, { method: "DELETE" });
  },
};

// 3. Brands Repository
export const brandRepository = {
  getAll: async () => {
    return request<any>(ENDPOINTS.BRANDS, { method: "GET" });
  },
  
  getById: async (id: string) => {
    return request<any>(`${ENDPOINTS.BRANDS}/${id}`, { method: "GET" });
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
    return request<any>(ENDPOINTS.MEGAMENUS, { method: "GET" });
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
  loginAdmin: async (data: { email: string; password: string; role: string }) => {
    return request<any>(`${ENDPOINTS.AUTH}/login-admin`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// 8. CMS Homepage Repository
export const cmsHomepageRepository = {
  get: async () => {
    return request<any>(ENDPOINTS.CMS_HOMEPAGE, { method: "GET" });
  },
  
  update: async (data: any) => {
    return request<any>(ENDPOINTS.CMS_HOMEPAGE, {
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
    return request<any>(`${ENDPOINTS.CMS_PAGE}/${slug}`, { method: "GET" });
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
  
  upload: async (folder: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    
    const token = localStorage.getItem("admin_token");
    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${ENDPOINTS.MEDIA}/upload?path=${encodeURIComponent(folder)}`, {
      method: "POST",
      headers,
      body: formData, // do not set Content-Type, fetch will set it automatically with boundary
    });
    
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `HTTP Error ${response.status}`);
    }
    
    return response.json();
  },
};
