import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { categories } from "@/data/categories";
import { megaMenuData } from "@/data/megaMenu";

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

export default function Relief() {
  const [menus, setMenus] = useState<any[]>([]);
  const [pageData, setPageData] = useState<any>({
    title: "Relief",
    subtitle: "Buying lighting? Choose a category",
    description: `<p>We are spending more and more time at home. Many people also still work from home, so you want your home to feel comfortable. A pleasant living environment inspires, energizes, and provides peace! Therefore, pay more attention to lighting. Make the interior even cozier by bringing new lamps into your home. Not just a large lamp above the dining table and one above the seating area, but also a desk lamp on the cabinet, a floor lamp next to the sofa, and a few candles on the coffee table.</p>`,
    sections: [
      {
        menuSlug: "interior-lighting",
        description: `<p>With interior lighting, the possibilities are endless. There are various styles and categories. It is important to choose the right lighting because it creates atmosphere in your home.</p>`
      },
      {
        menuSlug: "outdoor-lighting",
        description: `<p>Illuminate your garden, patio, or driveway with our high-quality outdoor lighting options designed to withstand all weather conditions.</p>`
      },
      {
        menuSlug: "light-sources",
        description: `<p>Find the perfect bulb with the right fitting, temperature, and brightness for your home lights.</p>`
      }
    ]
  });

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

    const savedPage = localStorage.getItem("relief_page_data");
    if (savedPage) {
      try {
        setPageData(JSON.parse(savedPage));
      } catch (e) {
        console.error("Error loading relief_page_data", e);
      }
    }
  }, []);

  return (
    <div className="container-page py-8 animate-fade-in">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link> /{" "}
        <span className="text-foreground font-medium">Relief</span>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-muted p-8 md:p-12 mb-12 border shadow-xs">
        <div className="relative z-10 max-w-4xl">
          <h1 className="text-3xl font-extrabold md:text-5xl tracking-tight text-foreground mb-4">
            {pageData.title}
          </h1>
          <p className="text-2xl font-bold text-foreground/90 mb-4">
            {pageData.subtitle}
          </p>
          <div 
            className="text-muted-foreground leading-relaxed prose max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: pageData.description }}
          />
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
      </div>

      {/* Sections for each custom selected menu */}
      <div className="space-y-16">
        {pageData.sections.map((sec: any) => {
          const menuObj = menus.find(m => m.slug === sec.menuSlug);
          if (!menuObj) return null;

          const firstSection = menuObj.sections[0];
          const subCategories = firstSection ? firstSection.items : [];

          return (
            <div key={sec.menuSlug} className="space-y-6">
              <div className="flex flex-col border-b pb-3 gap-2">
                <Link 
                  to={`/relief/${menuObj.slug}`}
                  className="text-2xl font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  {menuObj.menu}
                  <span className="text-xs font-normal text-muted-foreground hover:underline">(View styles & all options)</span>
                </Link>
                {sec.description && (
                  <div 
                    className="text-muted-foreground text-sm leading-relaxed prose max-w-4xl dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sec.description }}
                  />
                )}
              </div>

              {/* Category Grid */}
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
          );
        })}
      </div>
    </div>
  );
}
