export const getApiBaseUrl = (): string => {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  if (fromEnv && fromEnv.startsWith("http")) {
    return fromEnv.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname.replace(/^www\./, "");
    if (host && !host.startsWith("api.") && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return `${window.location.protocol}//api.${host}`;
    }
    // Local dev: route uploads/API through the Vite proxy on the same origin.
    if (import.meta.env.DEV) {
      return "";
    }
  }

  return "http://localhost:5000";
};

const PLACEHOLDER = "/placeholder.svg";

const LEGACY_ASSET_ALIASES: Record<string, string> = {
  "/assets/cat-chandeliers.jpg": PLACEHOLDER,
  "/assets/cat-office-lighting.jpg": PLACEHOLDER,
  "/assets/cat-chandelier.jpg": PLACEHOLDER,
  "/assets/cat-office.jpg": PLACEHOLDER,
  "/assets/cat-generic.jpg": PLACEHOLDER,
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

  // Always normalize /uploads/ paths to the current API host (fixes prod URLs on localhost).
  const uploadsIdx = src.indexOf("/uploads/");
  if (uploadsIdx !== -1) {
    return `${baseUrl}${src.slice(uploadsIdx)}`;
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
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
