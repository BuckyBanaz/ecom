import React, { useState, useEffect } from "react";
import { Image as ImageIcon, Package, Folder, Building2, Layers } from "lucide-react";
import { buildUploadSrcSet, isMissingImage, resolveImgUrl } from "@/utils/image";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackType?: "product" | "category" | "brand" | "series";
  /** Above-the-fold / LCP images — eager load with high fetch priority. */
  priority?: boolean;
  /** Responsive widths for /uploads/ images (srcset). */
  responsiveWidths?: number[];
  sizes?: string;
}

export function SafeImage({
  src,
  alt,
  className,
  fallbackType,
  loading = "lazy",
  decoding = "async",
  priority = false,
  responsiveWidths,
  sizes,
  fetchPriority: fetchPriorityProp,
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const defaultWidth = priority ? 960 : responsiveWidths?.[responsiveWidths.length - 1];
  const resolvedSrc = resolveImgUrl(src, { width: defaultWidth });
  const srcSet =
    responsiveWidths && src?.includes("/uploads/")
      ? buildUploadSrcSet(src, responsiveWidths)
      : undefined;

  useEffect(() => {
    setHasError(isMissingImage(src) || !resolvedSrc);
  }, [src, resolvedSrc]);

  if (hasError || isMissingImage(src) || !resolvedSrc) {
    let iconSize = "h-5 w-5";
    if (fallbackType === "category") iconSize = "h-8 w-8";
    if (fallbackType === "brand" || fallbackType === "series") iconSize = "h-7 w-7";

    const iconClass = `${iconSize} text-muted-foreground/60 shrink-0`;

    let icon = <ImageIcon className={iconClass} />;
    if (fallbackType === "product") icon = <Package className={iconClass} />;
    if (fallbackType === "category") icon = <Folder className={iconClass} />;
    if (fallbackType === "brand") icon = <Building2 className={iconClass} />;
    if (fallbackType === "series") icon = <Layers className={iconClass} />;

    return (
      <div className={`flex items-center justify-center bg-muted/50 border border-muted-foreground/10 ${className}`}>
        {icon}
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes ?? "100vw" : sizes}
      alt={alt}
      className={className}
      loading={priority ? "eager" : loading}
      decoding={decoding}
      fetchpriority={priority ? "high" : fetchPriorityProp}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
