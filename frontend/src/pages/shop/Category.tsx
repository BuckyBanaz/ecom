import { useMemo, useState, useEffect } from "react";
import { Link, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { brandRepository, categoryRepository, attributeRepository, productRepository } from "@/client/apiClient";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Info, Filter } from "lucide-react";
import { categories } from "@/data/categories";
import { products } from "@/data/products";
import { Brand } from "@/data/brands";
import { Attribute } from "@/data/attributes";
import { initialBlogs } from "@/data/blogs";
import { faqs } from "@/data/faqs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { BlogCard } from "@/components/shop/BlogCard";
import { ShortcodeRenderer } from "@/components/cms/ShortcodeRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveImgUrl } from "@/utils/image";
import { getProductBrandName, getProductCategorySlug } from "@/utils/formatters";
import { countProductsWithFilterValue, productMatchesAttributeFilter } from "@/utils/productFilters";
import { CategorySkeleton } from "@/components/ui/SkeletonLoader";



const Category = () => {
  const { t } = useTranslation();
  const { slug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isRelief = location.pathname.startsWith("/relief");
  const [landingPage, setLandingPage] = useState<any>(null);

  // Dynamic Metadata States
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [blogsList, setBlogsList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Filter values
  const [price, setPrice] = useState<[number, number]>([0, 400]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState("relevance");

  // Track open collapsible sidebar sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Price: true,
    Brands: true,
    Color: true,
    Material: true,
    Style: true,
    Room: true,
    "Bulb Fitting": true,
    Dimmable: true,
    "IP Rating": true,
  });

  const toggleSection = (sectionTitle: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  // Load brands, categories, attributes, and products in parallel on mount
  useEffect(() => {
    const loadAllData = async () => {
      setProductsLoading(true);
      try {
        const [prodData, brandData, catData, attrData] = await Promise.all([
          productRepository.getAll({ limit: 1000 }).catch(() => null),
          brandRepository.getAll().catch(() => null),
          categoryRepository.getAll().catch(() => null),
          attributeRepository.getAll().catch(() => null),
        ]);

        // Products
        if (prodData && prodData.success && prodData.products) {
          setProductsList(prodData.products);
        } else {
          const saved = localStorage.getItem("products_data");
          if (saved) {
            try { setProductsList(JSON.parse(saved)); } catch { setProductsList(products); }
          } else {
            setProductsList(products);
          }
        }

        // Brands
        if (brandData && brandData.success && brandData.brands) {
          setBrands(brandData.brands);
        } else {
          const saved = localStorage.getItem("brands_data");
          if (saved) {
            setBrands(JSON.parse(saved));
          } else {
            const { brands: initialBrands } = await import("@/data/brands");
            setBrands(initialBrands);
          }
        }

        // Categories
        let loadedCats = categories;
        if (catData && catData.success && catData.categories) {
          loadedCats = catData.categories;
        } else {
          const saved = localStorage.getItem("categories_data");
          if (saved) {
            try { loadedCats = JSON.parse(saved); } catch { loadedCats = categories; }
          }
        }

        const groupMapping: Record<string, string> = {
          "indoor": "interior-lighting",
          "outdoor": "outdoor-lighting",
          "smart": "light-sources",
          "bulbs": "light-sources",
          "business": "commercial-lighting",
          "accessories": "interior-lighting"
        };
        let migrated = false;
        const mappedCats = loadedCats.map((c: any) => {
          if (groupMapping[c.group]) {
            migrated = true;
            return { ...c, group: groupMapping[c.group] };
          }
          return c;
        });
        if (migrated) {
          localStorage.setItem("categories_data", JSON.stringify(mappedCats));
        }
        setCategoriesList(mappedCats);

        // Attributes
        if (attrData && attrData.success && attrData.attributes) {
          const mapped = attrData.attributes.map((a: any) => ({
            id: a.id,
            name: a.name,
            slug: a.slug,
            type: a.type,
            values: a.attributeValues || [],
            visibility: a.visibility || "both",
          }));
          setAttributes(mapped);
        } else {
          const saved = localStorage.getItem("attributes_data");
          if (saved) {
            setAttributes(JSON.parse(saved));
          } else {
            const { attributes: initialAttributes } = await import("@/data/attributes");
            setAttributes(initialAttributes);
          }
        }

        // Blogs
        const savedBlogs = localStorage.getItem("blogs_data");
        if (savedBlogs) {
          try { setBlogsList(JSON.parse(savedBlogs)); } catch { setBlogsList(initialBlogs); }
        } else {
          setBlogsList(initialBlogs);
        }
      } catch (err) {
        console.warn("Failed to fetch Category metadata in parallel:", err);
      } finally {
        setProductsLoading(false);
      }
    };

    loadAllData();
  }, []);

  // Sync CMS Landing Pages details
  useEffect(() => {
    const saved = localStorage.getItem("landing_pages_data");
    if (saved) {
      try {
        const pages = JSON.parse(saved);
        if (pages[slug]) {
          setLandingPage(pages[slug]);
          
          // Apply SEO Metadata dynamically
          const pageData = pages[slug];
          document.title = pageData.seoTitle || pageData.title || pageData.name;
          
          let metaDesc = document.querySelector('meta[name="description"]');
          if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
          }
          metaDesc.setAttribute('content', pageData.seoDescription || "");

          if (pageData.seoKeywords) {
            let metaKeywords = document.querySelector('meta[name="keywords"]');
            if (!metaKeywords) {
              metaKeywords = document.createElement('meta');
              metaKeywords.setAttribute('name', 'keywords');
              document.head.appendChild(metaKeywords);
            }
            metaKeywords.setAttribute('content', pageData.seoKeywords);
          }
        } else {
          setLandingPage(null);
        }
      } catch (e) {
        setLandingPage(null);
      }
    }
  }, [slug]);

  const resolvedSlug = slug;
  const cat = categoriesList.find((c) => c.slug === resolvedSlug) || categories.find((c) => c.slug === resolvedSlug);

  // Sync filters from search queries
  useEffect(() => {
    const filters: Record<string, string[]> = {};
    const metadataKeys = [
      "search", "page", "sort", "price-min", "price-max", 
      "bestseller", "new", "limited", "clearance", "bundle"
    ];
    let brandVal: string[] = [];

    searchParams.forEach((value, key) => {
      if (metadataKeys.includes(key)) return;
      if (key === "brand") {
        brandVal = value.split(",");
      } else {
        filters[key] = value.split(",");
      }
    });

    setSelectedFilters(filters);
    setSelectedBrands(brandVal);

    // Handle price query parameters
    const minPrice = searchParams.get("price-min") ? Number(searchParams.get("price-min")) : 0;
    const maxPrice = searchParams.get("price-max") ? Number(searchParams.get("price-max")) : 400;
    setPrice([minPrice, maxPrice]);
  }, [searchParams]);

  // Determine dynamic visible filters for this Category based on category attributes and product attributes presence
  const visibleAttributes = useMemo(() => {
    const activeCatObj = categoriesList.find((c) => c.slug === resolvedSlug);
    const allowedAttrs = attributes.filter(attr => attr.visibility !== "admin");

    // DB categories attributes mapping
    if (activeCatObj?.categoryAttributes && activeCatObj.categoryAttributes.length > 0) {
      return allowedAttrs.filter(attr =>
        activeCatObj.categoryAttributes.some((ca: any) => ca.attribute.slug === attr.slug)
      );
    }

    // Otherwise, dynamically show attributes that are actually present on the current filtered category's products!
    const targetCategory = landingPage?.categorySlug || resolvedSlug;
    const isDeals = targetCategory === "deals";
    const isBestsellers = targetCategory === "bestsellers";
    
    let allProductsList = productsList.length > 0 ? productsList : products;
    let list = isDeals
      ? allProductsList.filter((p) => p.oldPrice)
      : isBestsellers
        ? allProductsList.filter((p) => p.isBestSelling)
        : targetCategory
          ? allProductsList.filter((p) => {
              const pCatSlug = getProductCategorySlug(p.category);
              if (pCatSlug === targetCategory) return true;
              if (targetCategory === "interior-lighting" || targetCategory === "all-lamps") {
                const categoryObj = categoriesList.find(c => c.slug === pCatSlug) || categories.find(c => c.slug === pCatSlug);
                return categoryObj?.group === "interior-lighting";
              }
              const categoryObj = categoriesList.find(c => c.slug === pCatSlug) || categories.find(c => c.slug === pCatSlug);
              return categoryObj && categoryObj.group === targetCategory;
            })
          : allProductsList;

    const presentAttributeSlugs = new Set<string>();
    list.forEach(p => {
      allowedAttrs.forEach(attr => {
        if (p[attr.slug] != null) presentAttributeSlugs.add(attr.slug);
        if (p.attributes?.[attr.slug] != null) presentAttributeSlugs.add(attr.slug);
      });
      if (Array.isArray(p.specs)) {
        p.specs.forEach((spec: any) => {
          if (spec.key) {
            const cleanKey = (spec.key.includes("::") ? spec.key.split("::").pop()! : spec.key).trim();
            const matchedAttr = allowedAttrs.find(a => a.name.toLowerCase() === cleanKey.toLowerCase() || a.slug === cleanKey.toLowerCase().replace(/\s+/g, "-"));
            if (matchedAttr) presentAttributeSlugs.add(matchedAttr.slug);
          }
        });
      } else if (p.specs && typeof p.specs === "object") {
        Object.keys(p.specs).forEach(key => {
          const cleanKey = (key.includes("::") ? key.split("::").pop()! : key).trim();
          const matchedAttr = allowedAttrs.find(a => a.name.toLowerCase() === cleanKey.toLowerCase() || a.slug === cleanKey.toLowerCase().replace(/\s+/g, "-"));
          if (matchedAttr) presentAttributeSlugs.add(matchedAttr.slug);
        });
      }
      if (Array.isArray(p.productAttributeValues)) {
        p.productAttributeValues.forEach((pav: any) => {
          if (pav?.attribute?.slug) presentAttributeSlugs.add(pav.attribute.slug);
        });
      }
    });

    if (presentAttributeSlugs.size > 0) {
      return allowedAttrs.filter(attr => presentAttributeSlugs.has(attr.slug));
    }
    return allowedAttrs;
  }, [resolvedSlug, categoriesList, attributes, productsList, landingPage]);

  // Faceted item counts calculator relative to the current category listing
  const getOptionCount = (type: "brand" | "attribute", slugName: string, value: string, attributeName?: string) => {
    const targetCategory = landingPage?.categorySlug || resolvedSlug;
    const isDeals = targetCategory === "deals";
    const isBestsellers = targetCategory === "bestsellers";

    let allProductsList = productsList.length > 0 ? productsList : products;

    let list = isDeals
      ? allProductsList.filter((p) => p.oldPrice)
      : isBestsellers
        ? allProductsList.filter((p) => p.isBestSelling)
        : targetCategory
          ? allProductsList.filter((p) => {
              const pCatSlug = getProductCategorySlug(p.category);
              if (pCatSlug === targetCategory) return true;
              
              if (targetCategory === "interior-lighting" || targetCategory === "all-lamps") {
                const categoryObj = categoriesList.find(c => c.slug === pCatSlug) || categories.find(c => c.slug === pCatSlug);
                return categoryObj?.group === "interior-lighting";
              }

              const categoryObj = categoriesList.find(c => c.slug === pCatSlug) || categories.find(c => c.slug === pCatSlug);
              if (categoryObj && categoryObj.group === targetCategory) {
                return true;
              }

              return false;
            })
          : allProductsList;
    
    if (isBestsellers && list.length === 0) {
      list = [...allProductsList].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    if (list.length === 0 && !isDeals && !isBestsellers && targetCategory) list = allProductsList;

    return countProductsWithFilterValue(list, type, slugName, value, attributeName);
  };

  // Color hex code helper for circular swatches
  const getColorHex = (value: string): string | undefined => {
    const lightColorAttr = attributes.find(a => a.slug === "light-color");
    const matchedLightVal = lightColorAttr?.values.find(v => v.value.toLowerCase() === value.toLowerCase());
    if (matchedLightVal?.colorCode) return matchedLightVal.colorCode;

    const colorAttr = attributes.find(a => a.slug === "color");
    const matchedVal = colorAttr?.values.find(v => v.value.toLowerCase() === value.toLowerCase());
    if (matchedVal?.colorCode) return matchedVal.colorCode;

    // Fallback: use the lowercase value string itself (standard CSS color name)
    return value.toLowerCase();
  };

  // Toggling an attribute filter option
  const toggleFilter = (attrSlug: string, value: string) => {
    setSelectedFilters(prev => {
      const current = prev[attrSlug] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return {
        ...prev,
        [attrSlug]: updated
      };
    });
  };

  const filtered = useMemo(() => {
    const targetCategory = landingPage?.categorySlug || resolvedSlug;
    const isDeals = targetCategory === "deals";
    const isBestsellers = targetCategory === "bestsellers";

    // Load active products list
    let allProductsList = productsList.length > 0 ? productsList : products;

    let list = isDeals
      ? allProductsList.filter((p) => p.oldPrice)
      : isBestsellers
        ? allProductsList.filter((p) => p.isBestSelling)
        : targetCategory
          ? allProductsList.filter((p) => {
              const pCatSlug = getProductCategorySlug(p.category);
              if (pCatSlug === targetCategory) return true;
              
              if (targetCategory === "interior-lighting" || targetCategory === "all-lamps") {
                const categoryObj = categoriesList.find(c => c.slug === pCatSlug) || categories.find(c => c.slug === pCatSlug);
                return categoryObj?.group === "interior-lighting";
              }

              const categoryObj = categoriesList.find(c => c.slug === pCatSlug) || categories.find(c => c.slug === pCatSlug);
              if (categoryObj && categoryObj.group === targetCategory) {
                return true;
              }

              return false;
            })
          : allProductsList;
    
    if (isBestsellers && list.length === 0) {
      list = [...allProductsList].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    if (list.length === 0 && !isDeals && !isBestsellers && targetCategory) list = allProductsList;

    // 1. Price slider
    list = list.filter((p) => p.price >= price[0] && p.price <= price[1]);

    // 1.2 Custom Query Parameters filtration
    if (searchParams.get("bestseller") === "Yes") {
      list = list.filter((p) => p.isBestSelling);
    }
    if (searchParams.get("new") === "Yes") {
      list = list.filter((p) => p.isNewArrival);
    }
    if (searchParams.get("limited") === "Yes" || searchParams.get("clearance") === "Clearance") {
      list = list.filter((p) => p.oldPrice != null);
    }

    // 1.5 Text Search
    const sq = searchParams.get("search")?.toLowerCase();
    if (sq) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(sq) || 
        p.description?.toLowerCase().includes(sq) ||
        p.shortDescription?.toLowerCase().includes(sq) ||
        (typeof p.category === 'string' && p.category.toLowerCase().includes(sq)) ||
        (typeof p.category === 'object' && p.category?.name && p.category.name.toLowerCase().includes(sq))
      );
    }

    // 2. Brands
    if (selectedBrands.length > 0) {
      list = list.filter((p) => selectedBrands.includes(getProductBrandName(p.brand)));
    }

    // 2.5 Category filter (useful for deals page category filtering)
    const catFilter = selectedFilters["category"];
    if (catFilter && catFilter.length > 0) {
      list = list.filter((p) => catFilter.includes(getProductCategorySlug(p.category)));
    }

    // 3. Attributes + specs + EAV (productAttributeValues)
    for (const [attrSlug, selectedVals] of Object.entries(selectedFilters)) {
      if (attrSlug === "category") continue;
      if (selectedVals.length > 0) {
        const attrMeta = attributes.find((a) => a.slug === attrSlug);
        list = list.filter((p) =>
          productMatchesAttributeFilter(p, attrSlug, selectedVals, attrMeta?.name)
        );
      }
    }

    // Sorting
    switch (sort) {
      case "price-asc": list = [...list].sort((a, b) => a.price - b.price); break;
      case "price-desc": list = [...list].sort((a, b) => b.price - a.price); break;
      case "rating": list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
    }
    return list;
  }, [resolvedSlug, landingPage, price, selectedBrands, selectedFilters, sort, productsList, attributes]);

  const title = landingPage?.title || (
    slug === "deals" 
      ? t("category.spring_deals") 
      : slug === "bestsellers" 
        ? t("category.bestsellers", { defaultValue: "Bestsellers" }) 
        : slug === "interior-lighting"
          ? t("category.interior_lighting", { defaultValue: "Interior Lighting" })
          : slug === "light-sources"
            ? t("category.light_sources", { defaultValue: "Light Sources" })
            : cat?.name ?? t("category.all_products")
  );

  if (productsLoading) {
    return <CategorySkeleton />;
  }

  const filtersSidebar = (
    <div className="space-y-4">
      {/* Price Filter Accordion */}
      <FilterBlock
        title={t("category.filter_titles.price")}
        isOpen={openSections["Price"]}
        onToggle={() => toggleSection("Price")}
      >
        <div className="pt-2">
          <Slider value={price} min={0} max={400} step={5} onValueChange={(v) => setPrice([v[0], v[1]] as [number, number])} />
          <div className="mt-3 flex justify-between text-xs font-semibold text-muted-foreground">
            <span>€{price[0]}</span><span>€{price[1]}</span>
          </div>
        </div>
      </FilterBlock>

      {/* Brands Filter Accordion */}
      {brands.length > 0 && (
        <CheckBlock
          title={t("category.filter_titles.brands")}
          options={brands.map(b => b.name)}
          selected={selectedBrands}
          onToggle={(brandName) => {
            setSelectedBrands(prev =>
              prev.includes(brandName) ? prev.filter(x => x !== brandName) : [...prev, brandName]
            );
          }}
          getOptionCount={(val) => getOptionCount("brand", "", val)}
          isOpen={openSections["Brands"]}
          onToggleSection={() => toggleSection("Brands")}
        />
      )}

      {/* Dynamic Category specific EAV attributes */}
      {visibleAttributes.map((attr) => {
        const sectionName = attr.name;
        const isSectionOpen = openSections[sectionName] ?? true;
        const hasInfoIcon = attr.slug === "dimmable" || attr.slug === "fitting" || attr.slug === "ip-rating";

        return (
          <CheckBlock
            key={attr.id}
            title={attr.name}
            options={attr.values.map(v => v.value)}
            selected={selectedFilters[attr.slug] || []}
            onToggle={(val) => toggleFilter(attr.slug, val)}
            getOptionCount={(val) => getOptionCount("attribute", attr.slug, val, attr.name)}
            getColorHex={attr.slug === "color" || attr.slug === "light-color" || attr.slug === "fitting" ? getColorHex : undefined}
            hasInfo={hasInfoIcon}
            isOpen={isSectionOpen}
            onToggleSection={() => toggleSection(sectionName)}
          />
        );
      })}

      <Button
        variant="outline"
        className="w-full mt-2"
        onClick={() => {
          setSelectedBrands([]);
          setSelectedFilters({});
          setPrice([0, 400]);
        }}
      >
        {t("category.clear_filters")}
      </Button>
    </div>
  );

  return (
    <div className="container-page py-6">
      <nav className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary transition-colors">{t("breadcrumb.home")}</Link> /{" "}
        {isRelief ? (
          <>
            <Link to="/relief" className="hover:text-primary transition-colors">{t("breadcrumb.relief")}</Link> /{" "}
          </>
        ) : (
          <>
            <Link to="/categories" className="hover:text-primary transition-colors">{t("category.categories", { defaultValue: "Categories" })}</Link> /{" "}
          </>
        )}
        <span className="text-foreground font-medium">{title}</span>
      </nav>
      <h1 className="text-3xl font-bold md:text-4xl mb-2">{title}</h1>
      
      {landingPage?.description && (
        <div 
          className="mt-4 mb-6 p-6 border rounded-xl bg-card shadow-xs prose max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: landingPage.description }}
        />
      )}
      
      {landingPage?.content || landingPage?.blocks?.length > 0 ? (
        <div className="mt-8">
          <ShortcodeRenderer 
            content={
              landingPage.content || 
              (Array.isArray(landingPage.blocks) 
                ? landingPage.blocks.map((b: any) => b.description || "").filter(Boolean).join("<br/>") 
                : "")
            } 
            prefetchedData={{ products: productsList, categories: categoriesList, blogs: blogsList }}
          />
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{t("category.products_count", { count: filtered.length })}</p>
          <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
            
            {/* SIDEBAR FILTERS - DESKTOP */}
            <aside className="hidden lg:block">
              {filtersSidebar}
            </aside>

            {/* PRODUCT GRID */}
            <div>
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="lg:hidden gap-2">
                        <Filter className="h-4 w-4" /> {t("category.filters")}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] sm:w-[350px] overflow-y-auto">
                      <SheetHeader className="mb-4 text-left">
                        <SheetTitle>{t("category.filters")}</SheetTitle>
                        <SheetDescription className="sr-only">{t("category.filter_products")}</SheetDescription>
                      </SheetHeader>
                      {filtersSidebar}
                    </SheetContent>
                  </Sheet>
                  <span className="text-sm text-muted-foreground">{t("category.showing_results", { count: filtered.length })}</span>
                </div>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm w-full sm:w-auto">
                  <option value="relevance">{t("category.sort.relevance")}</option>
                  <option value="price-asc">{t("category.sort.price_asc")}</option>
                  <option value="price-desc">{t("category.sort.price_desc")}</option>
                  <option value="rating">{t("category.sort.top_rated")}</option>
                </select>
              </div>
               {productsLoading ? (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 animate-pulse">
                    {Array.from({ length: 6 }).map((_, i) => (
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
                ) : filtered.length === 0 ? (
                  <div className="rounded-xl border bg-muted/30 p-10 text-center text-muted-foreground">{t("category.no_results")}</div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {filtered.filter((p) => p?.id && p?.name).map((p) => <ProductCard key={p.id} product={p} />)}
                  </div>
                )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function FilterBlock({
  title,
  children,
  hasInfo = false,
  isOpen = true,
  onToggle,
}: {
  title: string;
  children: React.ReactNode;
  hasInfo?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div
        className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-muted/10 transition-colors select-none"
        onClick={onToggle}
      >
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {hasInfo && (
            <span
              className="text-[10px] text-muted-foreground hover:text-foreground font-bold flex items-center justify-center h-4 w-4 rounded-full border border-muted-foreground/35 cursor-help"
              title="Filter context info"
              onClick={(e) => e.stopPropagation()}
            >
              ⓘ
            </span>
          )}
        </div>
        <span className="text-muted-foreground text-xs font-semibold">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </div>
      {isOpen && <div className="p-4 pt-0 border-t bg-card/45">{children}</div>}
    </div>
  );
}

function CheckBlock({
  title,
  options,
  selected,
  onToggle,
  getOptionCount,
  getColorHex,
  hasInfo = false,
  isOpen = true,
  onToggleSection,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  getOptionCount?: (v: string) => number;
  getColorHex?: (v: string) => string | undefined;
  hasInfo?: boolean;
  isOpen?: boolean;
  onToggleSection?: () => void;
}) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const visibleOptions = showAll ? options : options.slice(0, 4);

  return (
    <FilterBlock title={title} hasInfo={hasInfo} isOpen={isOpen} onToggle={onToggleSection}>
      <ul className="space-y-2.5 pt-2 max-h-56 overflow-y-auto pr-1">
        {visibleOptions.map((o) => {
          const count = getOptionCount ? getOptionCount(o) : 0;
          const colorHex = getColorHex ? getColorHex(o) : undefined;
          
          return (
            <li key={o} className="flex items-center justify-between gap-2 group">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${title}-${o}`}
                  checked={selected.includes(o)}
                  onCheckedChange={() => onToggle(o)}
                />
                
                {colorHex && (
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-xs shrink-0"
                    style={{ background: colorHex }}
                  />
                )}
                
                <label
                  htmlFor={`${title}-${o}`}
                  className="cursor-pointer text-sm font-medium text-foreground/80 group-hover:text-foreground select-none"
                >
                  {o}
                </label>
              </div>
              
              {/* Product facet count */}
              <span className="text-xs text-muted-foreground/85 font-mono">
                ({count})
              </span>
            </li>
          );
        })}
      </ul>
      
      {options.length > 4 && (
        <button
          type="button"
          className="mt-3 text-xs font-semibold text-primary hover:underline flex items-center gap-1 transition-all"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              {t("category.show_less")} <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              {t("category.show_more", { count: options.length - 4 })} <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </FilterBlock>
  );
}

export default Category;