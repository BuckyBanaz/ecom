import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { categories } from "@/data/categories";
import { megaMenuData } from "@/data/megaMenu";
import { ProductCard } from "@/components/shop/ProductCard";
import { products } from "@/data/products";
import { initialBlogs } from "@/data/blogs";
import { faqs } from "@/data/faqs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  const matched = categories.find(c => c.slug === resolved);
  return matched ? matched.image : "";
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
  const [activeBlog, setActiveBlog] = useState<any | null>(null);

  useEffect(() => {
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

    const savedCats = localStorage.getItem("categories_data");
    let loadedCats = categories;
    if (savedCats) {
      try {
        loadedCats = JSON.parse(savedCats);
      } catch (e) {
        loadedCats = categories;
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
        <div className="space-y-12">
          {landingPage.blocks.map((block: any, idx: number) => {
            if (block.type === "text") {
              return (
                <div key={idx} className="prose max-w-none dark:prose-invert">
                  {block.title && <h2 className="text-2xl font-bold mb-4">{block.title}</h2>}
                  <div dangerouslySetInnerHTML={{ __html: block.description }} className="text-muted-foreground leading-relaxed" />
                </div>
              );
            }
            if (block.type === "products") {
              const targetCategory = block.categorySlug;
              const isDeals = targetCategory === "deals";
              let list = isDeals ? products.filter((p) => p.oldPrice) : products.filter((p) => p.category === targetCategory);
              if (list.length === 0 && !isDeals) list = products;

              return (
                <div key={idx} className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h2 className="text-2xl font-bold text-foreground">
                      {categories.find(c => c.slug === targetCategory)?.name || "Featured Products"}
                    </h2>
                    <span className="text-sm text-muted-foreground font-medium">{list.length} products</span>
                  </div>
                  {block.description && (
                    <div 
                      dangerouslySetInnerHTML={{ __html: block.description }} 
                      className="text-muted-foreground leading-relaxed prose max-w-none text-sm dark:prose-invert"
                    />
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {list.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </div>
              );
            }
            if (block.type === "component") {
              const heading = block.title || "";
              
              if (block.componentType === "categories") {
                const menuSlug = matchedMenuObj.slug;
                const selectedCats = (block.selectedItems && block.selectedItems.length > 0)
                  ? categoriesList.filter(c => block.selectedItems.includes(c.slug))
                  : categoriesList.filter(c => c.group === menuSlug);

                return (
                  <div key={idx} className="space-y-6">
                    {heading && (
                      <div className="border-b pb-3">
                        <h2 className="text-2xl font-bold text-foreground">{heading}</h2>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      {selectedCats.map((c) => {
                        const count = products.filter(p => p.category === c.slug).length;
                        return (
                          <Link
                            key={c.slug}
                            to={`/category/${c.slug}`}
                            className="group relative flex flex-col overflow-hidden rounded-2xl bg-card border shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/30"
                          >
                            <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                              {c.image ? (
                                <img
                                  src={c.image}
                                  alt={c.name}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground font-bold text-sm bg-muted">
                                  {c.name}
                                </div>
                              )}
                            </div>
                            <div className="w-full bg-background py-3 px-4 text-center border-t flex flex-col items-center">
                              <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                {c.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">{count} products</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (block.componentType === "blogs") {
                const selectedBlogs = (block.selectedItems && block.selectedItems.length > 0)
                  ? blogsList.filter(b => block.selectedItems.includes(b.slug) && b.published)
                  : blogsList.filter(b => b.published);

                return (
                  <div key={idx} className="space-y-6">
                    {heading && (
                      <div className="border-b pb-3">
                        <h2 className="text-2xl font-bold text-foreground">{heading}</h2>
                      </div>
                    )}
                    {selectedBlogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No articles to show.</p>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {selectedBlogs.map((b) => (
                          <div
                            key={b.id}
                            onClick={() => setActiveBlog(b)}
                            className="group rounded-2xl border bg-card overflow-hidden shadow-xs hover:shadow-md hover:border-primary/20 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                          >
                            <div>
                              <div className="aspect-video w-full overflow-hidden bg-muted relative">
                                {b.cover ? (
                                  <img
                                    src={b.cover}
                                    alt={b.title}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-muted-foreground text-xs font-semibold">
                                    No cover image
                                  </div>
                                )}
                              </div>
                              <div className="p-5 space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>By {b.author || "Guest"}</span>
                                  <span>{b.date}</span>
                                </div>
                                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                  {b.title}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                  {b.excerpt}
                                </p>
                              </div>
                            </div>
                            <div className="p-5 pt-0">
                              <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:underline">
                                Read Article &rarr;
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              if (block.componentType === "faq") {
                const selectedFaqs = (block.selectedItems && block.selectedItems.length > 0)
                  ? faqs.filter(f => block.selectedItems.includes(f.q))
                  : faqs;

                return (
                  <div key={idx} className="space-y-6">
                    {heading && (
                      <div className="border-b pb-3">
                        <h2 className="text-2xl font-bold text-foreground">{heading}</h2>
                      </div>
                    )}
                    <Accordion type="single" collapsible className="w-full border rounded-2xl bg-card p-4 shadow-xs">
                      {selectedFaqs.map((f, i) => (
                        <AccordionItem key={i} value={`faq-${i}`} className={i === selectedFaqs.length - 1 ? "border-b-0" : ""}>
                          <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline hover:text-primary transition-colors py-4">
                            {f.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground leading-relaxed text-sm pb-4">
                            {f.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                );
              }
            }
            return null;
          })}
        </div>
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
                          src={imgUrl}
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
                                src={imgUrl}
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
      {/* Blog Details Modal */}
      <Dialog open={!!activeBlog} onOpenChange={(open) => !open && setActiveBlog(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border p-0 shadow-lg bg-card">
          {activeBlog && (
            <div>
              <div className="aspect-video w-full overflow-hidden bg-muted relative">
                {activeBlog.cover ? (
                  <img src={activeBlog.cover} alt={activeBlog.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm font-semibold">No cover image</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <span className="bg-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                    Article
                  </span>
                  <h2 className="text-xl md:text-3xl font-extrabold mt-3 tracking-tight">
                    {activeBlog.title}
                  </h2>
                </div>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">By {activeBlog.author || "Guest"}</span>
                  </div>
                  <span>Published on {activeBlog.date}</span>
                </div>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-lg text-foreground/90 font-medium italic border-l-4 border-primary pl-4 py-1 bg-muted/30 rounded-r-md">
                    {activeBlog.excerpt}
                  </p>
                  <div className="text-muted-foreground leading-relaxed whitespace-pre-line mt-6 text-sm md:text-base">
                    {activeBlog.body}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
