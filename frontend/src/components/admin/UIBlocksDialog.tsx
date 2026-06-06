import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, Upload, Link as LinkIcon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryRepository } from "@/client/apiClient";

// Import extracted UI components
import { HeroBannerForm, HeroSlide } from "./cms-ui-components/HeroBannerForm";
import { CategoryBlockForm } from "./cms-ui-components/CategoryBlockForm";
import { ProductBlockForm } from "./cms-ui-components/ProductBlockForm";
import { FeaturesBlockForm, FeatureItem } from "./cms-ui-components/FeaturesBlockForm";
import { TextHeroBlockForm } from "./cms-ui-components/TextHeroBlockForm";
import { MenuCategoryBlockForm } from "./cms-ui-components/MenuCategoryBlockForm";

export type UIBlocksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (shortcode: string, isEdit?: boolean) => void;
  editingShortcode?: string | null;
};

type BlockType = "hero-banner" | "text-hero" | "category-block" | "menu-category" | "product-block" | "features-block" | "deals-block" | "brands-block" | "blogs-block" | "reviews-block" | null;

export function UIBlocksDialog({ open, onOpenChange, onInsert, editingShortcode }: UIBlocksDialogProps) {
  const [selectedBlock, setSelectedBlock] = useState<BlockType>(null);
  
  // Shared Form State
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");

  // Hero Banner Specific (Slides)
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([
    { title: "", subtitle: "", bgImage: "", btnText: "", btnLink: "", imageMode: "url" }
  ]);

  // Categories Specific
  const [categories, setCategories] = useState(""); // comma separated

  // Products Specific
  const [productType, setProductType] = useState("bestsellers");

  // Features Specific
  const [features, setFeatures] = useState<FeatureItem[]>([
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

  useEffect(() => {
    if (open && editingShortcode) {
      const match = editingShortcode.match(/\[([a-zA-Z0-9-]+)([^\]]*)\]\[\/\1\]/);
      if (match) {
        const type = match[1] as BlockType;
        const attrStr = match[2];
        setSelectedBlock(type);
        
        const attributes: Record<string, string> = {};
        const attrRegex = /([a-zA-Z0-9_]+)="([^"]*)"/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
          attributes[attrMatch[1]] = attrMatch[2];
        }

        setTitle(attributes.title || "");
        setDescription(attributes.description || "");

        if (type === "hero-banner") {
           const count = parseInt(attributes.count || "1");
           const slides = [];
           for(let i=1; i<=count; i++) {
             slides.push({
               title: attributes[`title_${i}`] || (i === 1 ? attributes.title : "") || "",
               subtitle: attributes[`subtitle_${i}`] || (i === 1 ? attributes.subtitle : "") || "",
               bgImage: attributes[`background_image_${i}`] || (i === 1 ? attributes.background_image : "") || "",
               btnText: attributes[`primary_button_text_${i}`] || (i === 1 ? attributes.primary_button_text : "") || "",
               btnLink: attributes[`primary_button_link_${i}`] || (i === 1 ? attributes.primary_button_link : "") || "",
               imageMode: "url" as const
             });
           }
           setHeroSlides(slides.length > 0 ? slides : [{ title: "", subtitle: "", bgImage: "", btnText: "", btnLink: "", imageMode: "url" }]);
        } else if (type === "category-block") {
           setCategories(attributes.categories || "");
        } else if (type === "product-block") {
           setProductType(attributes.type || "bestsellers");
        } else if (type === "features-block") {
           const count = parseInt(attributes.count || "1");
           const feats = [];
           for(let i=1; i<=count; i++) {
             feats.push({
               icon: attributes[`icon_${i}`] || (i === 1 ? attributes.icon : "") || "star",
               title: attributes[`title_${i}`] || (i === 1 ? attributes.title : "") || "",
               description: attributes[`desc_${i}`] || (i === 1 ? attributes.desc : "") || ""
             });
           }
           setFeatures(feats.length > 0 ? feats : [{ icon: "truck-fast", title: "Fast delivery", description: "Order before 22:00, delivered next day" }]);
        }
      }
    } else if (open && !editingShortcode) {
      setSelectedBlock(null);
      resetForm();
    }
  }, [open, editingShortcode]);

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
  const updateHeroSlide = (index: number, key: keyof HeroSlide, value: any) => {
    const newSlides = [...heroSlides];
    newSlides[index] = { ...newSlides[index], [key]: value };
    setHeroSlides(newSlides);
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
    
    return `<div class="cms-block" contenteditable="false" style="background-color: #f4f4f5; padding: 16px; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 12px; position: relative; font-family: monospace; font-size: 14px; color: #52525b; user-select: none;">
  <span style="position: absolute; top: -1px; right: -1px; background-color: #3f3f46; color: white; padding: 4px 10px; font-size: 11px; font-family: sans-serif; font-weight: bold; border-bottom-left-radius: 8px; border-top-right-radius: 8px; user-select: none; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <span style="opacity: 0.85; margin-right: 4px;">${friendlyName}</span>
    <button type="button" class="cms-block-up-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 10px; padding: 0;" title="Move Up">▲</button>
    <button type="button" class="cms-block-down-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 10px; padding: 0;" title="Move Down">▼</button>
    <button type="button" class="cms-block-edit-btn" style="background: #2563eb; border: none; color: white; cursor: pointer; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; line-height: 1;" title="Edit Block">Edit</button>
    <button type="button" class="cms-block-delete-btn" style="background: #dc2626; border: none; color: white; cursor: pointer; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; line-height: 1;" title="Delete Block">Delete</button>
  </span>
  ${shortcodeStr}
</div><p><br/></p>`;
  };

  const handleExternalInsert = (shortcode: string) => {
    onInsert(shortcode, !!editingShortcode);
    setSelectedBlock(null);
    onOpenChange(false);
  };

  const handleInsert = () => {
    const code = generateShortcode();
    onInsert(code, !!editingShortcode);
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed bg-muted/30" onClick={() => handleSelectBlock("hero-banner")}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
              <span>Image Hero Banner</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed bg-muted/30" onClick={() => handleSelectBlock("text-hero")}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">T</div>
              <span>Text Hero</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed bg-muted/30" onClick={() => handleSelectBlock("category-block")}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
              <span>Category Block</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed bg-muted/30" onClick={() => handleSelectBlock("menu-category")}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">M</div>
              <span>Menu Category Grid</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed bg-muted/30" onClick={() => handleSelectBlock("product-block")}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
              <span>Products List</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed bg-muted/30" onClick={() => handleSelectBlock("features-block")}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">4</div>
              <span>Features List</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed bg-muted/30" onClick={() => handleSelectBlock("brands-block")}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">5</div>
              <span>Brands List</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed bg-muted/30" onClick={() => handleSelectBlock("blogs-block")}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">6</div>
              <span>Latest Blogs</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed bg-muted/30" onClick={() => handleSelectBlock("reviews-block")}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">7</div>
              <span>Customer Reviews</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {selectedBlock !== "hero-banner" && selectedBlock !== "text-hero" && selectedBlock !== "menu-category" && selectedBlock !== "category-block" && (
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Block title..." />
              </div>
            )}

            {selectedBlock !== "hero-banner" && selectedBlock !== "text-hero" && selectedBlock !== "menu-category" && selectedBlock !== "category-block" && (
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." />
              </div>
            )}

            {/* HERO BANNER FIELDS */}
            {selectedBlock === "hero-banner" && (
              <HeroBannerForm 
                slides={heroSlides}
                onAddSlide={addHeroSlide}
                onRemoveSlide={removeHeroSlide}
                onUpdateSlide={updateHeroSlide}
              />
            )}

            {/* PRODUCT BLOCK FIELDS */}
            {selectedBlock === "product-block" && (
              <ProductBlockForm productType={productType} setProductType={setProductType} />
            )}

            {/* FEATURES BLOCK FIELDS */}
            {selectedBlock === "features-block" && (
              <FeaturesBlockForm 
                features={features}
                onAddFeature={addFeature}
                onRemoveFeature={removeFeature}
                onUpdateFeature={updateFeature}
              />
            )}
            
            {selectedBlock === "text-hero" && (
              <TextHeroBlockForm 
                onInsert={handleExternalInsert} 
                onCancel={() => setSelectedBlock(null)} 
              />
            )}

            {selectedBlock === "menu-category" && (
              <MenuCategoryBlockForm 
                onInsert={handleExternalInsert} 
                onCancel={() => setSelectedBlock(null)} 
              />
            )}

            {selectedBlock === "category-block" && (
              <CategoryBlockForm 
                onInsert={handleExternalInsert} 
                onCancel={() => setSelectedBlock(null)} 
                initialTitle={title}
                initialCategories={categories}
                isEditing={!!editingShortcode}
              />
            )}
          </div>
        )}

        {selectedBlock && selectedBlock !== "text-hero" && selectedBlock !== "menu-category" && selectedBlock !== "category-block" && (
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

