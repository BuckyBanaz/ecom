import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { BlogCard } from "@/components/shop/BlogCard";
import { categories } from "@/data/categories";
import { dealProducts, featuredProducts } from "@/data/products";
import { initialBlogs } from "@/data/blogs";
import { StarRating } from "@/components/shop/StarRating";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { iconMap } from "@/utils/fontawesome";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { megaMenuData } from "@/data/megaMenu";
import { resolveImgUrl } from "@/utils/image";
import { Skeleton } from "@/components/ui/skeleton";
import { productRepository, categoryRepository, blogRepository, brandRepository } from "@/client/apiClient";
import { SafeImage } from "@/components/ui/SafeImage";

interface ShortcodeRendererProps {
  content: string;
  prefetchedData?: {
    products?: any[];
    categories?: any[];
    blogs?: any[];
    brands?: any[];
  };
}

export function ShortcodeRenderer({ content, prefetchedData }: ShortcodeRendererProps) {
  const [loading, setLoading] = useState(!prefetchedData);
  const [dbProducts, setDbProducts] = useState<any[]>(prefetchedData?.products || []);
  const [dbCategories, setDbCategories] = useState<any[]>(prefetchedData?.categories || []);
  const [dbBlogs, setDbBlogs] = useState<any[]>(prefetchedData?.blogs || []);
  const [dbBrands, setDbBrands] = useState<any[]>(prefetchedData?.brands || []);
  const [dbTestimonials, setDbTestimonials] = useState<any[]>([]);

  // Load testimonials from admin storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("testimonials_data");
      if (saved) {
        const list = JSON.parse(saved);
        const published = Array.isArray(list) ? list.filter((t: any) => t.published !== false) : [];
        setDbTestimonials(published);
      }
    } catch {
      setDbTestimonials([]);
    }
  }, []);

  useEffect(() => {
    let active = true;

    if (prefetchedData) {
      if (prefetchedData.products) setDbProducts(prefetchedData.products);
      if (prefetchedData.categories) setDbCategories(prefetchedData.categories);
      if (prefetchedData.blogs) setDbBlogs(prefetchedData.blogs);
      
      if (prefetchedData.brands) {
        setDbBrands(prefetchedData.brands);
      } else {
        brandRepository.getAll().then(res => {
          if (active && res.success && res.brands) setDbBrands(res.brands);
        }).catch(err => console.warn("Failed to fetch brands", err));
      }
      
      setLoading(false);
      return () => { active = false; };
    }

    const fetchRealData = async () => {
      try {
        const [prodRes, catRes, blogRes, brandRes] = await Promise.all([
          productRepository.getAll({ limit: 40 }),
          categoryRepository.getAll(),
          blogRepository.getAll({ published: true }).catch(() => ({ success: false })),
          brandRepository.getAll().catch(() => ({ success: false })),
        ]);
        if (!active) return;
        if (prodRes.success && prodRes.products) setDbProducts(prodRes.products);
        if (catRes.success && catRes.categories) setDbCategories(catRes.categories);
        if (blogRes.success && blogRes.blogs) setDbBlogs(blogRes.blogs);
        if (brandRes.success && brandRes.brands) setDbBrands(brandRes.brands);
      } catch (err) {
        console.warn("Failed to load real data for Shortcodes:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchRealData();
    return () => { active = false; };
  }, [prefetchedData]);

  const parts = useMemo(() => {
    if (!content) return [];

    // 1. Clean the HTML by removing .cms-block wrappers but keeping the shortcode text
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const blocks = doc.querySelectorAll('.cms-block');
    
    blocks.forEach(block => {
      const span = block.querySelector('span');
      if (span) span.remove();
      
      const shortcode = block.textContent?.trim() || "";
      const textNode = doc.createTextNode(shortcode);
      block.replaceWith(textNode);
    });
    
    const cleanContent = doc.body.innerHTML;

    // 2. Split the clean content by shortcode regex
    const regex = /\[([a-zA-Z0-9-]+)([^\]]*)\]\[\/\1\]/g;
    const partsArray: any[] = [];
    
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(cleanContent)) !== null) {
      if (match.index > lastIndex) {
        partsArray.push({ type: 'html', content: cleanContent.substring(lastIndex, match.index) });
      }
      
      const type = match[1];
      const attrStr = match[2];
      const attributes: Record<string, string> = {};
      
      const attrRegex = /([a-zA-Z0-9_]+)="([^"]*)"/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
        attributes[attrMatch[1]] = attrMatch[2];
      }
      
      partsArray.push({ type: 'shortcode', blockType: type, attributes });
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < cleanContent.length) {
      partsArray.push({ type: 'html', content: cleanContent.substring(lastIndex) });
    }
    
    return partsArray;
  }, [content]);

  return (
    <div className="flex flex-col">
      {parts.map((part, index) => {
        if (part.type === 'html') {
          // Clean up empty paragraphs that create huge gaps
          let html = part.content.trim();
          html = html.replace(/^(<p><br\/><\/p>|<p>\s*<\/p>|<br\s*\/?>)+/, '').replace(/(<p><br\/><\/p>|<p>\s*<\/p>|<br\s*\/?>)+$/, '').trim();
          
          if (!html) return null;

          return (
            <div 
              key={index} 
              className="container-page prose prose-slate max-w-none dark:prose-invert" 
              dangerouslySetInnerHTML={{ __html: html }} 
            />
          );
        }
        
        const { blockType, attributes } = part;
        
        switch (blockType) {
          case "text-hero": {
            return (
              <section key={index} className="container-page pt-4 pb-8">
                <div className="relative overflow-hidden rounded-3xl bg-muted p-8 md:p-12 border shadow-xs">
                  <div className="relative z-10 max-w-4xl flex flex-col gap-4">
                    {attributes.title && (
                      <h1 className="text-3xl font-extrabold md:text-5xl tracking-tight text-foreground">
                        {attributes.title}
                      </h1>
                    )}
                    {attributes.subtitle && (
                      <p className="text-2xl font-bold text-foreground/90">
                        {attributes.subtitle}
                      </p>
                    )}
                    {attributes.description && (
                      <p className="text-lg text-foreground/80 max-w-2xl">
                        {attributes.description}
                      </p>
                    )}
                  </div>
                  <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                </div>
              </section>
            );
          }

          case "menu-category": {
            const menuSlug = attributes.menu_slug;
            const menuObj = megaMenuData.find(m => m.slug === menuSlug);
            if (!menuObj) return null;

            const firstSection = menuObj.sections[0];
            const subCategories = firstSection ? firstSection.items : [];

            const resolveCategorySlug = (menuItemSlug: string) => {
              const mappings: Record<string, string> = {
                "pendant-lights": "pendant-lamps",
                "ceiling-lights": "ceiling-lamps",
                "wall-lights": "wall-lamps",
                "outdoor-lamps": "outdoor-lamps",
                "outdoor-wall-lights": "outdoor-lamps",
                "standing-lights": "outdoor-lamps",
                "solar-lights": "outdoor-lamps",
                "sensor-lights": "outdoor-lamps",
                "spotlights": "outdoor-lamps",
                "led-bulbs": "led-bulbs",
                "smart-bulbs": "smart-bulbs",
                "filament-bulbs": "led-bulbs",
                "e27": "led-bulbs",
                "e14": "led-bulbs",
                "gu10": "led-bulbs",
                "g9": "led-bulbs"
              };
              return mappings[menuItemSlug] || menuItemSlug;
            };

            const getCategoryImage = (itemSlug: string) => {
              const resolved = resolveCategorySlug(itemSlug);
              // Prefer DB categories over dummy categories
              const matchedDb = dbCategories.find(c => c.slug === resolved);
              if (matchedDb && matchedDb.image) return matchedDb.image;
              const matched = categories.find(c => c.slug === resolved);
              return matched ? matched.image : "";
            };

            const showLabel = attributes.show_label !== "false";

            return (
              <section key={index} className="container-page space-y-6 pt-4 pb-8">
                {showLabel && (
                  <div className="flex flex-col border-b pb-3 gap-2">
                    <Link 
                      to={`/relief/${menuObj.slug}`}
                      className="text-2xl font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
                    >
                      {menuObj.menu}
                      <span className="text-xs font-normal text-muted-foreground hover:underline">(View styles & all options)</span>
                    </Link>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {subCategories.map((item: any) => {
                    const imgUrl = getCategoryImage(item.slug);
                    const resolved = resolveCategorySlug(item.slug);
                    return (
                      <Link
                        key={item.slug}
                        to={`/category/${resolved}`}
                        className="group relative flex flex-col items-center overflow-hidden rounded-2xl bg-card border shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/30"
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                          {imgUrl ? (
                            <SafeImage
                              src={imgUrl}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              fallbackType="category"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground font-bold text-sm bg-muted">
                              {item.name}
                            </div>
                          )}
                        </div>
                        <div className="w-full bg-background py-3 px-4 text-center border-t">
                          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {item.name}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          }

          case "hero-banner": {
            const count = parseInt(attributes.count || "1");
            const slides = [];
            for (let i = 1; i <= count; i++) {
              slides.push({
                title: attributes[`title_${i}`] || attributes.title, // fallback for old shortcodes
                subtitle: attributes[`subtitle_${i}`] || attributes.subtitle,
                bgImage: attributes[`background_image_${i}`] || attributes.background_image,
                btnText: attributes[`primary_button_text_${i}`] || attributes.primary_button_text,
                btnLink: attributes[`primary_button_link_${i}`] || attributes.primary_button_link,
              });
            }
            return (
              <section key={index} className="container-page pt-6">
                <Carousel 
                  opts={{ loop: true }} 
                  className="w-full"
                >
                  <CarouselContent>
                    {slides.map((slide, sIndex) => (
                      <CarouselItem key={sIndex}>
                        <div className="relative h-full overflow-hidden rounded-xl">
                          <SafeImage src={slide.bgImage} alt="Hero" className="h-[280px] w-full object-cover md:h-[440px]" fallbackType="category" />
                          <div className="absolute inset-0 bg-black/40" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
                            {slide.title && (
                              <h1 className="text-5xl font-black text-primary drop-shadow-sm md:text-7xl" style={{ fontFamily: "Inter" }}>
                                {slide.title}
                              </h1>
                            )}
                            {slide.subtitle && (
                              <p className="mt-2 text-lg font-medium text-white md:text-2xl">{slide.subtitle}</p>
                            )}
                            {slide.btnText && slide.btnLink && (
                              <Button asChild size="lg" className="mt-6 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                                <Link to={slide.btnLink}>{slide.btnText}</Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {slides.length > 1 && (
                    <>
                      <CarouselPrevious className="left-4" />
                      <CarouselNext className="right-4" />
                    </>
                  )}
                </Carousel>
              </section>
            );
          }

          case "category-block": {
            const categoriesToRender = dbCategories.length > 0 ? dbCategories.slice(0, 12) : categories.slice(0, 12);
            return (
              <section key={index} className="container-page">
                {attributes.title && <h2 className="mb-6 text-2xl font-bold md:text-3xl">{attributes.title}</h2>}
                {loading ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 animate-pulse">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
                        <Skeleton className="aspect-square w-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4 mx-auto" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {categoriesToRender.map((c) => (
                      <Link key={c.slug} to={`/category/${c.slug}`} className="group relative overflow-hidden rounded-xl bg-muted aspect-square">
                        <div className="absolute inset-0">
                          <SafeImage src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" fallbackType="category" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80" />
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 text-white font-semibold text-sm truncate">{c.name}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            );
          }

          case "product-block": {
            let productsToRender = [];
            if (dbProducts.length > 0) {
              productsToRender = attributes.type === "deals"
                ? dbProducts.filter((p) => p.oldPrice !== null)
                : dbProducts.filter((p) => p.isBestSelling).slice(0, 8);
              if (productsToRender.length === 0) {
                productsToRender = dbProducts.slice(0, 8);
              }
            } else {
              productsToRender = attributes.type === "deals" ? dealProducts : featuredProducts.slice(0, 8);
            }
            return (
              <section key={index} className="container-page">
                <div className="mb-6 flex items-end justify-between">
                  {attributes.title && <h2 className="text-2xl font-bold md:text-3xl">{attributes.title}</h2>}
                  <Link to={`/category/${attributes.type || "all"}`} className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                    View all <ArrowRight size={16} />
                  </Link>
                </div>
                {loading ? (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 animate-pulse">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex flex-col gap-3 rounded-xl border p-4 shadow-sm">
                        <Skeleton className="aspect-square w-full rounded-lg" />
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-4 w-full" />
                        <div className="flex justify-between items-center mt-2">
                          <Skeleton className="h-5 w-1/4" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {productsToRender.map((p) => <ProductCard key={p.id} product={p} />)}
                  </div>
                )}
              </section>
            );
          }

          case "features-block": {
            const count = parseInt(attributes.count || "0");
            const feats = [];
            for (let i = 1; i <= count; i++) {
              feats.push({
                icon: attributes[`icon_${i}`],
                title: attributes[`title_${i}`],
                desc: attributes[`desc_${i}`]
              });
            }
            return (
              <section key={index} className="container-page">
                <div className="grid grid-cols-2 gap-4 rounded-2xl bg-muted p-6 md:grid-cols-4">
                  {feats.map((f, i) => {
                    const iconDef = iconMap.get(f.icon) || iconMap.get("star");
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          {iconDef && <FontAwesomeIcon icon={iconDef} size="sm" />}
                        </span>
                        <div>
                          <div className="text-sm font-bold">{f.title}</div>
                          <div className="text-xs text-muted-foreground">{f.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          }

          case "brands-block":
            return (
              <section key={index} className="container-page">
                {attributes.title && <h2 className="mb-6 text-2xl font-bold md:text-3xl">{attributes.title}</h2>}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                  {dbBrands.map((b) => (
                    <div key={b.id} className="grid h-20 place-items-center rounded-xl border bg-card text-sm font-bold uppercase tracking-wider text-muted-foreground transition hover:text-primary">
                      {b.name}
                    </div>
                  ))}
                </div>
              </section>
            );

          case "blogs-block": {
            const blogsToRender = dbBlogs.length > 0 ? dbBlogs.slice(0, 3) : initialBlogs.slice(0, 3);
            return (
              <section key={index} className="container-page">
                <div className="mb-6 flex items-end justify-between">
                  <div>
                    {attributes.title && <h2 className="text-2xl font-bold md:text-3xl">{attributes.title}</h2>}
                    {attributes.description && <p className="text-sm text-muted-foreground">{attributes.description}</p>}
                  </div>
                  <Link to="/blogs" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                    View all <ArrowRight size={16} />
                  </Link>
                </div>
                {loading ? (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex flex-col gap-3 rounded-xl border p-4 shadow-sm bg-card">
                        <Skeleton className="aspect-video w-full rounded-lg" />
                        <div className="flex justify-between items-center">
                          <Skeleton className="h-3 w-1/4" />
                          <Skeleton className="h-3 w-1/5" />
                        </div>
                        <Skeleton className="h-5 w-full mt-2" />
                        <Skeleton className="h-3.5 w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {blogsToRender.map((b) => <BlogCard key={b.id} blog={b} />)}
                  </div>
                )}
              </section>
            );
          }

          case "reviews-block": {
            if (dbTestimonials.length === 0) return null;
            return (
              <section key={index} className="container-page">
                <div className="mb-6 flex items-end justify-between">
                  {attributes.title && <h2 className="text-2xl font-bold md:text-3xl">{attributes.title}</h2>}
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {dbTestimonials.map((r: any) => (
                    <div key={r.id || r.name} className="rounded-xl border bg-card p-5 shadow-sm">
                      <StarRating value={r.rating || 5} size={16} />
                      {r.title && <h3 className="mt-2 font-semibold">{r.title}</h3>}
                      <p className="mt-2 text-sm text-muted-foreground">{r.message || r.text}</p>
                      <div className="mt-4 flex items-center gap-2">
                        {r.avatar && (
                          <SafeImage src={r.avatar} alt={r.name} className="h-8 w-8 rounded-full object-cover" />
                        )}
                        <p className="text-xs font-semibold text-foreground">— {r.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
