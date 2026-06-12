import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, Truck, RotateCcw, ShieldCheck, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/shop/ProductCard";
import { StarRating } from "@/components/shop/StarRating";
import { FaIcon } from "@/components/ui/FaIcon";
import { cmsFeaturesRepository } from "@/client/apiClient";
import { findProduct, products } from "@/data/products";
import { formatPrice, useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { cn } from "@/lib/utils";
import NotFound from "@/pages/NotFound";
import { productRepository, reviewRepository } from "@/client/apiClient";
import { SafeImage } from "@/components/ui/SafeImage";
import { SectionLoader } from "@/components/ui/PageLoader";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewModal } from "@/components/shop/ReviewModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getProductBrandName } from "@/utils/formatters";

const ProductPage = () => {
  const { t } = useTranslation();
  const { slug = "" } = useParams();
  const { add } = useCart();
  const { toggle, has } = useWishlist();
  const [qty, setQty] = useState(1);
  const [liveProduct, setLiveProduct] = useState<any>(null);
  const [liveReviews, setLiveReviews] = useState<any[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [color, setColor] = useState("");
  const [fitting, setFitting] = useState("");
  const [seriesProducts, setSeriesProducts] = useState<any[]>([]);
  const [brandProducts, setBrandProducts] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [featureItems, setFeatureItems] = useState([
    { id: 1, icon: "truck-fast", title: "Fast delivery", description: "Order before 22:00, delivered next day" },
    { id: 2, icon: "arrow-rotate-left", title: "30-day returns", description: "Not happy? Send it back for free" },
    { id: 3, icon: "shield-check", title: "2-year warranty", description: "Quality you can trust" },
    { id: 4, icon: "headset", title: "Expert support", description: "7 days a week" },
  ]);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const res = await cmsFeaturesRepository.get();
        if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setFeatureItems(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch features:", error);
      }
    };
    fetchFeatures();
  }, []);

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
              brand: p.brand?.name || "",
              category: p.category?.slug || "general",
              price: p.price,
              oldPrice: p.oldPrice || undefined,
              rating: p.rating || 5,
              reviewCount: p.reviewCount || 12,
              image: p.image,
              images: p.images || [],
              inStock: p.inStock ?? true,
              description: p.description || "",
              shortDescription: p.shortDescription || "",
              specs: p.specs || {},
              color: mappedColor,
              fitting: mappedFitting,
              isNewArrival: p.isNewArrival,
              isBestSelling: p.isBestSelling,
              seoTitle: p.seoTitle,
              seoDescription: p.seoDescription,
              seoKeywords: p.seoKeywords,
            });
            setSelectedImageIndex(0);
            setColor(mappedColor);
            setFitting(mappedFitting);

          const pCatSlug = p.category?.slug;
          const pBrandName = p.brand?.name;
          
          let pSeriesName = null;
          if (p.specs) {
            if (Array.isArray(p.specs)) {
              pSeriesName = p.specs.find((s: any) => s.key === "Series")?.value;
            } else {
              pSeriesName = Object.entries(p.specs).find(([k]) => k === "Series" || k.includes("::Series"))?.[1] as string;
            }
          }

          Promise.all([
            pSeriesName ? productRepository.getAll({ search: pSeriesName, limit: 5 }) : Promise.resolve({ products: [] }),
            pBrandName ? productRepository.getAll({ brands: pBrandName, limit: 5 }) : Promise.resolve({ products: [] }),
            pCatSlug ? productRepository.getAll({ category: pCatSlug, limit: 5 }) : Promise.resolve({ products: [] })
          ]).then(([seriesRes, brandRes, catRes]) => {
            setSeriesProducts(seriesRes.products?.filter((rp: any) => rp.id !== p.id).slice(0, 4) || []);
            setBrandProducts(brandRes.products?.filter((rp: any) => rp.id !== p.id && rp.name !== pSeriesName).slice(0, 4) || []);
            setRelatedProducts(catRes.products?.filter((rp: any) => rp.id !== p.id).slice(0, 4) || []);
          }).catch(err => console.error("Error fetching related:", err));

          // Fetch reviews
          try {
            const reviewData = await reviewRepository.getByProduct(p.slug || p.id);
            if (reviewData.success) {
              setLiveReviews(reviewData.reviews || []);
            }
          } catch(e) {
            console.error("Failed to fetch reviews");
          }
        }
      } catch (err) {
        console.error("Failed to fetch product:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  // Update SEO Meta Tags when product is loaded
  useEffect(() => {
    if (liveProduct) {
      document.title = liveProduct.seoTitle || `${liveProduct.name} | Premium Lighting`;
      
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', liveProduct.seoDescription || liveProduct.shortDescription || "");

      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', liveProduct.seoKeywords || "");
    }
  }, [liveProduct]);

  if (loading) {
    return <SectionLoader />;
  }

  const product = liveProduct || findProduct(slug);
  if (!product) return <NotFound />;

  const fav = has(product.id);

  const renderSpecs = () => {
    const renderSpecItems = (items: any[]) => (
      <div className="flex flex-col text-[13px] border-t border-b">
        {items.map((item, i) => (
          <div key={item.key} className={cn("flex py-3 px-4", i % 2 === 0 ? "bg-muted/20" : "")}>
            <span className="font-bold w-1/2 pr-4">{item.key}</span>
            <span className="w-1/2 text-muted-foreground break-words">
              {item.link ? (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                  {item.value}
                </a>
              ) : (
                item.value
              )}
            </span>
          </div>
        ))}
      </div>
    );

    if (Array.isArray(product.specs)) {
      return renderSpecItems(product.specs.filter((s: any) => s.key !== 'Number of lights' && s.key !== 'Series'));
    }

    // Legacy rendering fallback
    const specsObj: Record<string, any> = product.specs || {};
    const items = Object.entries(specsObj).map(([key, val]) => {
      let displayKey = key;
      if (key.includes("::")) displayKey = key.split("::")[1];
      return { key: displayKey, value: String(val) };
    });
    return renderSpecItems(items);
  };

  return (
    <div className="container-page py-6">
      <nav className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">{t("breadcrumb.home")}</Link> /{" "}
        <Link to={`/category/${typeof product.category === "object" ? product.category.slug : product.category}`} className="hover:text-primary capitalize">{(typeof product.category === "object" ? (product.category.name || product.category.slug) : product.category).replace(/-/g, " ")}</Link> /{" "}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-20">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-border/50 bg-muted aspect-square sm:aspect-[4/3] lg:aspect-auto lg:h-[400px]">
            {/* Build a gallery array that always starts with the cover image */}
            {(() => {
              const galleryImages = [product.image, ...(product.images ?? [])];
              return (
                <SafeImage
                  src={galleryImages[selectedImageIndex]}
                  alt={product.name}
                  fallbackType="product"
                  className="h-full w-full object-cover"
                />
              );
            })()}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[product.image, ...(product.images ?? [])].map((img: string, i: number) => (
              <div key={i} className={cn("aspect-[4/3] overflow-hidden rounded-lg border bg-muted cursor-pointer transition-all hover:opacity-90", i === selectedImageIndex ? "border-primary ring-1 ring-primary" : "border-border/50") } onClick={() => setSelectedImageIndex(i)}>
                <SafeImage
                  src={img}
                  alt=""
                  fallbackType="product"
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {product.isBestSelling && <Badge className="rounded-full px-3 py-0.5 bg-[#f59e0b] hover:bg-[#d97706] text-white border-transparent font-bold text-[12px] shadow-sm">{t("product.badge_best_seller")}</Badge>}
            {product.isNewArrival && <Badge className="rounded-full px-3 py-0.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white border-transparent font-bold text-[12px] shadow-sm">{t("product.badge_new_arrival")}</Badge>}
            
            {product.inStock !== false ? (
              <div className="flex items-center gap-2 text-[12px] text-green-700 dark:text-green-400 font-bold bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 px-2.5 py-0.5 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600 dark:bg-green-500"></span>
                </span>
                {t("product.in_stock")}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[12px] text-red-700 dark:text-red-400 font-bold bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-2.5 py-0.5 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600 dark:bg-red-500"></span>
                </span>
                {t("product.out_of_stock")}
              </div>
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{product.name}</h1>
          
          <div className="mt-4 space-y-3">
            {/* Row 1: Brand & Series */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {(() => {
                const brandName = getProductBrandName(product.brand);
                return brandName ? (
                  <div>
                    {t("product.label_brand")} <span className="text-foreground underline underline-offset-4 hover:text-primary cursor-pointer">{brandName}</span>
                  </div>
                ) : null;
              })()}
              
              {(() => {
                let series = null;
                if (Array.isArray(product.specs)) {
                   series = product.specs.find(s => s.key === 'Series')?.value;
                } else if (product.specs && product.specs['Series']) {
                   series = product.specs['Series'];
                }
                // Fallback to name extraction if no series is defined
                if (!series) {
                  const parts = product.name.split(",");
                  if (parts.length > 1) series = parts[1].trim();
                }
                return series ? (
                  <div>
                    {t("product.label_series")} <span className="text-foreground underline underline-offset-4 hover:text-primary cursor-pointer">{series}</span>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Row 2: Reviews & SKU */}
            <div className="flex items-center gap-2 text-sm">
              {(() => {
                const realReviewCount = liveReviews.length;
                const realAvgRating = realReviewCount > 0 
                  ? liveReviews.reduce((sum, r) => sum + r.rating, 0) / realReviewCount 
                  : 0;
                return (
                  <>
                    <div className="flex items-center gap-1">
                      <StarRating value={realAvgRating > 0 ? realAvgRating : (product.rating || 5)} size={18} />
                    </div>
                    <span className="font-bold text-foreground">{realAvgRating > 0 ? realAvgRating.toFixed(1) : (product.rating || 5)}</span>
                    <span className="text-muted-foreground cursor-pointer hover:text-primary hover:underline" onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}>
                      · {realReviewCount > 0 ? realReviewCount : (product.reviewCount || 0)} {t("product.reviews")}
                    </span>
                  </>
                );
              })()}
              <div className="ml-auto text-muted-foreground uppercase text-[11px] tracking-wider font-bold">SKU: {product.slug?.toUpperCase()?.slice(0, 8)}</div>
            </div>
          </div>

          {product.shortDescription && (
            <div className="mt-6">
              <div className={`text-muted-foreground ${product.shortDescription?.includes('<style') ? '' : 'prose prose-sm dark:prose-invert max-w-none'}`} dangerouslySetInnerHTML={{ __html: product.shortDescription }} />
            </div>
          )}

          <div className="mt-6 flex items-end gap-3">
            <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatPrice(product.oldPrice)}</span>
                <Badge className="bg-primary text-white border-transparent">{t("product.badge_sale")}</Badge>
              </>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-border shadow-sm bg-background">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-2 hover:bg-muted text-muted-foreground transition-colors rounded-l-full text-lg leading-none">−</button>
              <span className="w-6 text-center text-sm font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-4 py-2 hover:bg-muted text-muted-foreground transition-colors rounded-r-full text-lg leading-none">+</button>
            </div>
            <Button size="default" disabled={product.inStock === false} className="flex-1 rounded-full sm:flex-none font-bold bg-primary hover:bg-primary/90 text-white px-8 shadow-sm transition-all" onClick={() => add(product, qty)}>
              {product.inStock === false ? t("product.button_out_of_stock") : t("product.button_add_to_cart")}
            </Button>
            <Button size="icon" variant="outline" className="h-10 w-10 rounded-full shadow-sm text-muted-foreground hover:text-foreground" onClick={() => toggle(product.id, product.name, product)} aria-label={t("product.aria_wishlist")}>
              <Heart size={18} className={cn(fav ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Horizontal Shipping Info Banners */}
      <div className="mt-12 bg-muted/40 rounded-2xl p-6 lg:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featureItems.map(item => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="flex flex-shrink-0 items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary">
                <FaIcon name={item.icon} className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-[15px] text-foreground leading-tight">{item.title}</h4>
                <p className="text-[13px] text-muted-foreground mt-0.5">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>



      {/* 1. Description & Specs Two-Column Grid */}
      <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
        {/* Left: Description */}
        <div>
          <h2 className="text-xl font-bold mb-6">{t("product.section_description")}</h2>
          <div className={`text-foreground/90 leading-relaxed ${product.description?.includes('<style') ? '' : 'prose prose-sm max-w-none dark:prose-invert'}`} dangerouslySetInnerHTML={{ __html: product.description }} />
        </div>

        {/* Right: Specifications */}
        <div>
          <h2 className="text-xl font-bold mb-6">{t("product.section_specifications")}</h2>
          {renderSpecs()}
        </div>
      </div>



      {(seriesProducts.length > 0 || brandProducts.length > 0 || relatedProducts.length > 0) && (
        <section className="mt-16">
          <h2 className="mb-8 text-2xl font-bold">{t("product.section_similar")}</h2>
          
          <div className="space-y-12">
            {seriesProducts.length > 0 && (
              <div>
                <h3 className="mb-4 text-lg font-semibold text-foreground/80 border-b pb-2">{t("product.similar_from_series")}</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {seriesProducts.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            )}

            {brandProducts.length > 0 && (
              <div>
                <h3 className="mb-4 text-lg font-semibold text-foreground/80 border-b pb-2">{t("product.similar_from_brand")} {product.brand?.name || product.brand || t("product.this_brand")}</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {brandProducts.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            )}

            {relatedProducts.length > 0 && (
              <div>
                <h3 className="mb-4 text-lg font-semibold text-foreground/80 border-b pb-2">{t("product.similar_related")}</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {relatedProducts.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. Customer Reviews Section */}
      <div className="mt-20 border-t pt-12">
        <h2 className="text-xl font-bold mb-8">{t("product.section_reviews")}</h2>
        
        {(() => {
          const realReviewCount = liveReviews.length;
          const realAvgRating = realReviewCount > 0 
            ? liveReviews.reduce((sum, r) => sum + r.rating, 0) / realReviewCount 
            : 0;
            
          const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          liveReviews.forEach(r => {
            if (r.rating >= 1 && r.rating <= 5) {
              ratingCounts[Math.round(r.rating) as keyof typeof ratingCounts]++;
            }
          });

          return (
            <div className="flex flex-wrap items-start justify-between gap-6 mb-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-extrabold">{realAvgRating.toFixed(1)}</span>
                    <StarRating value={realAvgRating} size={18} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{t("product.review_based_on")} {realReviewCount} {t("product.reviews_count_label")}</p>
                </div>
                
                <div className="space-y-1.5 w-[200px]">
                  {[5, 4, 3, 2, 1].map((stars) => {
                     const count = ratingCounts[stars as keyof typeof ratingCounts];
                     const pct = realReviewCount > 0 ? `${(count / realReviewCount) * 100}%` : "0%";
                     return (
                       <div key={stars} className="flex items-center gap-3 text-xs">
                         <span className="flex text-muted-foreground">{"★".repeat(stars)}{"☆".repeat(5-stars)}</span>
                         <div className="flex-1 h-3.5 bg-muted rounded-sm overflow-hidden flex">
                           <div className="bg-[#333] dark:bg-primary h-full transition-all duration-500" style={{ width: pct }} />
                         </div>
                         <span className="w-5 text-right text-muted-foreground font-medium">{count}</span>
                       </div>
                     );
                  })}
                </div>
              </div>
              <Button onClick={() => setReviewModalOpen(true)} variant="default" className="rounded-full px-6 font-bold bg-[#222] hover:bg-black text-white dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 shadow-none">
                {t("product.button_write_review")}
              </Button>
            </div>
          );
        })()}

        {/* Filters bar */}
        <div className="flex justify-end mb-6">
           <select className="text-xs border rounded-md px-3 py-2 bg-background font-medium outline-none focus:border-primary">
             <option>{t("product.filter_with_photos")}</option>
             <option>{t("product.filter_all_reviews")}</option>
           </select>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {liveReviews.length === 0 ? (
            <p className="text-muted-foreground col-span-full">{t("product.no_reviews")}</p>
          ) : (
            liveReviews.map((r, i) => (
              <div 
                key={r.id || i} 
                className="flex flex-col border rounded-lg overflow-hidden bg-card text-left cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedReview(r);
                  setSelectedImageIndex(0);
                }}
              >
                {((r.images && r.images.length > 0) || r.image) && (
                  <div className="aspect-[4/3] bg-muted w-full overflow-hidden border-b">
                    <SafeImage src={r.images?.[0] || r.image} alt="Review" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-center mb-3">
                    <StarRating value={r.rating} size={12} />
                    <span className="text-[10px] text-muted-foreground font-medium">{new Date(r.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-bold text-sm mb-2 leading-tight">{r.title || t("product.review_default_title")}</h4>
                  <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed flex-1 line-clamp-3">
                    {r.text} <span className="text-primary hover:underline cursor-pointer ml-1 inline-block">{t("product.read_more")}</span>
                  </p>
                  <div className="mt-auto">
                    <p className="text-xs font-bold mb-3">{r.name} <span className="font-normal text-muted-foreground ml-1">{t("product.verified_buyer")}</span></p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-3">
                      <span>{t("product.helpful_question")}</span>
                      <div className="flex gap-2.5">
                        <button className="hover:text-foreground flex items-center gap-1" onClick={(e) => e.stopPropagation()}><ThumbsUp size={12} /> 0</button>
                        <button className="hover:text-foreground flex items-center gap-1" onClick={(e) => e.stopPropagation()}><ThumbsDown size={12} /> 0</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ReviewModal 
        isOpen={reviewModalOpen} 
        onClose={() => setReviewModalOpen(false)} 
        productId={liveProduct?.id} 
        productName={liveProduct?.name} 
        onSuccess={(newReview) => {
          setLiveReviews(prev => [newReview, ...prev]);
        }} 
      />

      {/* Review Details Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="sm:max-w-[600px] overflow-hidden p-0 border-0 rounded-xl">
          {selectedReview && (
            <div className="flex flex-col md:flex-row max-h-[80vh]">
              {((selectedReview.images && selectedReview.images.length > 0) || selectedReview.image) && (
                <div className="w-full md:w-1/2 bg-muted flex flex-col items-center justify-center p-4">
                  <SafeImage 
                    src={selectedReview.images?.[selectedImageIndex] || selectedReview.image} 
                    alt="Review" 
                    className="max-w-full max-h-[400px] object-contain rounded-lg shadow-sm"
                  />
                  {selectedReview.images && selectedReview.images.length > 1 && (
                    <div className="flex gap-2 mt-4">
                      {selectedReview.images.map((img: string, idx: number) => (
                        <button 
                          key={idx} 
                          onClick={() => setSelectedImageIndex(idx)}
                          className={cn("w-14 h-14 rounded-md border-2 overflow-hidden transition-all", selectedImageIndex === idx ? "border-primary shadow-sm" : "border-transparent opacity-60 hover:opacity-100")}
                        >
                          <SafeImage src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className={cn("p-6 flex flex-col w-full overflow-y-auto", ((selectedReview.images && selectedReview.images.length > 0) || selectedReview.image) ? "md:w-1/2" : "w-full")}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg leading-tight mb-1">{selectedReview.title || t("product.review_default_title")}</h3>
                    <div className="flex items-center gap-2">
                      <StarRating value={selectedReview.rating} size={14} />
                      <span className="text-xs text-muted-foreground">{new Date(selectedReview.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-foreground/90 leading-relaxed mb-6 whitespace-pre-wrap flex-1">
                  {selectedReview.text}
                </p>
                
                <div className="mt-auto border-t pt-4">
                  <p className="text-sm font-bold">{selectedReview.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> {t("product.verified_buyer")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};



export default ProductPage;
