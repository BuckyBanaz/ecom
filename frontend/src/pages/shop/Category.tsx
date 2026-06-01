import { useMemo, useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { brandRepository, categoryRepository, attributeRepository, productRepository } from "@/client/apiClient";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { categories } from "@/data/categories";
import { products } from "@/data/products";
import { Brand } from "@/data/brands";
import { Attribute } from "@/data/attributes";
import { initialBlogs } from "@/data/blogs";
import { faqs } from "@/data/faqs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BlogCard } from "@/components/shop/BlogCard";
import { ShortcodeRenderer } from "@/components/cms/ShortcodeRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveImgUrl } from "@/utils/image";
import { CategorySkeleton } from "@/components/ui/SkeletonLoader";

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

const Category = () => {
  const { slug = "" } = useParams();
  const [searchParams] = useSearchParams();
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
        } else {
          setLandingPage(null);
        }
      } catch (e) {
        setLandingPage(null);
      }
    }
  }, [slug]);

  const resolvedSlug = useMemo(() => resolveCategorySlug(slug), [slug]);
  const cat = categoriesList.find((c) => c.slug === resolvedSlug) || categories.find((c) => c.slug === resolvedSlug);

  // Sync style filter from search queries
  useEffect(() => {
    const s = searchParams.get("style");
    if (s) {
      setSelectedFilters(prev => ({ ...prev, style: [s] }));
    } else {
      setSelectedFilters({});
    }
  }, [searchParams]);

  // Determine dynamic visible filters for this Category
  const visibleAttributes = useMemo(() => {
    const activeCatObj = categoriesList.find((c) => c.slug === resolvedSlug);
    
    const allowedAttrs = attributes.filter(attr => attr.visibility !== "admin");

    // DB categories attributes mapping
    if (activeCatObj?.categoryAttributes && activeCatObj.categoryAttributes.length > 0) {
      return allowedAttrs.filter(attr =>
        activeCatObj.categoryAttributes.some((ca: any) => ca.attribute.slug === attr.slug)
      );
    }

    // Local Storage / Static mockups fallback category-attributes mapping
    const fallbackCategoryMapping: Record<string, string[]> = {
      "pendant-lamps": ["color", "light-color", "material", "style", "room", "fitting", "dimmable", "dimmer-type", "length", "height", "width", "diameter"],
      "ceiling-lamps": ["color", "light-color", "material", "style", "room", "fitting", "dimmable", "dimmer-type", "length", "height", "width", "diameter"],
      "wall-lamps": ["color", "light-color", "material", "style", "room", "fitting", "dimmable", "ip-rating", "dimmer-type", "length", "height", "width", "diameter"],
      "outdoor-lamps": ["color", "light-color", "material", "style", "room", "dimmable", "ip-rating", "length", "height", "width", "diameter"],
      "floor-lamps": ["color", "light-color", "material", "style", "room", "fitting", "dimmable", "dimmer-type", "length", "height"],
      "table-lamps": ["color", "light-color", "material", "style", "room", "fitting", "dimmable", "dimmer-type", "length", "height"],
      "chandeliers": ["color", "light-color", "material", "style", "room", "fitting", "dimmable", "length", "height", "diameter"],
      "smart-bulbs": ["color", "light-color", "fitting", "dimmable", "dimmer-type"],
      "led-bulbs": ["color", "light-color", "fitting", "dimmable"],
      "string-lights": ["color", "light-color", "room", "dimmable", "ip-rating", "length"],
    };

    const mapping = fallbackCategoryMapping[resolvedSlug];
    if (mapping) {
      return allowedAttrs.filter(attr => mapping.includes(attr.slug));
    }

    return allowedAttrs; // Show all if category has no specific mappings defined
  }, [resolvedSlug, categoriesList, attributes]);

  // Faceted item counts calculator relative to the current category listing
  const getOptionCount = (type: "brand" | "attribute", slugName: string, value: string) => {
    const targetCategory = landingPage?.categorySlug || resolvedSlug;
    const isDeals = targetCategory === "deals";

    let allProductsList = productsList.length > 0 ? productsList : products;

    let list = isDeals
      ? allProductsList.filter((p) => p.oldPrice)
      : allProductsList.filter((p) => {
          const pCatSlug = typeof p.category === "object" ? p.category.slug : p.category;
          return pCatSlug === targetCategory;
        });
    
    if (list.length === 0 && !isDeals) list = allProductsList;

    if (type === "brand") {
      return list.filter((p) => p.brand === value).length;
    } else {
      return list.filter((p) => {
        if (p.attributes && p.attributes[slugName]) {
          const productAttrVal = p.attributes[slugName];
          if (Array.isArray(productAttrVal)) {
            return productAttrVal.some(v => v.toLowerCase() === value.toLowerCase());
          }
          return String(productAttrVal).toLowerCase() === value.toLowerCase();
        }
        // Fallback checks
        const flatVal = (p as any)[slugName];
        if (flatVal) {
          if (Array.isArray(flatVal)) {
            return flatVal.some(v => v.toLowerCase() === value.toLowerCase());
          }
          return String(flatVal).toLowerCase() === value.toLowerCase();
        }
        return false;
      }).length;
    }
  };

  // Color hex code helper for circular swatches
  const getColorHex = (value: string): string | undefined => {
    const lightColorAttr = attributes.find(a => a.slug === "light-color");
    const matchedLightVal = lightColorAttr?.values.find(v => v.value.toLowerCase() === value.toLowerCase());
    if (matchedLightVal?.colorCode) return matchedLightVal.colorCode;

    const colorAttr = attributes.find(a => a.slug === "color");
    const matchedVal = colorAttr?.values.find(v => v.value.toLowerCase() === value.toLowerCase());
    if (matchedVal?.colorCode) return matchedVal.colorCode;

    const manualMap: Record<string, string> = {
      black: "#000000",
      white: "#ffffff",
      gold: "#ffd700",
      silver: "#c0c0c0",
      copper: "#b87333",
      natural: "#e6c280",
      brass: "#b5a642",
      bronze: "#cd7f32",
      chrome: "#e8e8e8",
      grey: "#808080",
      gray: "#808080",
      yellow: "#facc15",
      red: "#ef4444",
      blue: "#3b82f6",
      green: "#22c55e",
      orange: "#f97316",
    };
    return manualMap[value.toLowerCase()];
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

    // Load active products list
    let allProductsList = productsList.length > 0 ? productsList : products;

    let list = isDeals
      ? allProductsList.filter((p) => p.oldPrice)
      : allProductsList.filter((p) => {
          const pCatSlug = typeof p.category === "object" ? p.category.slug : p.category;
          return pCatSlug === targetCategory;
        });
    
    if (list.length === 0 && !isDeals) list = allProductsList;

    // 1. Price slider
    list = list.filter((p) => p.price >= price[0] && p.price <= price[1]);

    // 1.5 Text Search
    const sq = searchParams.get("search")?.toLowerCase();
    if (sq) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(sq) || 
        p.description?.toLowerCase().includes(sq) ||
        p.shortDescription?.toLowerCase().includes(sq) ||
        (typeof p.category === 'string' && p.category.toLowerCase().includes(sq)) ||
        (typeof p.category === 'object' && p.category.name && p.category.name.toLowerCase().includes(sq))
      );
    }

    // 2. Brands
    if (selectedBrands.length > 0) {
      list = list.filter((p) => selectedBrands.includes(p.brand));
    }

    // 3. EAV Attributes mapping
    for (const [attrSlug, selectedVals] of Object.entries(selectedFilters)) {
      if (selectedVals.length > 0) {
        list = list.filter((p) => {
          // Check EAV relational attributes structure if present
          if (p.attributes && p.attributes[attrSlug]) {
            const productAttrVal = p.attributes[attrSlug];
            if (Array.isArray(productAttrVal)) {
              return productAttrVal.some(v => selectedVals.includes(v));
            }
            return selectedVals.includes(productAttrVal);
          }
          // Fallback check on flat properties
          const flatProp = (p as any)[attrSlug];
          if (flatProp) {
            if (Array.isArray(flatProp)) {
              return flatProp.some(v => selectedVals.includes(v));
            }
            return selectedVals.includes(flatProp);
          }
          return false;
        });
      }
    }

    // Sorting
    switch (sort) {
      case "price-asc": list = [...list].sort((a, b) => a.price - b.price); break;
      case "price-desc": list = [...list].sort((a, b) => b.price - a.price); break;
      case "rating": list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
    }
    return list;
  }, [resolvedSlug, landingPage, price, selectedBrands, selectedFilters, sort, productsList]);

  const title = landingPage?.title || (slug === "deals" ? "Spring deals" : cat?.name ?? "All products");

  if (productsLoading) {
    return <CategorySkeleton />;
  }

  return (
    <div className="container-page py-6">
      <nav className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link> /{" "}
        <Link to="/relief" className="hover:text-primary transition-colors">Relief</Link> /{" "}
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
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} products</p>
          <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
            
            {/* SIDEBAR FILTERS */}
            <aside className="space-y-4">
              
              {/* Price Filter Accordion */}
              <FilterBlock
                title="Price"
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
                  title="Brands"
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
                    getOptionCount={(val) => getOptionCount("attribute", attr.slug, val)}
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
                Clear filters
              </Button>
            </aside>

            {/* PRODUCT GRID */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Showing {filtered.length} results</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="relevance">Sort: Relevance</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="rating">Top rated</option>
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
                  <div className="rounded-xl border bg-muted/30 p-10 text-center text-muted-foreground">No products match your filters.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
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
              Show less <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show ({options.length - 4}) more <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </FilterBlock>
  );
}

export default Category;