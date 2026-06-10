/** Public storefront base URL (from env or current browser origin) */
export const getClientBaseUrl = (): string => {
  const fromEnv = import.meta.env.VITE_APP_URL as string | undefined;
  if (fromEnv && fromEnv.startsWith("http")) {
    return fromEnv.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:5173";
};
