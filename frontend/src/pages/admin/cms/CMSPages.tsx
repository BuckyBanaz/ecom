import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

type Page = { id: string; title: string; slug: string; body: string; published: boolean; updatedAt: string };

const initial: Page[] = [
  { id: "1", title: "About Us", slug: "about", body: "Our story...", published: true, updatedAt: "2025-04-12" },
  { id: "2", title: "Shipping Info", slug: "shipping", body: "Delivery details...", published: true, updatedAt: "2025-04-20" },
  { id: "3", title: "Returns", slug: "returns", body: "30-day returns...", published: true, updatedAt: "2025-05-01" },
  { id: "4", title: "Contact", slug: "contact", body: "Get in touch...", published: false, updatedAt: "2025-05-08" },
];

const CMSPages = () => {
  const [pages, setPages] = useState<Page[]>(initial);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Page | null>(null);
  const [form, setForm] = useState<Omit<Page, "id" | "updatedAt">>({ title: "", slug: "", body: "", published: true });

  const openNew = () => { setEdit(null); setForm({ title: "", slug: "", body: "", published: true }); setOpen(true); };
  const openEdit = (p: Page) => { setEdit(p); setForm({ title: p.title, slug: p.slug, body: p.body, published: p.published }); setOpen(true); };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    if (edit) {
      setPages(pages.map((p) => (p.id === edit.id ? { ...p, ...form, updatedAt: today } : p)));
      toast.success("Page updated");
    } else {
      setPages([...pages, { id: Date.now().toString(), ...form, updatedAt: today }]);
      toast.success("Page created");
    }
    setOpen(false);
  };

  const del = (id: string) => { setPages(pages.filter((p) => p.id !== id)); toast.success("Page deleted"); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dynamic Pages</h1>
          <p className="text-muted-foreground">Create and manage custom pages</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> New Page</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{edit ? "Edit Page" : "New Page"}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" required /></div>
                <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1" required /></div>
              </div>
              <div><Label>Body</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="mt-1 min-h-[200px]" /></div>
              <div className="flex items-center gap-2"><Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /><Label>Published</Label></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">{edit ? "Update" : "Create"}</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto rounded-xl border">
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
              <td className="px-4 py-3"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{p.title}</span></div></td>
              <td className="px-4 py-3 text-muted-foreground">/{p.slug}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{p.published ? "Published" : "Draft"}</span></td>
              <td className="px-4 py-3 text-muted-foreground">{p.updatedAt}</td>
              <td className="px-4 py-3 text-right"><div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
};

export default CMSPages;