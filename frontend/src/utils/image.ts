export const getApiBaseUrl = (): string => {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  if (fromEnv && fromEnv.startsWith("http")) {
    return fromEnv.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname.replace(/^www\./, "");
    if (host && !host.startsWith("api.") && !host.includes("localhost")) {
      return `${window.location.protocol}//api.${host}`;
    }
  }

  return "http://localhost:5000";
};

const LEGACY_ASSET_ALIASES: Record<string, string> = {
  "/assets/cat-chandeliers.jpg": "/assets/cat-chandelier.jpg",
  "/assets/cat-office-lighting.jpg": "/assets/cat-office.jpg",
};

/** Resolve an image path for display in img src attributes */
export const resolveImgUrl = (src?: string | null): string => {
  if (!src) return "";

  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }

  if (LEGACY_ASSET_ALIASES[src]) {
    return LEGACY_ASSET_ALIASES[src];
  }

  const baseUrl = getApiBaseUrl();

  if (src.startsWith("http://") || src.startsWith("https://")) {
    if (src.includes("localhost:5000/uploads")) {
      const path = src.replace(/^https?:\/\/[^/]+/, "");
      return `${baseUrl}${path}`;
    }
    return src;
  }

  if (src.startsWith("/uploads")) {
    return `${baseUrl}${src}`;
  }

  return src;
};

/** Store relative /uploads paths instead of localhost URLs */
export const normalizeUploadedUrl = (url: string): string => {
  if (!url) return "";
  if (url.startsWith("/uploads")) return url;

  if (url.includes("/uploads/")) {
    const idx = url.indexOf("/uploads/");
    return url.slice(idx);
  }

  return url;
};
