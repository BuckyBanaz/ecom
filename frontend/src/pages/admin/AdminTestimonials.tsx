import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Upload, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MediaLibraryDialog } from "@/components/admin/media/MediaLibraryDialog";
import { toast } from "sonner";

const STORAGE_KEY = "testimonials_data";

type Testimonial = {
  id: string;
  name: string;
  title: string;
  rating: number;
  message: string;
  avatar: string | null;
  published: boolean;
  date: string;
};

const emptyForm = {
  name: "",
  title: "",
  rating: 5,
  message: "",
  avatar: null as string | null,
  published: true,
};

const AdminTestimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Testimonial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTestimonials(JSON.parse(saved));
      } catch {
        setTestimonials([]);
      }
    }
  }, []);

  const persist = (next: Testimonial[]) => {
    setTestimonials(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const openNew = () => {
    setEdit(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (t: Testimonial) => {
    setEdit(t);
    setForm({
      name: t.name,
      title: t.title,
      rating: t.rating,
      message: t.message,
      avatar: t.avatar,
      published: t.published,
    });
    setOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) {
      toast.error("Name and message are required");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (edit) {
      const updated = testimonials.map((t) =>
        t.id === edit.id
          ? { ...t, ...form, rating: Number(form.rating), date: today }
          : t
      );
      persist(updated);
      toast.success("Testimonial updated");
    } else {
      const next: Testimonial = {
        id: Date.now().toString(),
        ...form,
        rating: Number(form.rating),
        date: today,
      };
      persist([next, ...testimonials]);
      toast.success("Testimonial added");
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    persist(testimonials.filter((t) => t.id !== id));
    toast.success("Testimonial deleted");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Testimonials</h1>
          <p className="text-muted-foreground">Manage customer reviews shown on the site.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> New Testimonial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{edit ? "Edit Testimonial" : "New Testimonial"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4 mt-4">
              <div>
                <Label>Avatar</Label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border bg-muted">
                    {form.avatar ? (
                      <img src={form.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsMediaLibraryOpen(true)} className="gap-2">
                    <Upload className="h-4 w-4" /> {form.avatar ? "Change" : "Browse Media"}
                  </Button>
                </div>
              </div>

              <MediaLibraryDialog
                open={isMediaLibraryOpen}
                onOpenChange={setIsMediaLibraryOpen}
                onSelect={(url) => {
                  setForm((prev) => ({ ...prev, avatar: url.startsWith("http") ? url : `http://localhost:5000${url}` }));
                  setIsMediaLibraryOpen(false);
                }}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" required />
                </div>
                <div>
                  <Label>Title / Role</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="e.g. Interior Designer" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Rating</Label>
                  <select
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} Stars
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
                  <Label>Published</Label>
                </div>
              </div>

              <div>
                <Label>Message</Label>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="mt-1 min-h-[140px]" required />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">{edit ? "Update" : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
            No testimonials yet. Click "New Testimonial" to add one.
          </div>
        ) : (
          testimonials.map((t) => (
            <div key={t.id} className="rounded-xl border bg-card p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-full border bg-muted">
                  {t.avatar ? (
                    <img src={t.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">No image</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.title || "—"}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {t.published ? "Published" : "Draft"}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-1 text-amber-500">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>

              <p className="mt-3 text-sm text-muted-foreground line-clamp-4">{t.message}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t.date}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEdit(t)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => remove(t.id)}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminTestimonials;
