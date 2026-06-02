import { Star } from "lucide-react";

export function StarRating({ value = 0, size = 14 }: { value?: number; size?: number }) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
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