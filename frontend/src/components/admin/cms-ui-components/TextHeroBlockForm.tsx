import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TextHeroBlockFormProps {
  onInsert: (shortcode: string) => void;
  onCancel: () => void;
}

export function TextHeroBlockForm({ onInsert, onCancel }: TextHeroBlockFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");

  const handleInsert = () => {
    let shortcode = `[text-hero title="${title.replace(/"/g, '&quot;')}"`;
    if (subtitle) shortcode += ` subtitle="${subtitle.replace(/"/g, '&quot;')}"`;
    if (description) shortcode += ` description="${description.replace(/"/g, '&quot;')}"`;
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
        <Button onClick={handleInsert} disabled={!title}>Insert Block</Button>
      </div>
    </div>
  );
}
