import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Trash2, Plus, Link as LinkIcon, Upload } from "lucide-react";
import { MediaLibraryDialog } from "../media/MediaLibraryDialog";
import { normalizeUploadedUrl } from "@/utils/image";

export interface HeroSlide {
  title: string;
  subtitle: string;
  bgImage: string;
  btnText: string;
  btnLink: string;
  imageMode: "url" | "upload";
  titleColor: string;
  subtitleColor: string;
  overlayOpacity: number;
  borderRadius: number;
  isCompressing?: boolean;
  compressedInfo?: unknown;
  imageError?: string;
}

export function createDefaultHeroSlide(): HeroSlide {
  return {
    title: "",
    subtitle: "",
    bgImage: "",
    btnText: "",
    btnLink: "",
    imageMode: "url",
    titleColor: "",
    subtitleColor: "",
    overlayOpacity: 40,
    borderRadius: 12,
  };
}

interface HeroBannerFormProps {
  slides: HeroSlide[];
  onAddSlide: () => void;
  onRemoveSlide: (index: number) => void;
  onUpdateSlide: (index: number, key: keyof HeroSlide, value: unknown) => void;
}

export function HeroBannerForm({ slides, onAddSlide, onRemoveSlide, onUpdateSlide }: HeroBannerFormProps) {
  const { t } = useTranslation();
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
              <Input value={slide.title} onChange={(e) => onUpdateSlide(index, "title", e.target.value)} placeholder="Spring Deals" />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input value={slide.subtitle} onChange={(e) => onUpdateSlide(index, "subtitle", e.target.value)} placeholder="Up to 50% off" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={slide.titleColor || "#c4a574"}
                  onChange={(e) => onUpdateSlide(index, "titleColor", e.target.value)}
                  className="h-9 w-14 shrink-0 cursor-pointer p-1"
                />
                <Input
                  value={slide.titleColor}
                  onChange={(e) => onUpdateSlide(index, "titleColor", e.target.value)}
                  placeholder="#c4a574 or empty = theme primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subtitle color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={slide.subtitleColor || "#ffffff"}
                  onChange={(e) => onUpdateSlide(index, "subtitleColor", e.target.value)}
                  className="h-9 w-14 shrink-0 cursor-pointer p-1"
                />
                <Input
                  value={slide.subtitleColor}
                  onChange={(e) => onUpdateSlide(index, "subtitleColor", e.target.value)}
                  placeholder="#ffffff or empty = white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Overlay darkness</Label>
                <span className="text-xs text-muted-foreground">{slide.overlayOpacity}%</span>
              </div>
              <Slider
                min={10}
                max={100}
                step={10}
                value={[slide.overlayOpacity]}
                onValueChange={([v]) => onUpdateSlide(index, "overlayOpacity", v)}
              />
              <p className="text-[10px] text-muted-foreground">Dark layer on image so text stays readable (10–100%)</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Corner radius</Label>
                <span className="text-xs text-muted-foreground">{slide.borderRadius}px</span>
              </div>
              <Slider
                min={0}
                max={48}
                step={4}
                value={[slide.borderRadius]}
                onValueChange={([v]) => onUpdateSlide(index, "borderRadius", v)}
              />
              <p className="text-[10px] text-muted-foreground">Rounded edges of banner image (0 = square)</p>
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
              <Input value={slide.bgImage} onChange={(e) => onUpdateSlide(index, "bgImage", e.target.value)} placeholder="https://..." />
            ) : (
              <div className="space-y-2 p-3 border border-dashed rounded-md bg-muted/20">
                <Button type="button" variant="outline" className="w-full" onClick={() => setActiveSlideIndex(index)}>
                  Browse Media Storage
                </Button>
                {slide.bgImage && slide.bgImage.startsWith("http") && (
                  <div className="text-xs text-green-600 dark:text-green-400">Image selected from storage.</div>
                )}
                {slide.imageError && <div className="text-xs text-destructive">{slide.imageError}</div>}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input value={slide.btnText} onChange={(e) => onUpdateSlide(index, "btnText", e.target.value)} placeholder="Shop Now" />
            </div>
            <div className="space-y-2">
              <Label>Button Link</Label>
              <Input value={slide.btnLink} onChange={(e) => onUpdateSlide(index, "btnLink", e.target.value)} placeholder="/category/deals" />
            </div>
          </div>
        </div>
      ))}

      <MediaLibraryDialog
        open={activeSlideIndex !== null}
        onOpenChange={(open) => !open && setActiveSlideIndex(null)}
        onSelect={(url) => {
          if (activeSlideIndex !== null) {
            onUpdateSlide(activeSlideIndex, "bgImage", normalizeUploadedUrl(url));
          }
        }}
      />
    </div>
  );
}
