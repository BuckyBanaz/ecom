import type { CSSProperties, ElementType } from "react";
import { useCmsLabel } from "@/hooks/useCmsLabel";

type CmsLabelProps = {
  text?: string | null;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
};

/** Plain-text CMS label with async NL ↔ EN translation (shortcodes, hero blocks). */
export function CmsLabel({ text, as: Tag = "span", className, style }: CmsLabelProps) {
  const label = useCmsLabel(text);
  if (!label) return null;
  return (
    <Tag className={className} style={style}>
      {label}
    </Tag>
  );
}
