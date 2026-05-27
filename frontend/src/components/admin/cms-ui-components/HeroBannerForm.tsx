import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Link as LinkIcon, Upload } from "lucide-react";
import { MediaLibraryDialog } from "../media/MediaLibraryDialog";

export interface HeroSlide {
  title: string;
  subtitle: string;
  bgImage: string;
  btnText: string;
  btnLink: string;
  imageMode: "url" | "upload";
  isCompressing?: boolean;
  compressedInfo?: any;
  imageError?: string;
}

interface HeroBannerFormProps {
  slides: HeroSlide[];
  onAddSlide: () => void;
  onRemoveSlide: (index: number) => void;
  onUpdateSlide: (index: number, key: keyof HeroSlide, value: any) => void;
}

export function HeroBannerForm({ slides, onAddSlide, onRemoveSlide, onUpdateSlide }: HeroBannerFormProps) {
  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
      <div className="flex items-center justify-between mb-4">
        <Label className="text-base font-semibold">Banner Slides</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAddSlide}>
          <Plus className="h-4 w-4 mr-2" /> Add Slide
        </Button>
      </div>
      {slides.map((slide, index) => (
        <div key={index} className="space-y-3 p-4 border rounded bg-background relative">
          {slides.length > 1 && (
            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => onRemoveSlide(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={slide.title} onChange={e => onUpdateSlide(index, "title", e.target.value)} placeholder="Spring Deals" />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input value={slide.subtitle} onChange={e => onUpdateSlide(index, "subtitle", e.target.value)} placeholder="Up to 50% off" />
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
                  onClick={() => onUpdateSlide(index, "imageMode", "url")}
                >
                  <LinkIcon className="h-3 w-3 mr-1" /> URL
                </Button>
                <Button
                  type="button"
                  variant={slide.imageMode === "upload" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => onUpdateSlide(index, "imageMode", "upload")}
                >
                  <Upload className="h-3 w-3 mr-1" /> Upload
                </Button>
              </div>
            </div>

            {slide.imageMode === "url" ? (
              <Input value={slide.bgImage} onChange={e => onUpdateSlide(index, "bgImage", e.target.value)} placeholder="https://..." />
            ) : (
              <div className="space-y-2 p-3 border border-dashed rounded-md bg-muted/20">
                <Button type="button" variant="outline" className="w-full" onClick={() => setActiveSlideIndex(index)}>
                  Browse Media Storage
                </Button>
                {slide.bgImage && slide.bgImage.startsWith("http") && (
                   <div className="text-xs text-green-600 dark:text-green-400">
                     Image selected from storage.
                   </div>
                )}
                {slide.imageError && <div className="text-xs text-destructive">{slide.imageError}</div>}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input value={slide.btnText} onChange={e => onUpdateSlide(index, "btnText", e.target.value)} placeholder="Shop Now" />
            </div>
            <div className="space-y-2">
              <Label>Button Link</Label>
              <Input value={slide.btnLink} onChange={e => onUpdateSlide(index, "btnLink", e.target.value)} placeholder="/category/deals" />
            </div>
          </div>
        </div>
      ))}

      <MediaLibraryDialog 
        open={activeSlideIndex !== null}
        onOpenChange={(open) => !open && setActiveSlideIndex(null)}
        onSelect={(url) => {
          if (activeSlideIndex !== null) {
            onUpdateSlide(activeSlideIndex, "bgImage", url.startsWith("http") ? url : `http://localhost:5000${url}`);
          }
        }}
      />
    </div>
  );
}
