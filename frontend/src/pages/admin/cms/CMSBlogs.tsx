import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { MediaLibraryDialog } from "@/components/admin/media/MediaLibraryDialog";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { initialBlogs, Blog } from "@/data/blogs";
import { blogRepository } from "@/client/apiClient";
import { normalizeUploadedUrl } from "@/utils/image";

const CMSBlogs = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [edit, setEdit] = useState<Blog | null>(null);
  const [form, setForm] = useState<Omit<Blog, "id" | "date">>({ title: "", slug: "", excerpt: "", body: "", cover: null, author: "", published: true });
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

  const fetchBlogs = async () => {
    try {
      const res = await blogRepository.getAll();
      if (res.success && res.blogs) {
        setBlogs(res.blogs);
      }
    } catch (e) {
      // Fallback
      const saved = localStorage.getItem("blogs_data");
      if (saved) {
        try { setBlogs(JSON.parse(saved)); } catch { setBlogs(initialBlogs); }
      } else {
        setBlogs(initialBlogs);
        localStorage.setItem("blogs_data", JSON.stringify(initialBlogs));
      }
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const openNew = () => { setEdit(null); setForm({ title: "", slug: "", excerpt: "", body: "", cover: null, author: "", published: true }); setIsEditorOpen(true); };
  const openEdit = (b: Blog) => { setEdit(b); setForm({ title: b.title, slug: b.slug, excerpt: b.excerpt, body: b.body, cover: b.cover, author: b.author, published: b.published }); setIsEditorOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (edit) {
        await blogRepository.update(edit.id, form);
        toast.success("Blog updated successfully");
      } else {
        await blogRepository.create(form);
        toast.success("Blog created successfully");
      }
      fetchBlogs();
      setIsEditorOpen(false);
    } catch (err) {
      // Local Storage Fallback
      let updated: Blog[] = [];
      if (edit) {
        updated = blogs.map((b) => (b.id === edit.id ? { ...b, ...form, date: today } : b));
        toast.success("Blog updated (Local Mode)");
      } else {
        updated = [...blogs, { id: Date.now().toString(), ...form, date: today }];
        toast.success("Blog created (Local Mode)");
      }
      setBlogs(updated);
      localStorage.setItem("blogs_data", JSON.stringify(updated));
      setIsEditorOpen(false);
    }
  };

  const del = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this blog?")) {
      try {
        await blogRepository.delete(id);
        toast.success("Blog deleted successfully");
        fetchBlogs();
      } catch (err) {
        const updated = blogs.filter((b) => b.id !== id);
        setBlogs(updated);
        localStorage.setItem("blogs_data", JSON.stringify(updated));
        toast.success("Blog deleted (Local Mode)");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Blogs</h1>
          <p className="text-muted-foreground">Write and manage blog articles</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> New Post</Button>
      </div>
      {isEditorOpen && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{edit ? "Edit Post" : "New Post"}</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditorOpen(false)}>Close</Button>
          </div>
          <form onSubmit={save} className="space-y-4 mt-4">
            <div>
              <Label>Cover image</Label>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-24 w-40 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {form.cover ? <img src={form.cover} alt="" className="h-full w-full object-cover" /> : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Upload className="h-6 w-6" /></div>
                  )}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsMediaLibraryOpen(true)} className="gap-2"><Upload className="h-4 w-4" /> {form.cover ? "Change" : "Browse Media"}</Button>
              </div>
            </div>
            <MediaLibraryDialog
              open={isMediaLibraryOpen}
              onOpenChange={setIsMediaLibraryOpen}
              onSelect={(url) => {
                setForm((p) => ({ ...p, cover: normalizeUploadedUrl(url) }));
                setIsMediaLibraryOpen(false);
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" required /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1" required /></div>
            </div>
            <div><Label>Author</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="mt-1" /></div>
            <div><Label>Excerpt</Label><Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="mt-1" rows={2} /></div>
            <div>
              <Label>Body</Label>
              <div className="mt-1">
                <RichTextEditor
                  value={form.body}
                  onChange={(val) => setForm({ ...form, body: val })}
                  placeholder="Write the full article here..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /><Label>Published</Label></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button><Button type="submit">{edit ? "Update" : "Create"}</Button></div>
          </form>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {blogs.map((b) => (
          <div key={b.id} className="rounded-xl border overflow-hidden bg-card">
            <div className="aspect-video bg-muted">
              {b.cover ? <img src={b.cover} alt={b.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground text-xs">No cover</div>}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{b.published ? "Published" : "Draft"}</span>
                <span className="text-xs text-muted-foreground">{b.date}</span>
              </div>
              <h3 className="mt-2 font-semibold line-clamp-2">{b.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{b.excerpt}</p>
              <p className="mt-2 text-xs text-muted-foreground">By {b.author || "—"}</p>
              <div className="mt-3 flex gap-1">
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEdit(b)}><Pencil className="h-3 w-3" /> Edit</Button>
                <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => del(b.id)}><Trash2 className="h-3 w-3" /> Delete</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CMSBlogs;