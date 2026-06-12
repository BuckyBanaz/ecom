import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, FileText, ArrowLeft, Save, Eye, Image as ImageIcon, CheckCircle2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Switch } from "@/components/ui/switch";
import { cmsPagesRepository } from "@/client/apiClient";
import { MediaLibraryDialog } from "@/components/admin/media/MediaLibraryDialog";
import { resolveImgUrl, normalizeUploadedUrl } from "@/utils/image";
import { getClientBaseUrl } from "@/utils/siteUrl";
import { SectionLoader } from "@/components/ui/PageLoader";

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

type Page = { 
  id: string; 
  title: string; 
  slug: string; 
  body: string; 
  published: boolean; 
  updatedAt: string;
  seoTitle?: string;
  seoDesc?: string;
  seoKeywords?: string;
  seoImage?: string | null;
};

const CMSPages = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [view, setView] = useState<"list" | "editor">("list");
  const [isLoading, setIsLoading] = useState(true);

  const fetchPages = async () => {
    try {
      setIsLoading(true);
      const res = await cmsPagesRepository.getAll();
      if (res.success && res.pages) {
        setPages(res.pages);
      }
    } catch (err) {
      console.error("Failed to load pages:", err);
      toast.error("Failed to load pages");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);
  
  // Editor State
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(true);
  
  // SEO State
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoImage, setSeoImage] = useState<ImgState>(null);

  const [autoSlug, setAutoSlug] = useState(true);

  // Auto-generate slug
  useEffect(() => {
    if (autoSlug && title) {
      setSlug(title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''));
    }
  }, [title, autoSlug]);

  const openNew = () => {
    setEditId(null);
    setTitle("");
    setSlug("");
    setBody("");
    setPublished(true);
    setSeoTitle("");
    setSeoDesc("");
    setSeoKeywords("");
    setSeoImage(null);
    setAutoSlug(true);
    setView("editor");
  };

  const openEdit = (p: Page) => {
    setEditId(p.id);
    setTitle(p.title);
    setSlug(p.slug);
    setBody(p.body);
    setPublished(p.published);
    setSeoTitle(p.seoTitle || "");
    setSeoDesc(p.seoDesc || "");
    setSeoKeywords(p.seoKeywords || "");
    setSeoImage(p.seoImage || null);
    setAutoSlug(false);
    setView("editor");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug) {
      toast.error("Title and slug are required");
      return;
    }
    
    const pageData = { title, slug, body, published, seoTitle, seoDesc, seoKeywords, seoImage };

    try {
      if (editId) {
        // Find existing page slug for updating
        const existingPage = pages.find(p => p.id === editId);
        if (existingPage) {
          await cmsPagesRepository.update(existingPage.slug, pageData);
          toast.success("Page successfully updated");
        }
      } else {
        await cmsPagesRepository.create(pageData);
        toast.success("New page published");
      }
      await fetchPages();
      setView("list");
    } catch (err) {
      console.error("Failed to save page:", err);
      toast.error("Failed to save page");
    }
  };

  const del = async (id: string) => { 
    if (confirm("Are you sure you want to delete this page?")) {
      try {
        const pageToDelete = pages.find(p => p.id === id);
        if (pageToDelete) {
          await cmsPagesRepository.delete(pageToDelete.slug);
          toast.success("Page deleted"); 
          await fetchPages();
        }
      } catch (err) {
        console.error("Failed to delete page:", err);
        toast.error("Failed to delete page");
      }
    }
  };

  if (isLoading && view === "list") {
    return <SectionLoader />;
  }

  if (view === "editor") {
    return (
      <form onSubmit={save} className="space-y-6 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Button type="button" variant="ghost" size="icon" onClick={() => setView("list")} className="-ml-2"><ArrowLeft className="h-5 w-5" /></Button>
              <h1 className="text-3xl font-bold tracking-tight">{editId ? "Edit Page" : "New Dynamic Page"}</h1>
              {published && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Published
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm ml-11">Design your custom page using blocks and optimize it for SEO.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" className="gap-2 shadow-sm" onClick={() => window.open(`/${slug}`, '_blank')}>
              <Eye className="h-4 w-4" /> Preview
            </Button>
            <Button type="submit" className="gap-2 shadow-sm">
              <Save className="h-4 w-4" /> Save Page
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-muted-foreground/10 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-lg">Page Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. About Us, Shipping Policy..." className="text-lg h-12" required />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="font-semibold">URL Slug</Label>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Auto-generate</Label>
                      <Switch checked={autoSlug} onCheckedChange={setAutoSlug} className="scale-75 origin-right" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-muted/50 border rounded-md px-3 py-1">
                    <span className="text-muted-foreground whitespace-nowrap text-sm">{getClientBaseUrl().replace(/^https?:\/\//, "")}/</span>
                    <input 
                      value={slug} 
                      onChange={e => { setSlug(e.target.value); setAutoSlug(false); }}
                      className="bg-transparent border-0 outline-none w-full text-sm py-1"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-muted-foreground/10 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-lg">Canvas Editor</CardTitle>
                <CardDescription>
                  Build your page visually using the <strong className="text-foreground">UI Blocks</strong> tool.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="min-h-[600px]">
                  <RichTextEditor value={body} onChange={setBody} placeholder="Start building your page..." />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Settings */}
          <div className="space-y-6">
            <Card className="border-muted-foreground/10 shadow-sm sticky top-6">
              <CardHeader className="bg-muted/30 border-b pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Visibility</CardTitle>
                  <CardDescription>Publishing status</CardDescription>
                </div>
                <Switch checked={published} onCheckedChange={setPublished} />
              </CardHeader>
              <CardContent className="pt-6 border-b">
                <p className="text-sm text-muted-foreground">
                  {published ? "This page is live and visible to customers." : "This page is hidden as a draft."}
                </p>
              </CardContent>

              <CardHeader className="bg-muted/10 border-b pb-4">
                <CardTitle className="text-lg">SEO Meta Tags</CardTitle>
                <CardDescription>Configure search visibility</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
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
                  <Textarea value={seoDesc} onChange={e => setSeoDesc(e.target.value)} placeholder="Brief description..." rows={3} className="bg-muted/30 resize-none" />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Meta Keywords</Label>
                  <Input value={seoKeywords} onChange={e => setSeoKeywords(e.target.value)} placeholder="comma separated..." className="bg-muted/30" />
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
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dynamic Pages</h1>
          <p className="text-muted-foreground">Create and manage custom pages for your store</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> New Page</Button>
      </div>
      
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="px-4 py-3 text-left font-semibold">Title</th>
            <th className="px-4 py-3 text-left font-semibold">Slug</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
            <th className="px-4 py-3 text-left font-semibold">Updated</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr></thead>
          <tbody>{pages.map((p) => (
            <tr key={p.id} className="border-t hover:bg-muted/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium cursor-pointer hover:underline" onClick={() => openEdit(p)}>{p.title}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                  <LinkIcon className="h-3 w-3" /> /{p.slug}
                </a>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {p.published ? "Published" : "Draft"}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{p.updatedAt}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </td>
            </tr>
          ))}
          {pages.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No pages found. Create one!</td></tr>
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CMSPages;