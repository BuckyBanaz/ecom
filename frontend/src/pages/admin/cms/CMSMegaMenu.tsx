import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, RotateCcw, Save, FolderPlus, ListPlus, ChevronLeft, FileText, Globe, Sparkles, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MegaMenu, MegaMenuSection, MegaMenuItem } from "@/data/megaMenu";
import { useAdmin } from "@/context/AdminContext";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { initialBlogs } from "@/data/blogs";
import { faqs as defaultFaqs } from "@/data/faqs";
import { megaMenuRepository, categoryRepository, productRepository } from "@/client/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaLibraryDialog } from "@/components/admin/media/MediaLibraryDialog";
import { normalizeUploadedUrl, resolveImgUrl } from "@/utils/image";
import { getClientBaseUrl } from "@/utils/siteUrl";

type MegaMenuWithId = MegaMenu & { id?: string };

export default function CMSMegaMenu() {
  const { t } = useTranslation();
  const { hasPermission } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const [menus, setMenus] = useState<MegaMenuWithId[]>([]);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState<number>(0);

  // Landing Page Builder States
  const [activePageBuilder, setActivePageBuilder] = useState<{
    slug: string;
    name: string;
    type: "menu" | "item";
  } | null>(null);
  
  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [pageContent, setPageContent] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoImage, setSeoImage] = useState("");
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [blogsList, setBlogsList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);

  // Dialog states
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [menuEditIndex, setMenuEditIndex] = useState<number | null>(null);
  const [menuName, setMenuName] = useState("");
  const [menuSlug, setMenuSlug] = useState("");

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [sectionEditIndex, setSectionEditIndex] = useState<number | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemEditSectionIndex, setItemEditSectionIndex] = useState<number | null>(null);
  const [itemEditIndex, setItemEditIndex] = useState<number | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemSlug, setItemSlug] = useState("");
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Load from backend API
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      let categoriesResponse: any = null;
      try {
        // 1. Fetch mega menus
        try {
          const menuRes = await megaMenuRepository.getAll();
          if (menuRes.success && menuRes.menus) {
            setMenus(menuRes.menus);
          } else {
            setMenus([]);
          }
          if (menuRes.landingPages) {
            localStorage.setItem("landing_pages_data", JSON.stringify(menuRes.landingPages));
          }
        } catch (e) {
          console.error("Failed to load menus from API:", e);
          setMenus([]);
        }

        // 2. Fetch categories
        try {
          categoriesResponse = await categoryRepository.getAll();
          if (categoriesResponse.success && categoriesResponse.categories) {
            setCategoriesList(categoriesResponse.categories);
          } else {
            setCategoriesList([]);
          }
        } catch (e) {
          console.error("Failed to load categories from API:", e);
          setCategoriesList([]);
        }

        // 3. Fetch products
        try {
          const prodRes = await productRepository.getAll();
          if (prodRes.success && prodRes.products) {
            const categoriesById = new Map(
              (categoriesResponse?.categories || []).map((c: any) => [c.id, c.slug])
            );
            setProductsList(
              prodRes.products.map((p: any) => {
                const categorySlug =
                  (p.category && typeof p.category === "object" && p.category.slug) ||
                  p.category ||
                  (p.categoryId ? categoriesById.get(p.categoryId) : "") ||
                  "";
                return {
                  ...p,
                  categorySlug,
                };
              })
            );
          } else {
            setProductsList([]);
          }
        } catch (e) {
          console.error("Failed to load products from API:", e);
          setProductsList([]);
        }
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  // Restore page builder state from URL — wait until menus are loaded
  useEffect(() => {
    if (isLoading) return; // wait for menus to load first
    const editId = searchParams.get("id");
    const editType = searchParams.get("type") as "menu" | "item";
    const editName = searchParams.get("name");
    
    if (editId && editType && editName && !activePageBuilder) {
      handleOpenPageBuilder(editId, editName, editType, false);
    }
  }, [searchParams, isLoading]);

  const handleOpenPageBuilder = (slug: string, name: string, type: "menu" | "item", updateUrl = true) => {
    setActivePageBuilder({ slug, name, type });
    setPageSlug(slug);
    
    if (updateUrl) {
      setSearchParams({ id: slug, type, name });
    }
    
    // Load blogs dynamically
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

    // Load existing page config
    const savedPages = localStorage.getItem("landing_pages_data");
    if (savedPages) {
      try {
        const pages = JSON.parse(savedPages);
        if (pages[slug]) {
          const p = pages[slug];
          setPageTitle(p.title || name);
          
          let migratedContent = p.content || "";
          if (!migratedContent && p.blocks && Array.isArray(p.blocks)) {
            // Attempt a best-effort migration of old descriptions
            migratedContent = p.blocks.map((b: any) => b.description || "").filter(Boolean).join("<br/>");
          }
          setPageContent(migratedContent);

          setSeoTitle(p.seoTitle || name);
          setSeoDescription(p.seoDescription || "");
          setSeoKeywords(p.seoKeywords || "");
          setSeoImage(p.seoImage || "");
          return;
        }
      } catch (e) {}
    }
    
    // Default values
    setPageTitle(name);
    setPageContent(`<h2>Discover Our Premium Selection of ${name}</h2><p>Upgrade your space with modern styles, custom designs, and premium quality crafted for your lifestyle.</p>`);
    setSeoTitle(`${name} | Buy Premium Lighting Online`);
    setSeoDescription(`Shop our selection of premium ${name}. Free shipping on orders over $50, fast delivery, and modern designs.`);
    setSeoKeywords(`lighting, ${name.toLowerCase()}, modern decor, lights`);
    setSeoImage("");
  };

  const handleSavePageBuilder = () => {
    if (!pageTitle.trim() || !pageSlug.trim()) {
      toast.error("Please provide page title and slug");
      return;
    }

    const savedPages = localStorage.getItem("landing_pages_data");
    let pages: any = {};
    if (savedPages) {
      try {
        pages = JSON.parse(savedPages);
      } catch (e) {}
    }

    // If slug was changed, delete old key and update Mega Menu configuration
    if (activePageBuilder && activePageBuilder.slug !== pageSlug) {
      delete pages[activePageBuilder.slug];
      
      const updatedMenus = menus.map((m) => {
        if (activePageBuilder.type === "menu" && m.slug === activePageBuilder.slug) {
          return { ...m, slug: pageSlug };
        }
        return {
          ...m,
          sections: m.sections.map((s) => ({
            ...s,
            items: s.items.map((item) => {
              if (activePageBuilder.type === "item" && item.slug === activePageBuilder.slug) {
                return { ...item, slug: pageSlug };
              }
              return item;
            }),
          })),
        };
      });
      saveToLocalStorage(updatedMenus);
    }

    pages[pageSlug] = {
      title: pageTitle,
      content: pageContent,
      seoTitle,
      seoDescription,
      seoKeywords,
      seoImage,
    };

    localStorage.setItem("landing_pages_data", JSON.stringify(pages));
    
    // Auto-sync backend
    handleSaveAll(menus, pages);

    toast.success("Landing Page & SEO settings saved successfully!");
    setActivePageBuilder(null);
    setSearchParams({});
  };

  const saveToLocalStorage = (updatedMenus: MegaMenu[]) => {
    if (!Array.isArray(updatedMenus)) {
      console.error("Invalid menus payload for localStorage", updatedMenus);
      return;
    }
    setMenus(updatedMenus);
    localStorage.setItem("mega_menu_data", JSON.stringify(updatedMenus));
    window.dispatchEvent(new Event("megaMenuDataChanged"));
  };

  const handleSaveAll = async (menusToSave: MegaMenu[] | unknown = menus, landingPagesToSave = null) => {
    const normalizedMenus = Array.isArray(menusToSave) ? menusToSave : menus;
    saveToLocalStorage(normalizedMenus);
    
    // Pull the latest landing pages if not provided directly
    let pages = landingPagesToSave;
    if (!pages) {
      const savedPages = localStorage.getItem("landing_pages_data");
      if (savedPages) {
        try { pages = JSON.parse(savedPages); } catch(e) {}
      }
    }

    try {
      const data = await megaMenuRepository.sync({
        menus: normalizedMenus,
        landingPages: pages || {}
      });
      if (data?.menus) {
        setMenus(data.menus);
        localStorage.setItem("mega_menu_data", JSON.stringify(data.menus));
      }
      if (data?.landingPages) {
        localStorage.setItem("landing_pages_data", JSON.stringify(data.landingPages));
      }
      toast.success("Mega Menu configuration successfully synced to backend!");
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync configuration with database.");
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset the mega menu to defaults?")) {
      handleSaveAll([]);
      setSelectedMenuIndex(0);
      toast.success("Reset to default configuration");
    }
  };

  // --- Menu CRUD ---
  const openMenuDialog = (index: number | null = null) => {
    if (index !== null) {
      setMenuEditIndex(index);
      setMenuName(menus[index].menu);
      setMenuSlug(menus[index].slug);
    } else {
      setMenuEditIndex(null);
      setMenuName("");
      setMenuSlug("");
    }
    setMenuDialogOpen(true);
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuName.trim() || !menuSlug.trim()) return;

    const updated = [...menus];
    if (menuEditIndex !== null) {
      updated[menuEditIndex] = {
        ...updated[menuEditIndex],
        menu: menuName,
        slug: menuSlug,
      };
      toast.success("Menu updated");
    } else {
      updated.push({
        menu: menuName,
        slug: menuSlug,
        sections: [],
      });
      toast.success("New menu created");
    }
    saveToLocalStorage(updated);
    setMenuDialogOpen(false);
  };

  const handleDeleteMenu = async (index: number) => {
    if (!window.confirm(`Delete entire menu "${menus[index].menu}"?`)) return;
    const updated = menus.filter((_, i) => i !== index);
    saveToLocalStorage(updated);
    setSelectedMenuIndex(0);
    toast.success("Menu deleted");
  };

  const moveMenu = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= menus.length) return;

    const updated = [...menus];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    saveToLocalStorage(updated);
    setSelectedMenuIndex(targetIndex);
  };

  // --- Section CRUD ---
  const openSectionDialog = (index: number | null = null) => {
    if (index !== null) {
      setSectionEditIndex(index);
      setSectionTitle(menus[selectedMenuIndex].sections[index].title);
    } else {
      setSectionEditIndex(null);
      setSectionTitle("");
    }
    setSectionDialogOpen(true);
  };

  const handleSaveSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionTitle.trim()) return;

    const updated = [...menus];
    const currentMenu = updated[selectedMenuIndex];

    if (sectionEditIndex !== null) {
      currentMenu.sections[sectionEditIndex] = {
        ...currentMenu.sections[sectionEditIndex],
        title: sectionTitle,
      };
      toast.success("Section updated");
    } else {
      currentMenu.sections.push({
        title: sectionTitle,
        items: [],
      });
      toast.success("New section added");
    }

    saveToLocalStorage(updated);
    setSectionDialogOpen(false);
  };

  const handleDeleteSection = (sectionIndex: number) => {
    if (window.confirm(`Delete section "${menus[selectedMenuIndex].sections[sectionIndex].title}"?`)) {
      const updated = [...menus];
      updated[selectedMenuIndex].sections = updated[selectedMenuIndex].sections.filter((_, i) => i !== sectionIndex);
      saveToLocalStorage(updated);
      toast.success("Section deleted");
    }
  };

  const moveSection = (sectionIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? sectionIndex - 1 : sectionIndex + 1;
    const sections = menus[selectedMenuIndex].sections;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const updated = [...menus];
    const temp = updated[selectedMenuIndex].sections[sectionIndex];
    updated[selectedMenuIndex].sections[sectionIndex] = updated[selectedMenuIndex].sections[targetIndex];
    updated[selectedMenuIndex].sections[targetIndex] = temp;

    saveToLocalStorage(updated);
  };

  // --- Item CRUD ---
  const openItemDialog = (sectionIndex: number, itemIndex: number | null = null) => {
    setItemEditSectionIndex(sectionIndex);
    if (itemIndex !== null) {
      setItemEditIndex(itemIndex);
      const item = menus[selectedMenuIndex].sections[sectionIndex].items[itemIndex];
      setItemName(item.name);
      setItemSlug(item.slug);
    } else {
      setItemEditIndex(null);
      setItemName("");
      setItemSlug("");
    }
    setItemDialogOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemSlug.trim() || itemEditSectionIndex === null) return;

    const updated = [...menus];
    const currentSection = updated[selectedMenuIndex].sections[itemEditSectionIndex];

    if (itemEditIndex !== null) {
      currentSection.items[itemEditIndex] = {
        name: itemName,
        slug: itemSlug,
      };
      toast.success("Item updated");
    } else {
      currentSection.items.push({
        name: itemName,
        slug: itemSlug,
      });
      toast.success("Item added");
    }

    saveToLocalStorage(updated);
    setItemDialogOpen(false);
  };

  const handleDeleteItem = (sectionIndex: number, itemIndex: number) => {
    if (window.confirm("Delete this link?")) {
      const updated = [...menus];
      updated[selectedMenuIndex].sections[sectionIndex].items = updated[selectedMenuIndex].sections[sectionIndex].items.filter((_, i) => i !== itemIndex);
      saveToLocalStorage(updated);
      toast.success("Link deleted");
    }
  };

  const moveItem = (sectionIndex: number, itemIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? itemIndex - 1 : itemIndex + 1;
    const items = menus[selectedMenuIndex].sections[sectionIndex].items;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const updated = [...menus];
    const temp = updated[selectedMenuIndex].sections[sectionIndex].items[itemIndex];
    updated[selectedMenuIndex].sections[sectionIndex].items[itemIndex] = updated[selectedMenuIndex].sections[sectionIndex].items[targetIndex];
    updated[selectedMenuIndex].sections[sectionIndex].items[targetIndex] = temp;

    saveToLocalStorage(updated);
  };

  useEffect(() => {
    if (menus.length === 0) return;
    if (selectedMenuIndex < 0 || selectedMenuIndex >= menus.length) {
      setSelectedMenuIndex(0);
    }
  }, [menus, selectedMenuIndex]);

  const currentMenu = menus[selectedMenuIndex];

  if (activePageBuilder) {
    return (
      <div className="space-y-6 pb-12">
        {/* Page Builder Header */}
        <div className="flex items-center gap-4 border-b pb-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => {
              setActivePageBuilder(null);
              setSearchParams({});
            }} 
            className="rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              <span>Page Builder: {activePageBuilder.name}</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Compose custom page sections, map product catalogs, and handle Google SEO mapping for <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{activePageBuilder.type === "menu" ? "/relief/" : "/category/"}{pageSlug}</code>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Sections Builder */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle>Page Configuration</CardTitle>
                  <CardDescription>Configure primary name and URL slug details.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="page-title">Page Title</Label>
                  <Input
                    id="page-title"
                    value={pageTitle}
                    onChange={(e) => setPageTitle(e.target.value)}
                    placeholder="Enter main page heading..."
                    className="text-lg font-semibold"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="page-slug">Route Slug / URL Handle</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm shrink-0 bg-muted px-3 py-2 rounded-l-md border border-r-0">
                      {activePageBuilder.type === "menu" ? "/relief/" : "/category/"}
                    </span>
                    <Input
                      id="page-slug"
                      value={pageSlug}
                      onChange={(e) => setPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""))}
                      className="rounded-l-none"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Changing the URL handle will automatically redirect all mega menu links pointing here.</p>
                </div>
              </CardContent>
            </Card>

            {/* Block Composer List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>Landing Page Content (HTML)</span>
                </h3>
              </div>
              
              <Card className="border bg-card shadow-xs relative overflow-hidden group/block">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40" />
                <CardContent className="p-0 border-0">
                  <RichTextEditor
                    label=""
                    value={pageContent}
                    onChange={setPageContent}
                    placeholder="Write page content and insert dynamic shortcode components..."
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column: SEO & Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <span>SEO Search Listing</span>
                </CardTitle>
                <CardDescription>Optimize how your category landing page appears in search engines like Google.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Google Preview */}
                <div className="space-y-2">
                  <Label>Google Search Preview</Label>
                  <div className="border rounded-xl p-4 bg-muted/20 space-y-1 text-left shadow-xs">
                    <div className="text-[11px] text-muted-foreground truncate">
                      {getClientBaseUrl()}{activePageBuilder.type === "menu" ? "/relief/" : "/category/"}{pageSlug}
                    </div>
                    <div className="text-blue-600 dark:text-blue-400 font-medium text-base hover:underline cursor-pointer truncate">
                      {seoTitle || pageTitle || "Page Title"}
                    </div>
                    <div className="text-[12px] text-foreground/80 line-clamp-2 leading-relaxed">
                      {seoDescription || "Provide an SEO meta description below to preview how this page will rank and display in Google search results."}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="seo-title">SEO Title Tag</Label>
                    <span className={`text-[10px] ${seoTitle.length > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {seoTitle.length} / 60 chars
                    </span>
                  </div>
                  <Input
                    id="seo-title"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="Enter SEO title..."
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="seo-desc">Meta Description</Label>
                    <span className={`text-[10px] ${seoDescription.length > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {seoDescription.length} / 160 chars
                    </span>
                  </div>
                  <textarea
                    id="seo-desc"
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Enter meta description..."
                    rows={4}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="seo-keywords">SEO Meta Keywords</Label>
                  <Input
                    id="seo-keywords"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    placeholder="e.g. lighting, lamps, spring deals (comma separated)"
                  />
                </div>

                <div className="grid gap-2 mt-4 border-t pt-4">
                  <Label>SEO Meta Image (OG Image)</Label>
                  <div className="flex items-center gap-4">
                    {seoImage && (
                      <div className="relative shrink-0 border rounded overflow-hidden shadow-sm">
                        <img src={resolveImgUrl(seoImage)} alt="SEO Preview" className="h-16 w-24 object-cover" />
                        <button 
                          onClick={() => setSeoImage("")} 
                          className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                          title="Remove Image"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      </div>
                    )}
                    <Button type="button" variant="outline" onClick={() => setIsMediaLibraryOpen(true)}>
                      Browse Media Storage
                    </Button>
                  </div>
                  <MediaLibraryDialog 
                    open={isMediaLibraryOpen} 
                    onOpenChange={setIsMediaLibraryOpen} 
                    onSelect={(url) => {
                      setSeoImage(normalizeUploadedUrl(url));
                      setIsMediaLibraryOpen(false);
                    }} 
                  />
                  <p className="text-[10px] text-muted-foreground">Recommended size: 1200 x 630 pixels. Used when sharing the link on social media platforms.</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="w-full" onClick={() => setActivePageBuilder(null)}>
                Cancel
              </Button>
              <Button className="w-full gap-2" onClick={handleSavePageBuilder}>
                <Save className="h-4 w-4" /> Save Page
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mega Menu CMS</h1>
          <p className="text-muted-foreground">Manage the main desktop navigation mega menu dynamic structure.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Reset Defaults
          </Button>
          <Button onClick={() => handleSaveAll()} className="gap-2">
            <Save className="h-4 w-4" /> Save Configuration
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            {/* Left column: Menu list Skeleton */}
            <Card className="md:col-span-1">
              <CardHeader className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-3 w-32" />
              </CardHeader>
              <CardContent className="p-2 space-y-2.5">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-3 border rounded-lg">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-2.5 w-32" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Right column: Sections & Items Skeleton */}
            <div className="md:col-span-3 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, sIdx) => (
                  <Card key={sIdx} className="flex flex-col space-y-4 p-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <Skeleton className="h-4.5 w-24" />
                      <div className="flex gap-1">
                        <Skeleton className="h-6 w-6 rounded-md" />
                        <Skeleton className="h-6 w-6 rounded-md" />
                        <Skeleton className="h-6 w-6 rounded-md" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, iIdx) => (
                        <div key={iIdx} className="flex items-center justify-between">
                          <div className="space-y-1.5 flex-1 pr-4">
                            <Skeleton className="h-3.5 w-20" />
                            <Skeleton className="h-2 w-28" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Left column: Menu list */}
            <Card className="md:col-span-1">
              <CardHeader className="p-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Menus</span>
                  {hasPermission("admin") && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openMenuDialog()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>Top-level navigation tabs</CardDescription>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {menus.map((menu, idx) => (
                  <div
                    key={menu.slug}
                    onClick={() => setSelectedMenuIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm font-medium ${
                      idx === selectedMenuIndex
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold">{menu.menu}</div>
                      <div className="text-[10px] text-muted-foreground">/relief/{menu.slug}</div>
                    </div>
                    
                    {idx === selectedMenuIndex && hasPermission("admin") && (
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => moveMenu(idx, "up")} disabled={idx === 0} className="p-1 hover:text-primary disabled:opacity-30">
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button onClick={() => moveMenu(idx, "down")} disabled={idx === menus.length - 1} className="p-1 hover:text-primary disabled:opacity-30">
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleOpenPageBuilder(menu.slug, menu.menu, "menu")} className="p-1 hover:text-primary" title="Edit Custom Page & SEO">
                          <FileText className="h-3 w-3" />
                        </button>
                        <button onClick={() => openMenuDialog(idx)} className="p-1 hover:text-primary">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleDeleteMenu(idx)} className="p-1 text-destructive hover:text-destructive/80">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Right column: Sections & Items inside the selected menu */}
            <div className="md:col-span-3 space-y-6">
              {currentMenu ? (
                <>
                  {/* Sections Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <span>{currentMenu.menu}</span>
                        <span className="text-xs font-normal text-muted-foreground">(/relief/{currentMenu.slug})</span>
                      </h2>
                    </div>
                    {hasPermission("admin") && (
                      <Button size="sm" onClick={() => openSectionDialog()} className="gap-2 rounded-full">
                        <FolderPlus className="h-4 w-4" /> Add Section
                      </Button>
                    )}
                  </div>

                  {/* Sections list */}
                  {currentMenu.sections.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground text-sm">
                        No sections in this menu. Click "Add Section" to create one.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {currentMenu.sections.map((section, sIdx) => (
                        <Card key={section.title} className="relative group/section flex flex-col">
                          <CardHeader className="pb-3 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0 py-3 px-4">
                            <div className="font-bold text-sm text-foreground truncate pr-2">{section.title}</div>
                            {hasPermission("admin") && (
                              <div className="flex items-center gap-0.5">
                                <button onClick={() => moveSection(sIdx, "up")} disabled={sIdx === 0} className="p-1 text-muted-foreground hover:text-primary disabled:opacity-30">
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => moveSection(sIdx, "down")} disabled={sIdx === currentMenu.sections.length - 1} className="p-1 text-muted-foreground hover:text-primary disabled:opacity-30">
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => openSectionDialog(sIdx)} className="p-1 text-muted-foreground hover:text-primary">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleDeleteSection(sIdx)} className="p-1 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </CardHeader>
                          <CardContent className="p-4 flex-1 flex flex-col justify-between">
                            {/* Items list */}
                            <ul className="space-y-2 mb-4">
                              {section.items.length === 0 ? (
                                <li className="text-xs text-muted-foreground italic py-2 text-center">No links in this section</li>
                              ) : (
                                section.items.map((item, iIdx) => (
                                  <li key={item.slug} className="flex items-center justify-between p-1.5 rounded hover:bg-muted/50 text-xs transition-colors">
                                    <div className="truncate pr-2">
                                      <div className="font-semibold">{item.name}</div>
                                      <div className="text-[9px] text-muted-foreground truncate">/category/{item.slug}</div>
                                    </div>
                                    {hasPermission("admin") && (
                                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/section:opacity-100 transition-opacity">
                                        <button onClick={() => moveItem(sIdx, iIdx, "up")} disabled={iIdx === 0} className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30">
                                          <ArrowUp className="h-3 w-3" />
                                        </button>
                                        <button onClick={() => moveItem(sIdx, iIdx, "down")} disabled={iIdx === section.items.length - 1} className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30">
                                          <ArrowDown className="h-3 w-3" />
                                        </button>
                                        <button onClick={() => openItemDialog(sIdx, iIdx)} className="p-0.5 text-muted-foreground hover:text-primary">
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                        <button onClick={() => handleDeleteItem(sIdx, iIdx)} className="p-0.5 text-muted-foreground hover:text-destructive">
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                  </li>
                                ))
                              )}
                            </ul>

                            {hasPermission("admin") && (
                              <Button size="sm" variant="outline" className="w-full text-xs h-8 gap-1.5" onClick={() => openItemDialog(sIdx)}>
                                <ListPlus className="h-3.5 w-3.5" /> Add Link
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">Select a menu to start managing its columns.</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* --- DIALOGS --- */}

      {/* Menu Dialog */}
      <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{menuEditIndex !== null ? "Edit Menu Tab" : "Add Menu Tab"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveMenu} className="space-y-4 pt-4">
            <div>
              <Label>Menu Name</Label>
              <Input
                value={menuName}
                onChange={(e) => {
                  setMenuName(e.target.value);
                  if (menuEditIndex === null) {
                    setMenuSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""));
                  }
                }}
                placeholder="e.g. Binnenverlichting"
                required
              />
            </div>
            <div>
              <Label>Category Slug</Label>
              <Input
                value={menuSlug}
                onChange={(e) => setMenuSlug(e.target.value)}
                placeholder="e.g. indoor-lighting"
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setMenuDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{menuEditIndex !== null ? "Save Changes" : "Add Tab"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sectionEditIndex !== null ? "Edit Section Title" : "Add Section Column"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSection} className="space-y-4 pt-4">
            <div>
              <Label>Section Title</Label>
              <Input
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="e.g. Hanglampen"
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSectionDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{sectionEditIndex !== null ? "Save Changes" : "Add Column"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{itemEditIndex !== null ? "Edit Link" : "Add Link"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4 pt-4">
            <div>
              <Label>Link Name / Label</Label>
              <Input
                value={itemName}
                onChange={(e) => {
                  setItemName(e.target.value);
                  if (itemEditIndex === null) {
                    setItemSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""));
                  }
                }}
                placeholder="e.g. Plafondlampen"
                required
              />
            </div>
            <div>
              <Label>Link Slug / Target Category</Label>
              <Input
                value={itemSlug}
                onChange={(e) => setItemSlug(e.target.value)}
                placeholder="e.g. ceiling-lights"
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{itemEditIndex !== null ? "Save Changes" : "Add Link"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
