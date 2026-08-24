import { useState, useEffect } from "react";
import { encodeShortcodeAttribute } from "@/utils/shortcodeAttrs";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TextHeroBlockFormProps {
  onInsert: (shortcode: string) => void;
  onCancel: () => void;
  initialTitle?: string;
  initialSubtitle?: string;
  initialDescription?: string;
  isEditing?: boolean;
}

export function TextHeroBlockForm({
  onInsert,
  onCancel,
  initialTitle = "",
  initialSubtitle = "",
  initialDescription = "",
  isEditing = false,
}: TextHeroBlockFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle);
  const [description, setDescription] = useState(initialDescription);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    setSubtitle(initialSubtitle);
  }, [initialSubtitle]);

  useEffect(() => {
    setDescription(initialDescription);
  }, [initialDescription]);

  const handleInsert = () => {
    let shortcode = `[text-hero title="${encodeShortcodeAttribute(title)}"`;
    if (subtitle) shortcode += ` subtitle="${encodeShortcodeAttribute(subtitle)}"`;
    if (description) shortcode += ` description="${encodeShortcodeAttribute(description)}"`;
    shortcode += `][/text-hero]`;
    
    // Add an empty paragraph afterwards so the user has space to write the description
    onInsert(shortcode + "<p><br/></p>");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Hero Title</Label>
        <Input 
          placeholder="e.g. Relief" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
        />
      </div>
      <div className="space-y-2">
        <Label>Subtitle (Optional)</Label>
        <Input 
          placeholder="e.g. Buying lighting? Choose a category" 
          value={subtitle} 
          onChange={(e) => setSubtitle(e.target.value)} 
        />
      </div>
      <div className="space-y-2">
        <Label>Description (Optional)</Label>
        <Input 
          placeholder="e.g. Upgrade your space with modern styles..." 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleInsert} disabled={!title}>
          {isEditing ? "Update Block" : "Insert Block"}
        </Button>
      </div>
    </div>
  );
}
