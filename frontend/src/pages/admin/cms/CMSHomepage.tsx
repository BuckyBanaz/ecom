import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ImgState = string | null;

function ImageUploader({ label, value, onChange }: { label: string; value: ImgState; onChange: (v: ImgState) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    const r = new FileReader();
    r.onload = (ev) => onChange(ev.target?.result as string);
    r.readAsDataURL(f);
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-24 w-40 shrink-0 overflow-hidden rounded-lg border bg-muted">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Upload className="h-6 w-6" /></div>
          )}
        </div>
        <div>
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handle} />
          <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" /> {value ? "Change" : "Upload"}
          </Button>
          {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} className="ml-2 text-destructive">Remove</Button>}
        </div>
      </div>
    </div>
  );
}

const CMSHomepage = () => {
  const [logo, setLogo] = useState<ImgState>(null);
  const [hero, setHero] = useState<ImgState>(null);
  const [banners, setBanners] = useState<ImgState[]>([null, null, null]);
  const [headline, setHeadline] = useState("Spring Deals — Up to 40% off");
  const [subline, setSubline] = useState("Brighten your home with our curated lighting collection.");
  const [ctaText, setCtaText] = useState("Shop now");
  const [ctaLink, setCtaLink] = useState("/category/pendant-lamps");
  const [announcement, setAnnouncement] = useState("Free shipping on orders over €75");

  const save = (e: React.FormEvent) => { e.preventDefault(); toast.success("Homepage content saved (demo)"); };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Homepage</h1>
          <p className="text-muted-foreground">Manage header, hero and promotional banners</p>
        </div>
        <Button type="submit" className="gap-2"><Save className="h-4 w-4" /> Save changes</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Header</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ImageUploader label="Logo" value={logo} onChange={setLogo} />
          <div>
            <Label>Announcement bar</Label>
            <Input value={announcement} onChange={(e) => setAnnouncement(e.target.value)} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hero section</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ImageUploader label="Hero image" value={hero} onChange={setHero} />
          <div><Label>Headline</Label><Input value={headline} onChange={(e) => setHeadline(e.target.value)} className="mt-1" /></div>
          <div><Label>Subline</Label><Textarea value={subline} onChange={(e) => setSubline(e.target.value)} className="mt-1" rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>CTA text</Label><Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="mt-1" /></div>
            <div><Label>CTA link</Label><Input value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} className="mt-1" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Promo banners</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setBanners([...banners, null])} className="gap-2">
              <Plus className="h-4 w-4" /> Add banner
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {banners.map((b, i) => (
            <div key={i} className="flex items-start gap-4 rounded-lg border p-3">
              <div className="flex-1">
                <ImageUploader label={`Banner ${i + 1}`} value={b} onChange={(v) => setBanners(banners.map((x, j) => (j === i ? v : x)))} />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setBanners(banners.filter((_, j) => j !== i))} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </form>
  );
};

export default CMSHomepage;