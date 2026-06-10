import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { megaMenuData } from "@/data/megaMenu";

interface MenuCategoryBlockFormProps {
  onInsert: (shortcode: string) => void;
  onCancel: () => void;
}

export function MenuCategoryBlockForm({ onInsert, onCancel }: MenuCategoryBlockFormProps) {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const [menuSlug, setMenuSlug] = useState("");
  const [showLabel, setShowLabel] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleInsert = () => {
    let shortcode = `[menu-category menu_slug="${menuSlug}" show_label="${showLabel}"][/menu-category]`;
    onInsert(shortcode + "<p><br/></p>");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Mega Menu Section</Label>
        {isMounted && (
          <Select value={menuSlug} onValueChange={setMenuSlug}>
            <SelectTrigger>
              <SelectValue placeholder="Select a menu to display its categories" />
            </SelectTrigger>
            <SelectContent>
              {megaMenuData.map((menu) => (
                <SelectItem key={menu.slug} value={menu.slug}>
                  {menu.menu}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          This block will dynamically render all the categories that belong to the selected Mega Menu.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">Show Section Label</Label>
          <p className="text-sm text-muted-foreground">
            Display the menu name as a heading above the category grid.
          </p>
        </div>
        <Switch
          checked={showLabel}
          onCheckedChange={setShowLabel}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleInsert} disabled={!menuSlug}>Insert Block</Button>
      </div>
    </div>
  );
}
