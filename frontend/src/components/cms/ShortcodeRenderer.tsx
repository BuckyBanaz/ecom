import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { BlogCard } from "@/components/shop/BlogCard";
import { categories } from "@/data/categories";
import { brandsList, dealProducts, featuredProducts, reviews } from "@/data/products";
import { initialBlogs } from "@/data/blogs";
import { StarRating } from "@/components/shop/StarRating";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { iconMap } from "@/utils/fontawesome";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface ShortcodeRendererProps {
  content: string;
}

export function ShortcodeRenderer({ content }: ShortcodeRendererProps) {
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
    <div className="space-y-12">
      {parts.map((part, index) => {
        if (part.type === 'html') {
          // If the HTML part is completely empty or just spaces/empty paragraphs, we can skip or render it
          // But dangerouslySetInnerHTML handles it fine
          return (
            <div 
              key={index} 
              className="prose prose-slate max-w-none dark:prose-invert" 
              dangerouslySetInnerHTML={{ __html: part.content }} 
            />
          );
        }
        
        const { blockType, attributes } = part;
        
        switch (blockType) {
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
                        <div className="relative overflow-hidden rounded-2xl">
                          {slide.bgImage && (
                            <img src={slide.bgImage} alt="Hero" className="h-[280px] w-full object-cover md:h-[440px]" />
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-black/10">
                            {slide.title && (
                              <h1 className="text-5xl font-black text-primary drop-shadow-sm md:text-7xl" style={{ fontFamily: "Inter" }}>
                                {slide.title}
                              </h1>
                            )}
                            {slide.subtitle && (
                              <p className="mt-2 text-lg font-medium text-foreground md:text-2xl">{slide.subtitle}</p>
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

          case "category-block":
            return (
              <section key={index} className="container-page">
                {attributes.title && <h2 className="mb-6 text-2xl font-bold md:text-3xl">{attributes.title}</h2>}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {categories.slice(0, 12).map((c) => (
                    <Link key={c.slug} to={`/category/${c.slug}`} className="group overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md">
                      <div className="aspect-square overflow-hidden bg-muted">
                        <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      </div>
                      <div className="p-3 text-center text-sm font-semibold">{c.name}</div>
                    </Link>
                  ))}
                </div>
              </section>
            );

          case "product-block":
            const products = attributes.type === "deals" ? dealProducts : featuredProducts.slice(0, 8);
            return (
              <section key={index} className="container-page">
                <div className="mb-6 flex items-end justify-between">
                  {attributes.title && <h2 className="text-2xl font-bold md:text-3xl">{attributes.title}</h2>}
                  <Link to={`/category/${attributes.type || "all"}`} className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                    View all <ArrowRight size={16} />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </section>
            );

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
                  {brandsList.map((b) => (
                    <div key={b} className="grid h-20 place-items-center rounded-xl border bg-card text-sm font-bold uppercase tracking-wider text-muted-foreground transition hover:text-primary">
                      {b}
                    </div>
                  ))}
                </div>
              </section>
            );

          case "blogs-block":
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
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {initialBlogs.slice(0, 3).map((b) => <BlogCard key={b.id} blog={b} />)}
                </div>
              </section>
            );

          case "reviews-block":
            return (
              <section key={index} className="container-page">
                <div className="mb-6 flex items-end justify-between">
                  {attributes.title && <h2 className="text-2xl font-bold md:text-3xl">{attributes.title}</h2>}
                  <span className="hidden text-sm text-muted-foreground md:block">15,000+ verified reviews</span>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {reviews.map((r) => (
                    <div key={r.name} className="rounded-xl border bg-card p-5 shadow-sm">
                      <StarRating value={r.rating} size={16} />
                      <h3 className="mt-2 font-semibold">{r.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
                      <p className="mt-4 text-xs font-semibold text-foreground">— {r.name}</p>
                    </div>
                  ))}
                </div>
              </section>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
