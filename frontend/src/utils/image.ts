export const resolveImgUrl = (src?: string | null): string => {
  if (!src) return "";
  
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return src;
  }

  // Prepend backend API URL if it's a relative uploads path
  if (src.startsWith("/uploads")) {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    return `${baseUrl}${src}`;
  }

  return src;
};
