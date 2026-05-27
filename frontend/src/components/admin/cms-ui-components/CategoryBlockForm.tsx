import React, { useState, useEffect } from "react";
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
  categories: string;
  setCategories: (val: string) => void;
}

export function CategoryBlockForm({ categories, setCategories }: CategoryBlockFormProps) {
  return (
    <div className="space-y-2">
      <Label>Categories</Label>
      <CategoryMultiSelect value={categories} onChange={setCategories} />
    </div>
  );
}
