import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, Truck, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/shop/ProductCard";
import { StarRating } from "@/components/shop/StarRating";
import { findProduct, products, reviews } from "@/data/products";
import { formatPrice, useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { cn } from "@/lib/utils";
import NotFound from "@/pages/NotFound";
import { productRepository } from "@/client/apiClient";
import { SafeImage } from "@/components/ui/SafeImage";

const ProductPage = () => {
  const { slug = "" } = useParams();
  const { add } = useCart();
  const { toggle, has } = useWishlist();
  const [qty, setQty] = useState(1);
  const [liveProduct, setLiveProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [color, setColor] = useState("");
  const [fitting, setFitting] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await productRepository.getByIdOrSlug(slug);
        if (data.success && data.product) {
          const p = data.product;
          const mappedColor = p.productAttributeValues?.find((pav: any) => pav.attribute.slug === "color")?.attributeValue?.value || "Black";
          const mappedFitting = p.productAttributeValues?.find((pav: any) => pav.attribute.slug === "fitting")?.attributeValue?.value || "E27";
          setLiveProduct({
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brand?.name || "Lumio",
            category: p.category?.slug || "general",
            price: p.price,
            oldPrice: p.oldPrice || undefined,
            rating: p.rating || 5,
            reviewCount: p.reviewCount || 12,
            image: p.images?.[0] || "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?q=80&w=800",
            images: p.images || [],
            inStock: p.stock > 0,
            description: p.description || "",
            shortDescription: p.shortDescription || "",
            specs: p.specs || {},
            color: mappedColor,
            fitting: mappedFitting,
          });
          setColor(mappedColor);
          setFitting(mappedFitting);
        }
      } catch (err) {
        console.error("Failed to fetch product:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  if (loading) {
    return <div className="container-page py-20 text-center">Loading...</div>;
  }

  const product = liveProduct || findProduct(slug);
  if (!product) return <NotFound />;

  const productCatSlug = typeof product.category === "object" ? product.category.slug : product.category;
  const related = products.filter((p) => {
    const pCatSlug = typeof p.category === "object" ? p.category.slug : p.category;
    return pCatSlug === productCatSlug && p.id !== product.id;
  }).slice(0, 4);
  const fav = has(product.id);

  const renderSpecs = () => {
    if (Array.isArray(product.specs)) {
      return (
        <div className="grid gap-1">
          {product.specs.filter((s: any) => s.key !== 'Number of lights' && s.key !== 'Series').map((item: any) => (
            <div key={item.key} className="flex justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm border border-transparent hover:border-border hover:bg-muted/50 transition-colors">
              <span className="text-muted-foreground">{item.key}</span>
              <span className="font-medium text-right max-w-[60%]">
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    {item.value} 
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  </a>
                ) : (
                  item.value
                )}
              </span>
            </div>
          ))}
        </div>
      );
    }

    // Legacy rendering fallback
    const specsObj: Record<string, any> = product.specs || {};
    const groups: Record<string, Array<{ key: string; value: string }>> = {};

    Object.entries(specsObj).forEach(([fullKey, value]) => {
      let groupName = "General Specifications";
      let displayKey = fullKey;

      if (fullKey.includes("::")) {
        const parts = fullKey.split("::");
        groupName = parts[0];
        displayKey = parts[1];
      }

      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push({ key: displayKey, value: String(value) });
    });

    return Object.entries(groups).map(([groupName, items]) => (
      <div key={groupName} className="space-y-2 mb-4">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 px-1">{groupName}</h4>
        <div className="grid gap-1">
          {items.map((item) => (
            <div key={item.key} className="flex justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm border border-transparent hover:border-border hover:bg-muted/50 transition-colors">
              <span className="text-muted-foreground">{item.key}</span>
              <span className="font-medium text-right max-w-[60%]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="container-page py-6">
      <nav className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> /{" "}
        <Link to={`/category/${typeof product.category === "object" ? product.category.slug : product.category}`} className="hover:text-primary capitalize">{(typeof product.category === "object" ? (product.category.name || product.category.slug) : product.category).replace(/-/g, " ")}</Link> /{" "}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border bg-muted">
            <SafeImage
              src={product.image}
              alt={product.name}
              fallbackType="product"
              className="aspect-square w-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={cn("aspect-square overflow-hidden rounded-lg border bg-muted", i === 0 && "ring-2 ring-primary")}>
                <SafeImage
                  src={product.image}
                  alt=""
                  fallbackType="product"
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm uppercase tracking-wider text-muted-foreground">
            {typeof product.brand === "object" ? product.brand.name : product.brand}
          </div>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <StarRating value={product.rating} size={16} />
            <span className="text-sm text-muted-foreground">
              {(product.rating || 0).toFixed(1)} · {product.reviewCount || 0} reviews
            </span>
            <span className="text-xs text-muted-foreground">SKU: {String(product.id).substring(0, 8).toUpperCase()}</span>
          </div>

          <div className="mt-5 flex items-end gap-3">
            <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatPrice(product.oldPrice)}</span>
                <Badge className="bg-primary text-primary-foreground">Sale</Badge>
              </>
            )}
          </div>
          <p className="mt-1 text-sm text-success">{product.inStock ? "In stock — ships next day" : "Backorder — ships in 5 days"}</p>

          <div className="mt-6 space-y-4">
            <Selector label="Color" options={["Black", "White", "Brass", "Natural"]} value={color!} onChange={setColor} />
            <Selector label="Bulb fitting" options={["E27", "E14", "GU10", "Integrated LED"]} value={fitting!} onChange={setFitting} />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-2.5">−</button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-4 py-2.5">+</button>
            </div>
            <Button size="lg" className="flex-1 rounded-full sm:flex-none" onClick={() => add(product, qty)}>
              Add to cart · {formatPrice(product.price * qty)}
            </Button>
            <Button size="icon" variant="outline" className="h-12 w-12 rounded-full" onClick={() => toggle(product.id, product.name)} aria-label="Wishlist">
              <Heart className={cn(fav && "fill-primary text-primary")} />
            </Button>
          </div>

          <ul className="mt-8 grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm">
            <li className="flex items-center gap-3"><Truck size={18} className="text-primary" /> Free shipping over €75</li>
            <li className="flex items-center gap-3"><RotateCcw size={18} className="text-primary" /> 30-day free returns</li>
            <li className="flex items-center gap-3"><ShieldCheck size={18} className="text-primary" /> 2-year warranty</li>
          </ul>
        </div>
      </div>

      {product.shortDescription && (
        <div className="mt-12 p-6 rounded-2xl bg-muted/30 border">
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: product.shortDescription }} />
        </div>
      )}

      <Tabs defaultValue="description" className="mt-12">
        <TabsList className="bg-muted">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="specs">Specifications</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({product.reviewCount})</TabsTrigger>
          <TabsTrigger value="qa">Q &amp; A</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="p-4 text-foreground">
          <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: product.description }} />
        </TabsContent>
        <TabsContent value="specs" className="p-4">
          {renderSpecs()}
        </TabsContent>
        <TabsContent value="reviews" className="space-y-4 p-4">
          {reviews.map((r) => (
            <div key={r.name} className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <strong>{r.name}</strong>
                <StarRating value={r.rating} />
              </div>
              <h4 className="mt-1 font-semibold">{r.title}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="qa" className="p-4 text-sm text-muted-foreground">
          No questions yet. Be the first to ask!
        </TabsContent>
      </Tabs>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">You might also like</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
};

function Selector({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold">{label}: <span className="font-normal text-muted-foreground">{value}</span></div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition",
              value === o ? "border-primary bg-primary/10 text-primary" : "hover:border-foreground/40",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ProductPage;