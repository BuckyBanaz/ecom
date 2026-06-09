import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryRepository } from "@/client/apiClient";

export function CategoryMultiSelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryRepository.getAll();
        if (res && res.categories) {
          setCategoriesList(res.categories);
        } else if (res && res.data) {
          setCategoriesList(res.data);
        }
      } catch (err) {
        console.error("API fetch failed, falling back to local data:", err);
        const saved = localStorage.getItem("categories_data");
        if (saved) {
          setCategoriesList(JSON.parse(saved));
        } else {
          import("@/data/categories").then(mod => {
            setCategoriesList(mod.categories);
          });
        }
      }
    };
    fetchCategories();
  }, []);

  const selectedSlugs = value ? value.split(",").map(s => s.trim()).filter(Boolean) : [];

  const toggleCategory = (slug: string) => {
    if (slug === "all") {
      if (selectedSlugs.includes("all")) {
        onChange("");
      } else {
        onChange("all");
      }
      return;
    }
    
    let newSelected = selectedSlugs.filter(s => s !== "all");

    if (newSelected.includes(slug)) {
      newSelected = newSelected.filter(s => s !== slug);
    } else {
      newSelected.push(slug);
    }
    onChange(newSelected.join(","));
  };

  return (
    <div className="flex flex-col gap-2">
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

      {/* Selected Categories Badges */}
      {selectedSlugs.length > 0 && !selectedSlugs.includes("all") && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {selectedSlugs.map(slug => {
            const cat = categoriesList.find(c => c.slug === slug);
            return (
              <span key={slug} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-md font-medium">
                {cat ? cat.name : slug}
                <button 
                  type="button" 
                  onClick={(e) => { e.preventDefault(); toggleCategory(slug); }}
                  className="hover:text-destructive rounded-full p-0.5 focus:outline-none transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CategoryBlockFormProps {
  onInsert: (shortcode: string) => void;
  onCancel: () => void;
  initialTitle?: string;
  initialCategories?: string;
  isEditing?: boolean;
}

export function CategoryBlockForm({
  onInsert,
  onCancel,
  initialTitle = "",
  initialCategories = "",
  isEditing = false,
}: CategoryBlockFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [categories, setCategories] = useState(initialCategories);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const handleInsert = () => {
    const attrs: string[] = [];
    if (title) attrs.push(`title="${title.replace(/"/g, "&quot;")}"`);
    if (categories) attrs.push(`categories="${categories}"`);
    const attrString = attrs.length > 0 ? " " + attrs.join(" ") : "";
    const shortcode = `[category-block${attrString}][/category-block]`;
    onInsert(shortcode + "<p><br/></p>");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title (Optional)</Label>
        <Input
          placeholder="e.g. Shop by Category"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Categories</Label>
        <CategoryMultiSelect value={categories} onChange={setCategories} />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleInsert} disabled={!categories}>
          {isEditing ? "Update Block" : "Insert Block"}
        </Button>
      </div>
    </div>
  );
}
