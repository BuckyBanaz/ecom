import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Eye, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { MediaLibraryDialog } from "@/components/admin/media/MediaLibraryDialog";
import { normalizeUploadedUrl, resolveImgUrl } from "@/utils/image";

type ImgState = string | null;

function ImageUploader({ label, value, onChange }: { label: string; value: ImgState; onChange: (v: ImgState) => void }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div 
        onClick={() => !value && setIsDialogOpen(true)}
        className={`group relative overflow-hidden rounded-xl border-2 border-dashed transition-all ${value ? 'border-border' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 cursor-pointer'} bg-muted/30`}
      >
        {value ? (
          <div className="relative aspect-video w-full">
            <img src={resolveImgUrl(value)} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsDialogOpen(true)}>Change</Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => onChange(null)}>Remove</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="rounded-full bg-background p-3 shadow-sm mb-3 group-hover:scale-110 transition-transform">
              <ImageIcon className="h-6 w-6 text-primary/70" />
            </div>
            <p className="text-sm font-medium">Click to browse media</p>
          </div>
        )}
      </div>
      <MediaLibraryDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        onSelect={(url) => {
          onChange(normalizeUploadedUrl(url));
        }} 
      />
    </div>
  );
}

const presets: Record<string, { title: string; slug: string; body: string }> = {
  "privacy-policy": {
    title: "Privacy Policy",
    slug: "privacy-policy",
    body: "We respect your privacy. This document describes what data we collect and how we use it...",
  },
  "terms-conditions": {
    title: "Terms & Conditions",
    slug: "terms-conditions",
    body: "By using our service you agree to the following terms...",
  },
};

const CMSLegal = () => {
  const { kind = "privacy-policy" } = useParams();
  const preset = presets[kind] ?? presets["privacy-policy"];
  
  const [body, setBody] = useState(preset.body);
  
  // SEO State
  const [seoTitle, setSeoTitle] = useState(`${preset.title} | YourStore`);
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoImage, setSeoImage] = useState<ImgState>(null);

  // Reset state when route changes
  useEffect(() => {
    setBody(preset.body);
    setSeoTitle(`${preset.title} | YourStore`);
    setSeoDesc("");
    setSeoKeywords("");
    setSeoImage(null);
  }, [kind, preset.body, preset.title]);

  const save = (e: React.FormEvent) => { 
    e.preventDefault(); 
    console.log("Saving legal page:", { kind, body, seoTitle, seoDesc, seoKeywords, seoImage });
    toast.success(`${preset.title} successfully updated!`); 
  };

  return (
    <form onSubmit={save} className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">{preset.title}</h1>
            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Published
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Edit legal page content and optimize it for search engines.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" className="gap-2 shadow-sm" onClick={() => window.open(`/${preset.slug}`, '_blank')}>
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
                Write your legal policy content. You can also use <strong className="text-foreground">UI Blocks</strong> if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="min-h-[600px]">
                <RichTextEditor 
                  value={body} 
                  onChange={setBody} 
                  placeholder={`Start writing your ${preset.title.toLowerCase()}...`} 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          <Card className="border-muted-foreground/10 shadow-sm sticky top-6">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg">SEO Meta Tags</CardTitle>
              <CardDescription>Configure search visibility</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {/* Google Preview */}
              <div className="space-y-2">
                <Label>Google Search Preview</Label>
                <div className="border rounded-xl p-4 bg-muted/20 space-y-1 text-left shadow-xs">
                  <div className="text-[11px] text-muted-foreground truncate">
                    {(import.meta.env.VITE_APP_URL || "https://yourshop.com").replace(/\/$/, '')}/{preset.slug}
                  </div>
                  <div className="text-blue-600 dark:text-blue-400 font-medium text-base hover:underline cursor-pointer truncate">
                    {seoTitle || preset.title}
                  </div>
                  <div className="text-[12px] text-foreground/80 line-clamp-2 leading-relaxed">
                    {seoDesc || "Provide an SEO meta description below to preview how this page will rank and display in Google search results."}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">Meta Title</Label>
                  <span className={`text-xs ${seoTitle.length > 60 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {seoTitle.length} / 60
                  </span>
                </div>
                <Input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="Title for search engines" className="bg-muted/30" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">Meta Description</Label>
                  <span className={`text-xs ${seoDesc.length > 160 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {seoDesc.length} / 160
                  </span>
                </div>
                <Textarea value={seoDesc} onChange={e => setSeoDesc(e.target.value)} placeholder="Brief description..." rows={4} className="bg-muted/30 resize-none" />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Meta Keywords</Label>
                <Input value={seoKeywords} onChange={e => setSeoKeywords(e.target.value)} placeholder="privacy, terms, legal (comma separated)" className="bg-muted/30" />
              </div>

              <div className="pt-4 border-t">
                <ImageUploader label="Social Share Image (OG Image)" value={seoImage} onChange={setSeoImage} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
};

export default CMSLegal;