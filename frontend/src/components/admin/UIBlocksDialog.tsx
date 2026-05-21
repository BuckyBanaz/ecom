import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { IconPicker } from "./IconPicker";
import { Plus, Trash2, Upload, Link as LinkIcon, Check, ChevronsUpDown } from "lucide-react";
import { compressImage } from "@/utils/imageCompress";
import { cn } from "@/lib/utils";
import { categoryRepository } from "@/client/apiClient";

export type UIBlocksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (shortcode: string) => void;
};

type BlockType = "hero-banner" | "category-block" | "product-block" | "features-block" | "deals-block" | "brands-block" | "blogs-block" | "reviews-block" | null;

export function UIBlocksDialog({ open, onOpenChange, onInsert }: UIBlocksDialogProps) {
  const [selectedBlock, setSelectedBlock] = useState<BlockType>(null);
  
  // Shared Form State
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");

  // Hero Banner Specific (Slides)
  const [heroSlides, setHeroSlides] = useState<{ title: string; subtitle: string; bgImage: string; btnText: string; btnLink: string; imageMode: "url" | "upload"; isCompressing?: boolean; compressedInfo?: any; imageError?: string }>([
    { title: "", subtitle: "", bgImage: "", btnText: "", btnLink: "", imageMode: "url" }
  ]);

  // Categories Specific
  const [categories, setCategories] = useState(""); // comma separated

  // Products Specific
  const [productType, setProductType] = useState("bestsellers");

  // Features Specific
  const [features, setFeatures] = useState<{ icon: string; title: string; description: string }[]>([
    { icon: "truck-fast", title: "Fast delivery", description: "Order before 22:00, delivered next day" }
  ]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setHeroSlides([{ title: "", subtitle: "", bgImage: "", btnText: "", btnLink: "", imageMode: "url" }]);
    setCategories("");
    setProductType("bestsellers");
    setFeatures([{ icon: "truck-fast", title: "Fast delivery", description: "Order before 22:00, delivered next day" }]);
  };

  const handleSelectBlock = (type: BlockType) => {
    setSelectedBlock(type);
    resetForm();
  };

  const addFeature = () => {
    setFeatures([...features, { icon: "star", title: "", description: "" }]);
  };
  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };
  const updateFeature = (index: number, key: string, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = { ...newFeatures[index], [key]: value };
    setFeatures(newFeatures);
  };

  const addHeroSlide = () => {
    setHeroSlides([...heroSlides, { title: "", subtitle: "", bgImage: "", btnText: "", btnLink: "", imageMode: "url" }]);
  };
  const removeHeroSlide = (index: number) => {
    setHeroSlides(heroSlides.filter((_, i) => i !== index));
  };
  const updateHeroSlide = (index: number, key: string, value: any) => {
    const newSlides = [...heroSlides];
    newSlides[index] = { ...newSlides[index], [key]: value };
    setHeroSlides(newSlides);
  };

  const handleHeroImageFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      updateHeroSlide(index, "imageError", "File exceeds 10MB limit.");
      return;
    }

    updateHeroSlide(index, "imageError", undefined);
    updateHeroSlide(index, "isCompressing", true);

    try {
      const compressed = await compressImage(file);
      updateHeroSlide(index, "bgImage", compressed.dataUrl);
      updateHeroSlide(index, "compressedInfo", {
        size: compressed.size,
        width: compressed.width,
        height: compressed.height
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Compression error";
      updateHeroSlide(index, "imageError", `Failed to compress image: ${message}`);
    } finally {
      updateHeroSlide(index, "isCompressing", false);
    }
  };

  const generateShortcode = () => {
    if (!selectedBlock) return "";

    let attributes = [];
    if (title && selectedBlock !== "hero-banner") attributes.push(`title="${title}"`);
    if (description) attributes.push(`description="${description}"`);

    switch (selectedBlock) {
      case "hero-banner":
        attributes.push(`count="${heroSlides.length}"`);
        heroSlides.forEach((slide, i) => {
          if (slide.title) attributes.push(`title_${i+1}="${slide.title}"`);
          if (slide.subtitle) attributes.push(`subtitle_${i+1}="${slide.subtitle}"`);
          if (slide.bgImage) attributes.push(`background_image_${i+1}="${slide.bgImage}"`);
          if (slide.btnText) attributes.push(`primary_button_text_${i+1}="${slide.btnText}"`);
          if (slide.btnLink) attributes.push(`primary_button_link_${i+1}="${slide.btnLink}"`);
        });
        break;
      case "category-block":
        if (categories) attributes.push(`categories="${categories}"`);
        break;
      case "product-block":
        attributes.push(`type="${productType}"`);
        break;
      case "features-block":
        attributes.push(`count="${features.length}"`);
        features.forEach((f, i) => {
          attributes.push(`icon_${i+1}="${f.icon}" title_${i+1}="${f.title}" desc_${i+1}="${f.description}"`);
        });
        break;
      case "deals-block":
      case "brands-block":
      case "blogs-block":
      case "reviews-block":
        break;
    }

    const attrString = attributes.length > 0 ? " " + attributes.join(" ") : "";
    const shortcodeStr = `[${selectedBlock}${attrString}][/${selectedBlock}]`;
    const friendlyName = selectedBlock.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    
    return `<div class="cms-block" style="background-color: #f4f4f5; padding: 16px; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 12px; position: relative; font-family: monospace; font-size: 14px; color: #52525b;">
  <span contenteditable="false" style="position: absolute; top: -1px; right: -1px; background-color: #71717a; color: white; padding: 4px 8px; font-size: 11px; font-family: sans-serif; font-weight: bold; border-bottom-left-radius: 8px; border-top-right-radius: 8px; user-select: none;">${friendlyName}</span>
  ${shortcodeStr}
</div><p><br/></p>`;
  };

  const handleInsert = () => {
    const code = generateShortcode();
    onInsert(code);
    setSelectedBlock(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setSelectedBlock(null);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedBlock ? `Configure ${selectedBlock.replace("-", " ")}` : "Select UI Block"}</DialogTitle>
        </DialogHeader>

        {!selectedBlock ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4">
            <BlockOption onClick={() => handleSelectBlock("hero-banner")} title="Hero Banner Slider" desc="Large banner with background and CTA" />
            <BlockOption onClick={() => handleSelectBlock("category-block")} title="Category Grid" desc="Display category tiles" />
            <BlockOption onClick={() => handleSelectBlock("product-block")} title="Products Slider" desc="Bestsellers, Featured, etc." />
            <BlockOption onClick={() => handleSelectBlock("features-block")} title="Features List" desc="Icons with text (e.g. Fast delivery)" />
            <BlockOption onClick={() => handleSelectBlock("deals-block")} title="Deals Section" desc="Special offers countdown" />
            <BlockOption onClick={() => handleSelectBlock("brands-block")} title="Brands Carousel" desc="Trusted companies logos" />
            <BlockOption onClick={() => handleSelectBlock("reviews-block")} title="Customer Reviews" desc="Testimonials grid" />
            <BlockOption onClick={() => handleSelectBlock("blogs-block")} title="Latest Blogs" desc="Recent articles grid" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {selectedBlock !== "hero-banner" && (
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Block title..." />
              </div>
            )}

            {selectedBlock !== "hero-banner" && (
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." />
              </div>
            )}

            {/* HERO BANNER FIELDS */}
            {selectedBlock === "hero-banner" && (
              <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold">Banner Slides</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addHeroSlide}>
                    <Plus className="h-4 w-4 mr-2" /> Add Slide
                  </Button>
                </div>
                {heroSlides.map((slide, index) => (
                  <div key={index} className="space-y-3 p-4 border rounded bg-background relative">
                    {heroSlides.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeHeroSlide(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={slide.title} onChange={e => updateHeroSlide(index, "title", e.target.value)} placeholder="Spring Deals" />
                      </div>
                      <div className="space-y-2">
                        <Label>Subtitle</Label>
                        <Input value={slide.subtitle} onChange={e => updateHeroSlide(index, "subtitle", e.target.value)} placeholder="Up to 50% off" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Background Image</Label>
                        <div className="flex bg-muted/50 p-1 rounded-md">
                          <Button
                            type="button"
                            variant={slide.imageMode === "url" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => updateHeroSlide(index, "imageMode", "url")}
                          >
                            <LinkIcon className="h-3 w-3 mr-1" /> URL
                          </Button>
                          <Button
                            type="button"
                            variant={slide.imageMode === "upload" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => updateHeroSlide(index, "imageMode", "upload")}
                          >
                            <Upload className="h-3 w-3 mr-1" /> Upload
                          </Button>
                        </div>
                      </div>

                      {slide.imageMode === "url" ? (
                        <Input value={slide.bgImage} onChange={e => updateHeroSlide(index, "bgImage", e.target.value)} placeholder="https://..." />
                      ) : (
                        <div className="space-y-2 p-3 border border-dashed rounded-md bg-muted/20">
                          <input type="file" accept="image/*" onChange={(e) => handleHeroImageFileChange(index, e)} className="text-sm w-full" />
                          {slide.isCompressing && <div className="text-xs text-muted-foreground">Compressing image...</div>}
                          {slide.compressedInfo && (
                            <div className="text-xs text-green-600 dark:text-green-400">
                              Ready: {slide.compressedInfo.width}x{slide.compressedInfo.height} ({Math.round(slide.compressedInfo.size / 1024)} KB)
                            </div>
                          )}
                          {slide.imageError && <div className="text-xs text-destructive">{slide.imageError}</div>}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Button Text</Label>
                        <Input value={slide.btnText} onChange={e => updateHeroSlide(index, "btnText", e.target.value)} placeholder="Shop Now" />
                      </div>
                      <div className="space-y-2">
                        <Label>Button Link</Label>
                        <Input value={slide.btnLink} onChange={e => updateHeroSlide(index, "btnLink", e.target.value)} placeholder="/category/deals" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CATEGORY BLOCK FIELDS */}
            {selectedBlock === "category-block" && (
              <div className="space-y-2">
                <Label>Categories</Label>
                <CategoryMultiSelect value={categories} onChange={setCategories} />
              </div>
            )}

            {/* PRODUCT BLOCK FIELDS */}
            {selectedBlock === "product-block" && (
              <div className="space-y-2">
                <Label>Product Collection Type</Label>
                <Select value={productType} onValueChange={setProductType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bestsellers">Bestsellers</SelectItem>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="new-arrivals">New Arrivals</SelectItem>
                    <SelectItem value="sale">On Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* FEATURES BLOCK FIELDS */}
            {selectedBlock === "features-block" && (
              <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Features Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                  </Button>
                </div>
                {features.map((feat, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-start border-b pb-4 last:border-0 last:pb-0">
                    <div className="col-span-12 sm:col-span-3">
                      <Label className="text-xs mb-1 block">Icon</Label>
                      <IconPicker value={feat.icon} onChange={(val) => updateFeature(index, "icon", val)} />
                    </div>
                    <div className="col-span-12 sm:col-span-4">
                      <Label className="text-xs mb-1 block">Title</Label>
                      <Input value={feat.title} onChange={(e) => updateFeature(index, "title", e.target.value)} placeholder="Fast delivery" />
                    </div>
                    <div className="col-span-12 sm:col-span-4">
                      <Label className="text-xs mb-1 block">Description</Label>
                      <Input value={feat.description} onChange={(e) => updateFeature(index, "description", e.target.value)} placeholder="Short desc..." />
                    </div>
                    <div className="col-span-12 sm:col-span-1 flex items-end justify-end h-full mt-6">
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeFeature(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedBlock && (
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSelectedBlock(null)}>Back to blocks</Button>
            <Button onClick={handleInsert}>Insert into Editor</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BlockOption({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <span className="font-semibold text-sm mb-1">{title}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </button>
  );
}

function CategoryMultiSelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  useEffect(() => {
    categoryRepository.getAll().then(res => {
      if (res && res.data) setCategoriesList(res.data);
    }).catch(console.error);
  }, []);

  const selectedSlugs = value ? value.split(",").map(s => s.trim()).filter(Boolean) : [];

  const toggleCategory = (slug: string) => {
    if (slug === "all") {
      // If "all" is clicked, either clear everything or set to just "all"
      if (selectedSlugs.includes("all")) {
        onChange("");
      } else {
        onChange("all");
      }
      return;
    }
    
    // Clear "all" if selecting a specific category
    let newSelected = selectedSlugs.filter(s => s !== "all");

    if (newSelected.includes(slug)) {
      newSelected = newSelected.filter(s => s !== slug);
    } else {
      newSelected.push(slug);
    }
    onChange(newSelected.join(","));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {selectedSlugs.length > 0 
            ? (selectedSlugs.includes("all") ? "All Categories" : `${selectedSlugs.length} selected`) 
            : "Select categories..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="All Categories" onSelect={() => toggleCategory("all")}>
                <Check className={cn("mr-2 h-4 w-4", selectedSlugs.includes("all") ? "opacity-100" : "opacity-0")} />
                All Categories
              </CommandItem>
              {categoriesList.map((cat) => (
                <CommandItem key={cat.id} value={cat.name} onSelect={() => toggleCategory(cat.slug)}>
                  <Check className={cn("mr-2 h-4 w-4", selectedSlugs.includes(cat.slug) ? "opacity-100" : "opacity-0")} />
                  {cat.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
