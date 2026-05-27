import React, { useState, useEffect } from "react";
import { Image as ImageIcon, Package, Folder, Building2, Layers } from "lucide-react";
import { resolveImgUrl } from "@/utils/image";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackType?: "product" | "category" | "brand" | "series";
}

export function SafeImage({ src, alt, className, fallbackType, ...props }: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(!src);
  }, [src]);

  if (hasError || !src) {
    // Custom icon sizes based on expected layouts
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
      src={resolveImgUrl(src)}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
