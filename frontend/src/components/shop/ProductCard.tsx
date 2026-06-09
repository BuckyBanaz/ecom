import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { formatPrice, useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import type { Product } from "@/data/products";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/SafeImage";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation();
  const { add } = useCart();
  const { toggle, has } = useWishlist();
  const fav = has(product.id);
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md">
      <Link to={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        {product.inStock === false ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground">
            {t("product.out_of_stock")}
          </span>
        ) : discount > 0 ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
            -{discount}%
          </span>
        ) : null}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggle(product.id, product.name, product);
          }}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/90 backdrop-blur transition hover:bg-background"
          aria-label={t("product.add_to_wishlist")}
        >
          <Heart size={16} className={cn(fav ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
        </button>
        <SafeImage
          src={product.image}
          alt={product.name}
          loading="lazy"
          fallbackType="product"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {typeof product.brand === "object" ? product.brand.name : product.brand}
        </div>
        <Link to={`/product/${product.slug}`} className="line-clamp-2 text-sm font-medium hover:text-primary">
          {product.name}
        </Link>
        <div className="flex items-center gap-2">
          <StarRating value={product.rating} />
          <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            {product.oldPrice && (
              <div className="text-xs text-muted-foreground line-through">{formatPrice(product.oldPrice)}</div>
            )}
            <div className="text-lg font-bold text-foreground">{formatPrice(product.price)}</div>
          </div>
          <Button
            size="icon"
            onClick={() => add(product)}
            disabled={product.inStock === false}
            aria-label={t("product.add_to_cart")}
            className="h-10 w-10 rounded-full"
          >
            <ShoppingCart size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}