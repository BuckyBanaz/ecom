import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { categories } from "@/data/categories";
import { megaMenuData } from "@/data/megaMenu";
import { ProductCard } from "@/components/shop/ProductCard";
import { productRepository, categoryRepository, megaMenuRepository } from "@/client/apiClient";
import { initialBlogs } from "@/data/blogs";
import { faqs } from "@/data/faqs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BlogCard } from "@/components/shop/BlogCard";
import { ShortcodeRenderer } from "@/components/cms/ShortcodeRenderer";
import { resolveImgUrl } from "@/utils/image";
import { Skeleton } from "@/components/ui/skeleton";
import { ReliefCategorySkeleton } from "@/components/ui/SkeletonLoader";

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



const styleDescriptions: Record<string, string> = {
  Industrial: "Are you looking for a cool lamp with a robust shape? Then industrial indoor lighting is definitely for you! Steel, wood, and glass are the most commonly used materials for industrial indoor lighting. The most common colors within this style are black, gray, and rust brown.",
  Modern: "Clean lines, sleek designs, and the latest lighting technology. Modern lighting focuses on simplicity and functional beauty, often featuring integrated LED, chrome finishes, and minimalist shapes.",
  Vintage: "Vintage indoor lighting takes you back in time. The designs are simple with a beautiful finish. These stylish vintage lamps are characterized by their round shapes, glass, brass, and classic metallic accents.",
  Classic: "Elegant, timeless, and sophisticated. Classic lighting features ornate details, warm metallic accents, and traditional designs that add a touch of luxury and grandeur to any home.",
  Rustic: "Bring the warmth of nature indoors. Rustic lighting combines natural elements like wood, rope, and aged metal to create a cozy, welcoming cottage atmosphere."
};

export default function ReliefCategory() {
  const { slug = "" } = useParams();
  const [menus, setMenus] = useState<any[]>([]);
  const [landingPage, setLandingPage] = useState<any>(null);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [blogsList, setBlogsList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getCategoryImage = (itemSlug: string) => {
    const resolved = resolveCategorySlug(itemSlug);
    const matchedDb = categoriesList.find(c => c.slug === resolved);
    if (matchedDb && matchedDb.image) return matchedDb.image;
    const matched = categories.find(c => c.slug === resolved);
    return matched ? matched.image : "";
  };

  useEffect(() => {
    const groupMapping: Record<string, string> = {
      "indoor": "interior-lighting",
      "outdoor": "outdoor-lighting",
      "smart": "light-sources",
      "bulbs": "light-sources",
      "business": "commercial-lighting",
      "accessories": "interior-lighting"
    };

    const loadRealData = async () => {
      setIsLoading(true);
      try {
        const [catRes, prodRes, menuRes] = await Promise.all([
          categoryRepository.getAll().catch(() => null),
          productRepository.getAll().catch(() => null),
          megaMenuRepository.getAll().catch(() => null),
        ]);

        if (menuRes && menuRes.success && menuRes.megaMenus) {
          setMenus(menuRes.megaMenus);
        } else {
          const savedMenus = localStorage.getItem("mega_menu_data");
          if (savedMenus) {
            try {
              setMenus(JSON.parse(savedMenus));
            } catch (e) {
              setMenus(megaMenuData);
            }
          } else {
            setMenus(megaMenuData);
          }
        }

        if (catRes && catRes.success && catRes.categories) {
          const apiCats = catRes.categories;
          const mappedCats = apiCats.map((c: any) => {
            if (groupMapping[c.group]) {
              return { ...c, group: groupMapping[c.group] };
            }
            return c;
          });
          setCategoriesList(mappedCats);
        } else {
          // Fallback to static
          const savedCats = localStorage.getItem("categories_data");
          let loadedCats = categories;
          if (savedCats) {
            try { loadedCats = JSON.parse(savedCats); } catch { loadedCats = categories; }
          }
          const mappedCats = loadedCats.map((c: any) => {
            if (groupMapping[c.group]) {
              return { ...c, group: groupMapping[c.group] };
            }
            return c;
          });
          setCategoriesList(mappedCats);
        }

        if (prodRes && prodRes.success && prodRes.products) {
          setProductsList(prodRes.products.map((p: any) => ({
            ...p,
            brand: p.brand && typeof p.brand === "object" ? p.brand.name : p.brand,
            category: p.category && typeof p.category === "object" ? p.category.slug : p.category,
          })));
        }
      } catch (e) {
        console.error("Failed to load ReliefCategory api data", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadRealData();

    const savedBlogs = localStorage.getItem("blogs_data");
    if (savedBlogs) {
      try {
        setBlogsList(JSON.parse(savedBlogs));
      } catch (e) {
        setBlogsList(initialBlogs);
      }
    } else {
      setBlogsList(initialBlogs);
    }

    const savedPages = localStorage.getItem("landing_pages_data");
    if (savedPages) {
      try {
        const pages = JSON.parse(savedPages);
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

          let metaKeywords = document.querySelector('meta[name="keywords"]');
          if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.setAttribute('name', 'keywords');
            document.head.appendChild(metaKeywords);
          }
          metaKeywords.setAttribute('content', pageData.seoKeywords || "");
        } else {
          setLandingPage(null);
        }
      } catch (e) {
        setLandingPage(null);
      }
    } else {
      setLandingPage(null);
    }
  }, [slug]);

  if (isLoading) {
    return <ReliefCategorySkeleton />;
  }

  const matchedMenuObj = menus.find((m) => m.slug === slug);

  if (!matchedMenuObj) {
    return (
      <div className="container-page py-8 text-center">
        <h1 className="text-2xl font-bold">Category not found</h1>
        <p className="mt-2 text-muted-foreground">The requested category could not be found.</p>
        <Link to="/relief" className="mt-4 inline-block text-primary hover:underline">
          Back to Relief
        </Link>
      </div>
    );
  }

  const firstSection = matchedMenuObj.sections[0];
  const subCategories = firstSection ? firstSection.items : [];

  const styleSection = matchedMenuObj.sections.find(
    (s: any) => s.title.toLowerCase() === "styles" || s.title.toLowerCase() === "style"
  );
  const availableStyles = styleSection ? styleSection.items.map((i: any) => i.name) : ["Modern", "Industrial", "Vintage", "Classic"];

  return (
    <div className="container-page py-8 animate-fade-in">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link> /{" "}
        <Link to="/relief" className="hover:text-primary transition-colors">Relief</Link> /{" "}
        <span className="text-foreground font-medium">{matchedMenuObj.menu}</span>
      </nav>

      {landingPage ? (
        <ShortcodeRenderer 
          content={
            landingPage.content || 
            (Array.isArray(landingPage.blocks) 
              ? landingPage.blocks.map((b: any) => b.description || "").filter(Boolean).join("<br/>") 
              : "")
          } 
        />
      ) : (
        <>
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-3xl bg-muted p-8 md:p-12 mb-12 border shadow-xs">
            <div className="relative z-10 max-w-3xl">
              <h1 className="text-3xl font-extrabold md:text-5xl tracking-tight text-foreground mb-4">
                {matchedMenuObj.menu}
              </h1>
              <p className="text-xl font-bold text-foreground/90 mb-4">
                Looking to buy {matchedMenuObj.menu.toLowerCase()}? Choose a category below:
              </p>
              <p className="text-muted-foreground leading-relaxed">
                With {matchedMenuObj.menu.toLowerCase()}, the possibilities are endless. There are various styles and categories. 
                It is important to choose the right lighting because it creates atmosphere in your home. In our large assortment, 
                you will find virtually every type of lamp. Select the category you are looking for below.
              </p>
            </div>
            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
          </div>

          {/* Subcategories Grid */}
          <div className="mb-16">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                    <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4 mx-auto mt-2" />
                  </div>
                ))}
              </div>
            ) : (
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
                          <img
                            src={resolveImgUrl(imgUrl)}
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
            )}
          </div>

          {/* Styles Sections */}
          <div className="space-y-16">
            <div className="border-b pb-4">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Popular styles of {matchedMenuObj.menu.toLowerCase()}
              </h2>
              <p className="mt-2 text-muted-foreground">
                Curious about the different styles of {matchedMenuObj.menu.toLowerCase()}? Below, we have listed a selection of the most popular styles for you. Click on any subcategory under a style to view our curated selection.
              </p>
            </div>

            {availableStyles.map((styleName: string) => {
              const styleDesc = styleDescriptions[styleName] || `Explore our beautiful selection of ${styleName.toLowerCase()} styled lighting options, crafted to enhance your home's aesthetic.`;
              return (
                <div key={styleName} className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">
                      {styleName} {matchedMenuObj.menu.toLowerCase()}
                    </h3>
                    <p className="mt-2 text-muted-foreground max-w-3xl leading-relaxed text-sm">
                      {styleDesc}
                    </p>
                  </div>

                  {/* Subcategories filtered by style */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {subCategories.slice(0, 5).map((item: any) => {
                      const imgUrl = getCategoryImage(item.slug);
                      const resolved = resolveCategorySlug(item.slug);
                      return (
                        <Link
                          key={item.slug}
                          to={`/category/${resolved}?style=${styleName}`}
                          className="group relative flex flex-col overflow-hidden rounded-2xl bg-card border shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/30"
                        >
                          <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                            {imgUrl ? (
                              <img
                                src={resolveImgUrl(imgUrl)}
                                alt={`${styleName} ${item.name}`}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground bg-muted" />
                            )}
                          </div>
                          <div className="w-full bg-background py-3 px-4 text-center border-t">
                            <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {styleName} {item.name.toLowerCase()}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
