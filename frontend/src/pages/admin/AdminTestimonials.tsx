import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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

  const openEdit = (item: Testimonial) => {
    setEdit(item);
    setForm({
      name: item.name,
      title: item.title,
      rating: item.rating,
      message: item.message,
      avatar: item.avatar,
      published: item.published,
    });
    setOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) {
      toast.error(t("admin_testimonials.toast_error_required"));
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (edit) {
      const updated = testimonials.map((item) =>
        item.id === edit.id
          ? { ...item, ...form, rating: Number(form.rating), date: today }
          : item
      );
      persist(updated);
      toast.success(t("admin_testimonials.toast_updated"));
    } else {
      const next: Testimonial = {
        id: Date.now().toString(),
        ...form,
        rating: Number(form.rating),
        date: today,
      };
      persist([next, ...testimonials]);
      toast.success(t("admin_testimonials.toast_added"));
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    persist(testimonials.filter((item) => item.id !== id));
    toast.success(t("admin_testimonials.toast_deleted"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> {t("admin_testimonials.button_new")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{edit ? t("admin_testimonials.dialog_title_edit") : t("admin_testimonials.dialog_title_new")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4 mt-4">
              <div>
                <Label>{t("admin_testimonials.label_avatar")}</Label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border bg-muted">
                    {form.avatar ? (
                      <img src={form.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                        {t("admin_testimonials.no_image")}
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsMediaLibraryOpen(true)} className="gap-2">
                    <Upload className="h-4 w-4" /> {form.avatar ? t("admin_testimonials.button_change") : t("admin_testimonials.button_browse")}
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
                  <Label>{t("admin_testimonials.label_name")}</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" required />
                </div>
                <div>
                  <Label>{t("admin_testimonials.label_title")}</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder={t("admin_testimonials.placeholder_role")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("admin_testimonials.label_rating")}</Label>
                  <select
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {t("admin_testimonials.rating_stars", { count: r })}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
                  <Label>{t("admin_testimonials.label_published")}</Label>
                </div>
              </div>

              <div>
                <Label>{t("admin_testimonials.label_message")}</Label>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="mt-1 min-h-[140px]" required />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("admin_testimonials.button_cancel")}</Button>
                <Button type="submit">{edit ? t("admin_testimonials.button_update") : t("admin_testimonials.button_create")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
            {t("admin_testimonials.empty_text")}
          </div>
        ) : (
          testimonials.map((item) => (
            <div key={item.id} className="rounded-xl border bg-card p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-full border bg-muted">
                  {item.avatar ? (
                    <img src={item.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">{t("admin_testimonials.no_image")}</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.title || "—"}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {item.published ? t("admin_testimonials.badge_published") : t("admin_testimonials.badge_draft")}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-1 text-amber-500">
                {Array.from({ length: item.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>

              <p className="mt-3 text-sm text-muted-foreground line-clamp-4">{item.message}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.date}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEdit(item)}>
                    <Pencil className="h-3 w-3" /> {t("admin_testimonials.button_edit")}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => remove(item.id)}>
                    <Trash2 className="h-3 w-3" /> {t("admin_testimonials.button_delete")}
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
