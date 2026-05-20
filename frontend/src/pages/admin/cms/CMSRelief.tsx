import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Save, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { megaMenuData } from "@/data/megaMenu";

interface ReliefSection {
  menuSlug: string;
  description: string;
}

interface ReliefPageData {
  title: string;
  subtitle: string;
  description: string;
  sections: ReliefSection[];
}

const DEFAULT_PAGE_DATA: ReliefPageData = {
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
};

export default function CMSRelief() {
  const [pageData, setPageData] = useState<ReliefPageData>(DEFAULT_PAGE_DATA);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("relief_page_data");
    if (saved) {
      try {
        setPageData(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading relief page data", e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("relief_page_data", JSON.stringify(pageData));
    toast.success("Relief Page content saved successfully!");
  };

  const addSection = () => {
    const newSection: ReliefSection = {
      menuSlug: megaMenuData[0]?.slug || "interior-lighting",
      description: "<p>New category section description...</p>"
    };
    setPageData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    toast.success("New section added! Don't forget to save changes.");
  };

  const removeSection = (index: number) => {
    setPageData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, idx) => idx !== index)
    }));
    toast.info("Section removed.");
  };

  const updateSection = (index: number, key: keyof ReliefSection, value: string) => {
    setPageData(prev => ({
      ...prev,
      sections: prev.sections.map((section, idx) => {
        if (idx === index) {
          return { ...section, [key]: value };
        }
        return section;
      })
    }));
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === pageData.sections.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newSections = [...pageData.sections];
    
    // Swap
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    setPageData(prev => ({
      ...prev,
      sections: newSections
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relief Page CMS</h1>
          <p className="text-muted-foreground">Customize layout, hero descriptions, and active category sections shown on the /relief page.</p>
        </div>
        <Button onClick={handleSave} className="gap-2 shadow-xs transition-all duration-200">
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </div>

      {/* Hero Section Card */}
      <Card className="border bg-card/50 backdrop-blur-xs">
        <CardHeader>
          <CardTitle>Page Hero Content</CardTitle>
          <CardDescription>Configure the main headline and introduction description at the top of the /relief page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="page-title">Page Title</Label>
              <Input 
                id="page-title" 
                value={pageData.title} 
                onChange={(e) => setPageData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Relief"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-subtitle">Page Subtitle</Label>
              <Input 
                id="page-subtitle" 
                value={pageData.subtitle} 
                onChange={(e) => setPageData(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Buying lighting? Choose a category"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <RichTextEditor
              label="Page Main Description"
              value={pageData.description}
              onChange={(val) => setPageData(prev => ({ ...prev, description: val }))}
              placeholder="Enter main rich text description for the Relief page here..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Sections Management Card */}
      <Card className="border bg-card/50 backdrop-blur-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Category Sections</CardTitle>
            <CardDescription>Select which category groups should be displayed on the page, with customized descriptions.</CardDescription>
          </div>
          <Button onClick={addSection} size="sm" variant="outline" className="gap-1 shadow-2xs hover:bg-primary/5 hover:text-primary hover:border-primary/30">
            <Plus className="h-4 w-4" /> Add Section
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {pageData.sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl bg-muted/20 text-muted-foreground text-center">
              <p className="font-semibold text-sm mb-1">No category sections added</p>
              <p className="text-xs mb-4">Add a category section below to showcase it on the /relief page.</p>
              <Button onClick={addSection} size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Add First Section
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {pageData.sections.map((section, index) => (
                <div 
                  key={index} 
                  className="group relative flex flex-col p-5 border rounded-xl bg-background/50 hover:bg-background/80 hover:border-primary/20 hover:shadow-xs transition-all duration-300 gap-4"
                >
                  {/* Top bar with selector and controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-[250px]">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <Select 
                          value={section.menuSlug}
                          onValueChange={(val) => updateSection(index, "menuSlug", val)}
                        >
                          <SelectTrigger className="w-[200px] h-9">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {megaMenuData.map((menu) => (
                              <SelectItem key={menu.slug} value={menu.slug}>
                                {menu.menu}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-muted-foreground hover:bg-muted"
                        disabled={index === 0}
                        onClick={() => moveSection(index, "up")}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-muted-foreground hover:bg-muted"
                        disabled={index === pageData.sections.length - 1}
                        onClick={() => moveSection(index, "down")}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeSection(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Section Description Textarea */}
                  <div>
                    <RichTextEditor
                      label="Section Custom Description"
                      value={section.description}
                      onChange={(val) => updateSection(index, "description", val)}
                      placeholder="Write a custom description explaining what styles or products are in this category..."
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
