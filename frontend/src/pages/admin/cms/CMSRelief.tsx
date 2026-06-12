import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { cmsReliefRepository } from "@/client/apiClient";
import { getClientBaseUrl } from "@/utils/siteUrl";
import { SectionLoader } from "@/components/ui/PageLoader";

interface ReliefPageData {
  title?: string;
  subtitle?: string;
  description?: string;
  sections?: any[];
  content?: string;
}

const DEFAULT_CONTENT = `[text-hero title="Relief" subtitle="Buying lighting? Choose a category"][/text-hero]
<p>We are spending more and more time at home. Many people also still work from home, so you want your home to feel comfortable. A pleasant living environment inspires, energizes, and provides peace! Therefore, pay more attention to lighting. Make the interior even cozier by bringing new lamps into your home. Not just a large lamp above the dining table and one above the seating area, but also a desk lamp on the cabinet, a floor lamp next to the sofa, and a few candles on the coffee table.</p><br/>
[menu-category menu_slug="interior-lighting"][/menu-category]
<p>With interior lighting, the possibilities are endless. There are various styles and categories. It is important to choose the right lighting because it creates atmosphere in your home.</p><br/>
[menu-category menu_slug="outdoor-lighting"][/menu-category]
<p>Illuminate your garden, patio, or driveway with our high-quality outdoor lighting options designed to withstand all weather conditions.</p><br/>
[menu-category menu_slug="light-sources"][/menu-category]
<p>Find the perfect bulb with the right fitting, temperature, and brightness for your home lights.</p>`;

export default function CMSRelief() {
  const [pageContent, setPageContent] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPageContent = async () => {
      try {
        const response = await cmsReliefRepository.get();
        if (response && response.success && response.data) {
          const parsed = response.data;
          if (parsed.content) {
            setPageContent(parsed.content);
          } else {
            // Migration from legacy structure if still in DB
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
        } else {
          setPageContent(DEFAULT_CONTENT);
        }
      } catch (e) {
        console.error("Error loading relief page data", e);
        setPageContent(DEFAULT_CONTENT);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPageContent();
  }, []);

  const handleSave = async () => {
    try {
      const payload: ReliefPageData = {
        content: pageContent
      };
      await cmsReliefRepository.update(payload);
      toast.success("Relief Page content saved successfully!");
    } catch (e) {
      console.error("Failed to save", e);
      toast.error("Failed to save relief page content.");
    }
  };

  if (isLoading) {
    return <SectionLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relief Page Builder</h1>
          <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2 xl:gap-3 mt-1">
            <p className="text-muted-foreground">Design your Relief landing page using the rich text composer and custom layout blocks.</p>
            <a href={`${getClientBaseUrl()}/relief`} target="_blank" rel="noreferrer" className="text-xs bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary px-2 py-1 rounded-md transition-colors border flex items-center gap-1 w-fit">
              Live URL: {getClientBaseUrl()}/relief
            </a>
          </div>
        </div>
        <Button onClick={handleSave} className="gap-2 shadow-xs transition-all duration-200 shrink-0">
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-xs">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">Page Content</h2>
          <RichTextEditor 
            value={pageContent} 
            onChange={setPageContent} 
            placeholder="Type your content here or use the [+] menu to insert UI blocks..."
          />
        </div>
      </div>
    </div>
  );
}
