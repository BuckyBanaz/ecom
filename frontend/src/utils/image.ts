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
    if (import.meta.env.DEV) {
      return "";
    }
  }

  return "http://localhost:5000";
};

/** Storefront serves /uploads from the main domain (Caddy → backend). */
export function useSameOriginUploads(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.DEV) return true;
  return !window.location.hostname.startsWith("api.");
}

export type ResolveImgOptions = {
  width?: number;
};

/** Paths that should render SafeImage fallback (folder icon), not a broken/text placeholder. */
export function isMissingImage(src?: string | null): boolean {
  if (!src || !src.trim()) return true;
  const clean = src.trim();
  if (clean === "/placeholder.svg") return true;
  if (clean.startsWith("/assets/cat-")) return true;
  if (clean === "/assets/cat-generic.jpg") return true;
  return false;
}

function appendWidthParam(url: string, width?: number): string {
  if (!width) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}w=${width}`;
}

/** Resolve an image path for display in img src attributes */
export const resolveImgUrl = (src?: string | null, options?: ResolveImgOptions): string => {
  if (isMissingImage(src)) return "";

  if (src!.startsWith("data:") || src!.startsWith("blob:")) {
    return src!;
  }

  const uploadsIdx = src!.indexOf("/uploads/");
  if (uploadsIdx !== -1) {
    const uploadPath = src!.slice(uploadsIdx);
    if (useSameOriginUploads()) {
      return appendWidthParam(uploadPath, options?.width);
    }
    return appendWidthParam(`${getApiBaseUrl()}${uploadPath}`, options?.width);
  }

  if (src!.startsWith("http://") || src!.startsWith("https://")) {
    return appendWidthParam(src!, options?.width);
  }

  return appendWidthParam(src!, options?.width);
};

/** Responsive srcset for CMS/product images under /uploads/. */
export const buildUploadSrcSet = (src?: string | null, widths: number[] = [640, 960, 1200]): string => {
  if (isMissingImage(src)) return "";
  return widths
    .map((w) => {
      const url = resolveImgUrl(src, { width: w });
      return url ? `${url} ${w}w` : "";
    })
    .filter(Boolean)
    .join(", ");
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
