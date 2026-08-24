import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { BlogCard } from "@/components/shop/BlogCard";
import { categories } from "@/data/categories";
import { StarRating } from "@/components/shop/StarRating";
import { FaIcon } from "@/components/ui/FaIcon";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { isMissingImage, resolveImgUrl } from "@/utils/image";
import { Skeleton } from "@/components/ui/skeleton";
import { productRepository, categoryRepository, blogRepository, brandRepository, cmsTestimonialsRepository, megaMenuRepository } from "@/client/apiClient";
import { SafeImage } from "@/components/ui/SafeImage";
import { labelT } from "@/utils/i18nLabel";
import { CmsHtmlContent } from "@/components/cms/CmsHtmlContent";
import { CmsLabel } from "@/components/cms/CmsLabel";
import { useCmsLabel } from "@/hooks/useCmsLabel";
import { decodeShortcodeAttribute } from "@/utils/shortcodeAttrs";
import { extractMegaMenus, readMegaMenusFromStorage } from "@/utils/megaMenu";
import { detectShortcodeBlocks } from "@/utils/cmsLocalStorage";
import type { MegaMenu } from "@/data/megaMenu";

type HeroBannerSlideData = {
  title?: string;
  subtitle?: string;
  bgImage?: string;
  btnText?: string;
  btnLink?: string;
  titleColor?: string;
  subtitleColor?: string;
  overlayOpacity: number;
  borderRadius: number;
};

function HeroBannerSlide({ slide, sIndex }: { slide: HeroBannerSlideData; sIndex: number }) {
  const { t } = useTranslation();
  const titleAlt = useCmsLabel(slide.title);
  const radius = slide.borderRadius ?? 12;
  const overlay = (slide.overlayOpacity ?? 40) / 100;

  return (
    <CarouselItem className="pl-2 md:pl-4">
      <div className="relative h-full overflow-hidden" style={{ borderRadius: radius }}>
        <SafeImage
          src={slide.bgImage}
          alt={titleAlt || t("shortcode.hero_banner", { defaultValue: "Hero banner" })}
          priority={sIndex === 0}
          responsiveWidths={sIndex === 0 ? [640, 960, 1200] : [640, 960]}
          sizes="100vw"
          width={1200}
          height={440}
          className="h-[220px] w-full object-cover sm:h-[280px] md:h-[440px]"
          style={{ borderRadius: radius }}
          fallbackType="category"
        />
        <div className="absolute inset-0 bg-black" style={{ opacity: overlay, borderRadius: radius }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-6 text-center text-white sm:px-6">
          {slide.title && (
            <CmsLabel
              as="h1"
              text={slide.title}
              className={`max-w-full break-words text-3xl font-black drop-shadow-sm sm:text-4xl md:text-6xl lg:text-7xl ${slide.titleColor ? "" : "text-primary"}`}
              style={{ fontFamily: "Inter", ...(slide.titleColor ? { color: slide.titleColor } : {}) }}
            />
          )}
          {slide.subtitle && (
            <CmsLabel
              as="p"
              text={slide.subtitle}
              className={`mt-2 max-w-full break-words text-base font-medium sm:text-lg md:text-2xl ${slide.subtitleColor ? "" : "text-white"}`}
              style={slide.subtitleColor ? { color: slide.subtitleColor } : undefined}
            />
          )}
          {slide.btnText && slide.btnLink && (
            <Button asChild size="lg" className="mt-6 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Link to={slide.btnLink}>
                <CmsLabel text={slide.btnText} />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </CarouselItem>
  );
}

interface ShortcodeRendererProps {
  content: string;
  prefetchedData?: {
    products?: any[];
    categories?: any[];
    blogs?: any[];
    brands?: any[];
    megaMenus?: MegaMenu[];
  };
}

export function ShortcodeRenderer({ content, prefetchedData }: ShortcodeRendererProps) {
  const { t, i18n } = useTranslation();
  const L = (text: string | undefined | null) => labelT(t, text, i18n.language);

  const requiredBlocks = useMemo(() => detectShortcodeBlocks(content), [content]);
  const needsProducts = requiredBlocks.has("product-block");
  const needsCategories =
    requiredBlocks.has("category-block") || requiredBlocks.has("menu-category");
  const needsBlogs = requiredBlocks.has("blogs-block");
  const needsBrands = requiredBlocks.has("brands-block");
  const needsTestimonials = requiredBlocks.has("reviews-block");
  const needsMegaMenu = requiredBlocks.has("menu-category");

  const [loading, setLoading] = useState(
    () =>
      (needsProducts && !prefetchedData?.products) ||
      (needsCategories && !prefetchedData?.categories) ||
      (needsBlogs && !prefetchedData?.blogs),
  );
  const [dbProducts, setDbProducts] = useState<any[]>(prefetchedData?.products || []);
  const [dbCategories, setDbCategories] = useState<any[]>(prefetchedData?.categories || []);
  const [dbBlogs, setDbBlogs] = useState<any[]>(prefetchedData?.blogs || []);
  const [dbBrands, setDbBrands] = useState<any[]>(prefetchedData?.brands || []);
  const [dbMegaMenus, setDbMegaMenus] = useState<MegaMenu[]>(prefetchedData?.megaMenus || readMegaMenusFromStorage());
  const [dbTestimonials, setDbTestimonials] = useState<any[]>([]);

  useEffect(() => {
    if (!needsTestimonials) return;
    let active = true;
    cmsTestimonialsRepository.get().then(res => {
      if (active && res.success && res.data) {
        const published = Array.isArray(res.data) ? res.data.filter((t: any) => t.published !== false) : [];
        setDbTestimonials(published);
      }
    }).catch(err => {
      console.warn("Failed to load testimonials:", err);
      try {
        const saved = localStorage.getItem("testimonials_data");
        if (saved && active) {
          const list = JSON.parse(saved);
          const published = Array.isArray(list) ? list.filter((t: any) => t.published !== false) : [];
          setDbTestimonials(published);
        }
      } catch {
        if (active) setDbTestimonials([]);
      }
    });
    return () => { active = false; };
  }, [needsTestimonials]);

  useEffect(() => {
    let active = true;

    if (requiredBlocks.size === 0) {
      setLoading(false);
      return () => { active = false; };
    }

    const applyPrefetched = () => {
      if (prefetchedData?.products) setDbProducts(prefetchedData.products);
      if (prefetchedData?.categories) setDbCategories(prefetchedData.categories);
      if (prefetchedData?.blogs) setDbBlogs(prefetchedData.blogs);
      if (prefetchedData?.brands) setDbBrands(prefetchedData.brands);
      if (prefetchedData?.megaMenus) setDbMegaMenus(prefetchedData.megaMenus);
    };

    const hasPrefetchedCore =
      (!needsProducts || !!prefetchedData?.products) &&
      (!needsCategories || !!prefetchedData?.categories) &&
      (!needsBlogs || !!prefetchedData?.blogs);

    if (hasPrefetchedCore) {
      applyPrefetched();
      if (needsBrands && !prefetchedData?.brands) {
        brandRepository.getAll().then(res => {
          if (active && res.success && res.brands) setDbBrands(res.brands);
        }).catch(err => console.warn("Failed to fetch brands", err));
      }
      if (needsMegaMenu && !prefetchedData?.megaMenus) {
        megaMenuRepository.getAll().then(res => {
          if (active && res.success && res.menus) setDbMegaMenus(res.menus);
        }).catch(() => {
          if (active) setDbMegaMenus(readMegaMenusFromStorage());
        });
      }
      setLoading(false);
      return () => { active = false; };
    }

    const fetchRealData = async () => {
      try {
        const tasks: Promise<any>[] = [];
        const taskKeys: string[] = [];
        if (needsProducts) {
          tasks.push(productRepository.getAll({ limit: 40 }));
          taskKeys.push("products");
        }
        if (needsCategories) {
          tasks.push(categoryRepository.getAll());
          taskKeys.push("categories");
        }
        if (needsBlogs) {
          tasks.push(blogRepository.getAll({ published: true }).catch(() => ({ success: false })));
          taskKeys.push("blogs");
        }
        if (needsBrands) {
          tasks.push(brandRepository.getAll().catch(() => ({ success: false })));
          taskKeys.push("brands");
        }
        if (needsMegaMenu) {
          tasks.push(megaMenuRepository.getAll().catch(() => ({ success: false })));
          taskKeys.push("menus");
        }

        if (tasks.length === 0) {
          setLoading(false);
          return;
        }

        const results = await Promise.all(tasks);
        if (!active) return;

        results.forEach((res, idx) => {
          const key = taskKeys[idx];
          if (key === "products" && res.success && res.products) setDbProducts(res.products);
          if (key === "categories" && res.success && res.categories) setDbCategories(res.categories);
          if (key === "blogs" && res.success && res.blogs) setDbBlogs(res.blogs);
          if (key === "brands" && res.success && res.brands) setDbBrands(res.brands);
          if (key === "menus") {
            if (res.success && res.menus) setDbMegaMenus(res.menus);
            else setDbMegaMenus(readMegaMenusFromStorage());
          }
        });
      } catch (err) {
        console.warn("Failed to load real data for Shortcodes:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchRealData();
    return () => { active = false; };
  }, [
    content,
    requiredBlocks,
    needsProducts,
    needsCategories,
    needsBlogs,
    needsBrands,
    needsMegaMenu,
    prefetchedData,
  ]);

  const parts = useMemo(() => {
    if (!content) return [];

    // 1. Clean the HTML by removing .cms-block wrappers but keeping the shortcode text
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    // Resolve relative /uploads/ image and document paths to absolute backend URLs
    const images = doc.querySelectorAll('img');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('/uploads/')) {
        img.setAttribute('src', resolveImgUrl(src));
      }
    });

    const links = doc.querySelectorAll('a');
    links.forEach(a => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('/uploads/')) {
        a.setAttribute('href', resolveImgUrl(href));
      }
    });

    const blocks = doc.querySelectorAll('.cms-block');
    
    blocks.forEach(block => {
      const span = block.querySelector('span');
      if (span) span.remove();
      
      const shortcode = block.textContent?.trim() || "";
      const textNode = doc.createTextNode(shortcode);
      block.replaceWith(textNode);
    });
    
    // Unwrap shortcodes from enclosing <p> tags before extracting html
    const paragraphs = Array.from(doc.querySelectorAll('p'));
    paragraphs.forEach(p => {
      // Check if paragraph contains only shortcodes, whitespace, br, or nbsp
      const html = p.innerHTML.trim();
      // Remove known shortcodes to see if anything else is left
      const withoutShortcodes = html.replace(/\[[a-zA-Z0-9-]+[^\]]*\]\[\/[a-zA-Z0-9-]+\]/g, '').trim();
      // If nothing is left except spacing/br, unwrap it
      if (withoutShortcodes.replace(/^(?:<br\s*\/?>|&nbsp;|\s)+$/, '') === '') {
        const textNode = doc.createTextNode(p.textContent || "");
        p.replaceWith(textNode);
      }
    });
    
    let cleanContent = doc.body.innerHTML;

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
        attributes[attrMatch[1]] = decodeShortcodeAttribute(attrMatch[2]);
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
    <div className="flex w-full min-w-0 flex-col overflow-x-clip">
      {parts.map((part, index) => {
        if (part.type === 'html') {
          // Clean up empty paragraphs that create huge gaps
          let html = part.content.trim();
          
          // Remove stray trailing/leading p tags or breaks that might have been left
          html = html.replace(/^(?:<p>\s*<\/p>|<br\s*\/?>|&nbsp;|\s)+/, '')
                     .replace(/(?:<p>\s*<\/p>|<br\s*\/?>|&nbsp;|\s)+$/, '')
                     .trim();
          
          // If the only thing left is a single empty paragraph or similar, ignore
          if (!html || html === '<p></p>' || html === '<p><br></p>') return null;

          return <CmsHtmlContent key={index} html={html} />;
        }
        
        const { blockType, attributes } = part;
        
        switch (blockType) {
          case "text-hero": {
            return (
              <section key={index} className="container-page pt-4 pb-8">
                <div className="relative overflow-hidden rounded-3xl bg-muted p-8 md:p-12 border shadow-xs">
                  <div className="relative z-10 max-w-4xl flex flex-col gap-4">
                    {attributes.title && (
                      <CmsLabel
                        as="h1"
                        text={attributes.title}
                        className="text-3xl font-extrabold md:text-5xl tracking-tight text-foreground"
                      />
                    )}
                    {attributes.subtitle && (
                      <CmsLabel
                        as="p"
                        text={attributes.subtitle}
                        className="text-2xl font-bold text-foreground/90"
                      />
                    )}
                    {attributes.description && (
                      <CmsLabel
                        as="p"
                        text={attributes.description}
                        className="text-lg text-foreground/80 max-w-2xl"
                      />
                    )}
                  </div>
                  <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                </div>
              </section>
            );
          }

          case "menu-category": {
            const menuSlug = attributes.menu_slug;
            const menuObj = dbMegaMenus.find((m) => m.slug === menuSlug);
            if (!menuObj) return null;

            const firstSection = menuObj.sections[0];
            const subCategories = firstSection ? firstSection.items : [];



            const getCategoryImage = (itemSlug: string) => {
              const matchedDb = dbCategories.find(c => c.slug === itemSlug);
              if (matchedDb?.image && !isMissingImage(matchedDb.image)) return matchedDb.image;
              const matched = categories.find(c => c.slug === itemSlug);
              return matched?.image && !isMissingImage(matched.image) ? matched.image : "";
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
                      {L(menuObj.menu)}
                      <span className="text-xs font-normal text-muted-foreground hover:underline">{t("shortcode.view_styles", { defaultValue: "(View styles & all options)" })}</span>
                    </Link>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 lg:gap-6">
                  {subCategories.map((item: any) => {
                    const imgUrl = getCategoryImage(item.slug);
                    const resolved = item.slug;
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
                              alt={L(item.name)}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              fallbackType="category"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground font-bold text-sm bg-muted">
                              {L(item.name)}
                            </div>
                          )}
                        </div>
                        <div className="w-full bg-background py-3 px-4 text-center border-t">
                          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {L(item.name)}
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
                title: attributes[`title_${i}`] || attributes.title,
                subtitle: attributes[`subtitle_${i}`] || attributes.subtitle,
                bgImage: attributes[`background_image_${i}`] || attributes.background_image,
                btnText: attributes[`primary_button_text_${i}`] || attributes.primary_button_text,
                btnLink: attributes[`primary_button_link_${i}`] || attributes.primary_button_link,
                titleColor: attributes[`title_color_${i}`] || "",
                subtitleColor: attributes[`subtitle_color_${i}`] || "",
                overlayOpacity: parseInt(attributes[`overlay_opacity_${i}`] || "40", 10),
                borderRadius: parseInt(attributes[`border_radius_${i}`] || "12", 10),
              });
            }
            return (
              <section key={index} className="container-page min-w-0 pt-4 pb-2 md:pt-6">
                <Carousel
                  opts={{ loop: true }}
                  className="w-full overflow-hidden"
                  aria-label="Hero banners"
                >
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {slides.map((slide, sIndex) => (
                      <HeroBannerSlide key={sIndex} slide={slide} sIndex={sIndex} />
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
            const categoriesToRender = dbCategories.slice(0, 12);
            return (
              <section key={index} className="container-page min-w-0 py-6 md:py-8">
                <div className="mb-4 flex min-w-0 items-end justify-between gap-3 sm:mb-6">
                  {attributes.title && <h2 className="min-w-0 text-xl font-bold sm:text-2xl md:text-3xl">{L(attributes.title)}</h2>}
                  <Link to="/categories" className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline sm:text-sm">
                    {t("common.viewAll")} <ArrowRight size={16} />
                  </Link>
                </div>
                {loading ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6 animate-pulse">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
                        <Skeleton className="aspect-square w-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4 mx-auto" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
                    {categoriesToRender.map((c) => (
                      <Link key={c.slug} to={`/category/${c.slug}`} className="group relative overflow-hidden rounded-xl bg-muted aspect-square">
                        <div className="absolute inset-0">
                          <SafeImage src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" fallbackType="category" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80" />
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 text-white font-semibold text-sm truncate">{L(c.name)}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            );
          }

          case "product-block": {
            let productsToRender = [];
            const filteredDb = attributes.type === "deals"
              ? dbProducts.filter((p) => p.oldPrice !== null)
              : dbProducts.filter((p) => p.isBestSelling).slice(0, 8);

            if (filteredDb.length > 0) {
              productsToRender = filteredDb;
            } else {
              productsToRender = dbProducts.slice(0, 8);
            }
            return (
              <section key={index} className="container-page min-w-0 py-6 md:py-8">
                <div className="mb-4 flex min-w-0 items-end justify-between gap-3 sm:mb-6">
                  {attributes.title && <h2 className="min-w-0 text-xl font-bold sm:text-2xl md:text-3xl">{L(attributes.title)}</h2>}
                  <Link to={`/category/${attributes.type || "all"}`} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline sm:text-sm">
                    {t("common.viewAll")} <ArrowRight size={16} />
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
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
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
                <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-5 rounded-2xl bg-muted p-6 md:gap-x-14 md:p-8">
                  {feats.map((f, i) => (
                      <div key={i} className="flex w-full max-w-[280px] items-start gap-3 sm:w-auto sm:min-w-[200px]">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          <FaIcon name={f.icon || "star"} className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-sm font-bold">{L(f.title)}</div>
                          <div className="text-xs text-muted-foreground">{L(f.desc)}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            );
          }

          case "brands-block":
            return (
              <section key={index} className="container-page">
                {attributes.title && <h2 className="mb-6 text-2xl font-bold md:text-3xl">{L(attributes.title)}</h2>}
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
            const blogsToRender = dbBlogs.slice(0, 3);
            return (
              <section key={index} className="container-page">
                <div className="mb-6 flex items-end justify-between">
                  <div>
                    {attributes.title && <h2 className="text-2xl font-bold md:text-3xl">{L(attributes.title)}</h2>}
                    {attributes.description && <p className="text-sm text-muted-foreground">{L(attributes.description)}</p>}
                  </div>
                  <Link to="/blogs" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                    {t("common.viewAll")} <ArrowRight size={16} />
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
                  {attributes.title && <h2 className="text-2xl font-bold md:text-3xl">{L(attributes.title)}</h2>}
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {dbTestimonials.map((r: any) => (
                    <div key={r.id || r.name} className="rounded-xl border bg-card p-5 shadow-sm">
                      <StarRating value={r.rating || 5} size={16} />
                      {r.title && <h3 className="mt-2 font-semibold">{L(r.title)}</h3>}
                      <p className="mt-2 text-sm text-muted-foreground">{L(r.message || r.text)}</p>
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
