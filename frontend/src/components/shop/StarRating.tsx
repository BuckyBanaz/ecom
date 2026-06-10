import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

export function StarRating({ value = 0, size = 14 }: { value?: number; size?: number }) {
  const { t } = useTranslation();
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-0.5" aria-label={t("star_rating.aria_label", { value: value.toFixed(1) })}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < full ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"}
        />
      ))}
    </div>
  );
}