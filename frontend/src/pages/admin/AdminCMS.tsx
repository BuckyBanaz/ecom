import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type CMSPage = { id: string; title: string; slug: string; status: "published" | "draft"; updatedAt: string };

const demoPages: CMSPage[] = [
  { id: "c1", title: "About Us", slug: "/about", status: "published", updatedAt: "2025-04-20" },
  { id: "c2", title: "Privacy Policy", slug: "/privacy", status: "published", updatedAt: "2025-04-18" },
  { id: "c3", title: "Terms & Conditions", slug: "/terms", status: "published", updatedAt: "2025-04-15" },
  { id: "c4", title: "Shipping Information", slug: "/shipping-info", status: "published", updatedAt: "2025-04-10" },
  { id: "c5", title: "Summer Sale Landing", slug: "/summer-sale", status: "draft", updatedAt: "2025-04-25" },
  { id: "c6", title: "Blog: LED vs Halogen", slug: "/blog/led-vs-halogen", status: "draft", updatedAt: "2025-04-22" },
];

const AdminCMS = () => {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPage, setEditPage] = useState<CMSPage | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(editPage ? t("admin_cms.toast_updated") : t("admin_cms.toast_created"));
    setDialogOpen(false);
    setEditPage(null);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("admin_cms.title")}</h1>
          <p className="text-muted-foreground">{t("admin_cms.subtitle")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditPage(null); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full gap-2"><Plus className="h-4 w-4" /> {t("admin_cms.button_new")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editPage ? t("admin_cms.dialog_title_edit") : t("admin_cms.dialog_title_new")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div><Label>{t("admin_cms.label_title")}</Label><Input defaultValue={editPage?.title} className="mt-1" required /></div>
              <div><Label>{t("admin_cms.label_slug")}</Label><Input defaultValue={editPage?.slug} className="mt-1" required /></div>
              <div><Label>{t("admin_cms.label_content")}</Label><textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" rows={8} placeholder={t("admin_cms.placeholder_content")} /></div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked={editPage?.status === "published"} />
                <Label>{t("admin_cms.label_published")}</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditPage(null); }}>{t("admin_cms.button_cancel")}</Button>
                <Button type="submit">{editPage ? t("admin_cms.button_update") : t("admin_cms.button_create")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 space-y-3">
        {demoPages.map((page) => (
          <div key={page.id} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{page.title}</p>
              <p className="text-xs text-muted-foreground">{page.slug} · {t("admin_cms.updated_text", { date: page.updatedAt })}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${page.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {page.status === "published" ? t("admin_cms.status_published") : t("admin_cms.status_draft")}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" title={t("admin_cms.button_preview")}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditPage(page); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => toast.success(t("admin_cms.toast_deleted", { title: page.title }))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCMS;