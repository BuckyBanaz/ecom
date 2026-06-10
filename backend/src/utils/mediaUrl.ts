import { env } from "../config/env";

export const getApiBaseUrl = (): string => {
  return env.API_URL.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
};

export const toPublicMediaUrl = (relativePath: string | null): string | null => {
  if (!relativePath) return null;
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }

  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${getApiBaseUrl()}${path}`;
};
