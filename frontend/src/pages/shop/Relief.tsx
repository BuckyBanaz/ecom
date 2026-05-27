import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShortcodeRenderer } from "@/components/cms/ShortcodeRenderer";
import { cmsReliefRepository, productRepository, categoryRepository, blogRepository } from "@/client/apiClient";
import { ReliefSkeleton } from "@/components/ui/SkeletonLoader";

export default function Relief() {
  const [pageContent, setPageContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [prefetchedData, setPrefetchedData] = useState<{products?: any[], categories?: any[], blogs?: any[]}>({});

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const [response, prodRes, catRes, blogRes] = await Promise.all([
          cmsReliefRepository.get(),
          productRepository.getAll({ limit: 40 }),
          categoryRepository.getAll(),
          blogRepository.getAll({ published: true }).catch(() => ({ success: false }))
        ]);

        if (response && response.success && response.data) {
          const parsed = response.data;
          if (parsed.content) {
            setPageContent(parsed.content);
          } else {
            // Migration from legacy structure
            let newContent = `[text-hero title="${(parsed.title || "Relief").replace(/"/g, '&quot;')}" subtitle="${(parsed.subtitle || "Buying lighting? Choose a category").replace(/"/g, '&quot;')}"][/text-hero]\n`;
            newContent += `${parsed.description || ""}<br/>\n`;
            
            if (parsed.sections && Array.isArray(parsed.sections)) {
              for (const sec of parsed.sections) {
                newContent += `[menu-category menu_slug="${sec.menuSlug || ""}"][/menu-category]\n`;
                newContent += `${sec.description || ""}<br/>\n`;
              }
            }
            setPageContent(newContent);
          }
        }

        const pd: any = {};
        if (prodRes.success && prodRes.products) pd.products = prodRes.products;
        if (catRes.success && catRes.categories) pd.categories = catRes.categories;
        if (blogRes.success && blogRes.blogs) pd.blogs = blogRes.blogs;
        setPrefetchedData(pd);

      } catch (e) {
        console.error("Error loading relief_page_data from API", e);
        // Fallback to default
        const DEFAULT_CONTENT = `[text-hero title="Relief" subtitle="Buying lighting? Choose a category"][/text-hero]
<p>We are spending more and more time at home. Many people also still work from home, so you want your home to feel comfortable. A pleasant living environment inspires, energizes, and provides peace! Therefore, pay more attention to lighting. Make the interior even cozier by bringing new lamps into your home. Not just a large lamp above the dining table and one above the seating area, but also a desk lamp on the cabinet, a floor lamp next to the sofa, and a few candles on the coffee table.</p><br/>
[menu-category menu_slug="interior-lighting"][/menu-category]
<p>With interior lighting, the possibilities are endless. There are various styles and categories. It is important to choose the right lighting because it creates atmosphere in your home.</p><br/>
[menu-category menu_slug="outdoor-lighting"][/menu-category]
<p>Illuminate your garden, patio, or driveway with our high-quality outdoor lighting options designed to withstand all weather conditions.</p><br/>
[menu-category menu_slug="light-sources"][/menu-category]
<p>Find the perfect bulb with the right fitting, temperature, and brightness for your home lights.</p>`;
        setPageContent(DEFAULT_CONTENT);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, []);

  if (isLoading) {
    return <ReliefSkeleton />;
  }

  return (
    <div className="container-page py-8 animate-fade-in">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link> /{" "}
        <span className="text-foreground font-medium">Relief</span>
      </nav>

      {/* Render Dynamic Content */}
      <ShortcodeRenderer content={pageContent} prefetchedData={prefetchedData} />
    </div>
  );
}
