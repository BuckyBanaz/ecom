import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Save, Upload, Eye, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { cmsHomepageRepository } from "@/client/apiClient";

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
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div 
        onClick={() => !value && ref.current?.click()}
        className={`group relative overflow-hidden rounded-xl border-2 border-dashed transition-all ${value ? 'border-border' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 cursor-pointer'} bg-muted/30`}
      >
        {value ? (
          <div className="relative aspect-video w-full">
            <img src={value} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => ref.current?.click()}>Change</Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => onChange(null)}>Remove</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="rounded-full bg-background p-3 shadow-sm mb-3 group-hover:scale-110 transition-transform">
              <ImageIcon className="h-6 w-6 text-primary/70" />
            </div>
            <p className="text-sm font-medium">Click to upload image</p>
            <p className="text-xs text-muted-foreground/70 mt-1">SVG, PNG, JPG or WebP (max 5MB)</p>
          </div>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handle} />
      </div>
    </div>
  );
}



const CMSHomepage = () => {
  const [content, setContent] = useState("");
  
  // SEO State
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoImage, setSeoImage] = useState<ImgState>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHomepage = async () => {
      try {
        setIsLoading(true);
        const res = await cmsHomepageRepository.get();
        if (res.success && res.data) {
          setContent(res.data.content || "");
          setSeoTitle(res.data.seoTitle || "");
          setSeoDesc(res.data.seoDesc || "");
          setSeoKeywords(res.data.seoKeywords || "");
          setSeoImage(res.data.seoImage || null);
        } else {
          setContent("");
        }
      } catch (error) {
        console.error("Failed to load homepage data", error);
        setContent("");
      } finally {
        setIsLoading(false);
      }
    };
    fetchHomepage();
  }, []);

  const save = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    try {
      await cmsHomepageRepository.update({
        content,
        seoTitle,
        seoDesc,
        seoKeywords,
        seoImage,
      });
      toast.success("Homepage successfully updated!"); 
    } catch (error) {
      toast.error("Failed to update homepage");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <form onSubmit={save} className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">Homepage</h1>
            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Published
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Design your homepage layout and optimize it for search engines.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" className="gap-2 shadow-sm" onClick={() => window.open('/', '_blank')}>
            <Eye className="h-4 w-4" /> Live Preview
          </Button>
          <Button type="submit" className="gap-2 shadow-sm">
            <Save className="h-4 w-4" /> Publish Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-muted-foreground/10 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg">Canvas Editor</CardTitle>
              <CardDescription>
                Build your page visually. Use the <strong className="text-foreground">UI Blocks</strong> tool to insert functional sections.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="min-h-[600px]">
                <RichTextEditor 
                  value={content} 
                  onChange={setContent} 
                  placeholder="Start building your homepage..." 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          <Card className="border-muted-foreground/10 shadow-sm sticky top-6">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg">SEO & Social</CardTitle>
              <CardDescription>Configure search engine visibility.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">Meta Title</Label>
                  <span className={`text-xs ${seoTitle.length > 60 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {seoTitle.length} / 60
                  </span>
                </div>
                <Input 
                  value={seoTitle} 
                  onChange={e => setSeoTitle(e.target.value)} 
                  placeholder="e.g. Premium Lighting & Home Decor" 
                  className="bg-muted/30"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">Meta Description</Label>
                  <span className={`text-xs ${seoDesc.length > 160 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {seoDesc.length} / 160
                  </span>
                </div>
                <Textarea 
                  value={seoDesc} 
                  onChange={e => setSeoDesc(e.target.value)} 
                  placeholder="Brief compelling description for search results..." 
                  rows={4} 
                  className="bg-muted/30 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Meta Keywords</Label>
                <Input 
                  value={seoKeywords} 
                  onChange={e => setSeoKeywords(e.target.value)} 
                  placeholder="lighting, decor, shop (comma separated)" 
                  className="bg-muted/30"
                />
              </div>

              <div className="pt-4 border-t">
                <ImageUploader label="Social Share Image (OG Image)" value={seoImage} onChange={setSeoImage} />
                <p className="text-xs text-muted-foreground mt-2">
                  This image will be displayed when your homepage is shared on social media (Facebook, X, etc). Recommended: 1200x630px.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
};

export default CMSHomepage;