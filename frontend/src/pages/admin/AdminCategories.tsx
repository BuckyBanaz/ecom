import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Category } from "@/data/categories";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { categoryRepository, megaMenuRepository } from "@/client/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaLibraryDialog } from "@/components/admin/media/MediaLibraryDialog";
import { resolveImgUrl } from "@/utils/image";
import { SafeImage } from "@/components/ui/SafeImage";

const AdminCategories = () => {
  const { hasPermission } = useAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const groupMapping: Record<string, string> = {
      "indoor": "interior-lighting",
      "outdoor": "outdoor-lighting",
      "smart": "light-sources",
      "bulbs": "light-sources",
      "business": "commercial-lighting",
      "accessories": "interior-lighting"
    };

    const loadCategories = async () => {
      try {
        const data = await categoryRepository.getAll();
        if (data.success && data.categories) {
          const apiCats = data.categories;
          const mappedCats = apiCats.map((c: any) => {
            if (groupMapping[c.group]) {
              return { ...c, group: groupMapping[c.group] };
            }
            return c;
          });
          setCategoriesList(mappedCats);
        }
      } catch (error) {
        console.error("Failed to fetch categories from API", error);
        toast.error("Failed to load categories from server");
        setCategoriesList([]);
      }
    };

    const loadMenus = async () => {
      try {
        const data = await megaMenuRepository.getAll();
        if (data.success && data.menus) {
          setMenus(data.menus);
        } else {
          setMenus([]);
        }
      } catch (error) {
        console.error("Failed to fetch menus from API", error);
        setMenus([]);
      }
    };

    const init = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadCategories(), loadMenus()]);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (editCat) {
      setImagePreview(editCat.image);
    } else {
      setImagePreview("");
    }
  }, [editCat, dialogOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const group = formData.get("group") as string;
    const image = imagePreview;

    if (!image) {
      toast.error("Please upload an image first!");
      return;
    }

    if (editCat) {
      try {
        const catId = (editCat as any).id;
        const matchedDbCat = categoriesList.find((c) => c.slug === editCat.slug);
        const actualId = catId || (matchedDbCat as any)?.id;

        let data;
        if (actualId) {
          data = await categoryRepository.update(actualId, {
            name,
            slug,
            image,
            group,
          });
        } else {
          data = await categoryRepository.create({
            name,
            slug,
            image,
            group,
          });
        }

        const updatedCat = data.category;
        const updated = categoriesList.map((c) =>
          c.slug === editCat.slug ? updatedCat : c
        );
        setCategoriesList(updated);
        toast.success("Category updated successfully");
      } catch (error) {
        console.error("Failed to update category on backend", error);
        toast.error("Failed to update category on server");
      }
    } else {
      try {
        const data = await categoryRepository.create({
          name,
          slug,
          image,
          group,
        });
        const newCat = data.category;
        const updated = [...categoriesList, newCat];
        setCategoriesList(updated);
        toast.success("Category added successfully");
      } catch (error) {
        console.error("Failed to create category on backend", error);
        toast.error("Failed to add category to server");
      }
    }

    setDialogOpen(false);
    setEditCat(null);
  };

  const handleDelete = async (slug: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete category "${name}"?`)) {
      const catToDelete = categoriesList.find((c) => c.slug === slug);
      const catId = (catToDelete as any)?.id;

      try {
        if (catId) {
          await categoryRepository.delete(catId);
        }
        const updated = categoriesList.filter((c) => c.slug !== slug);
        setCategoriesList(updated);
        toast.success("Category deleted successfully");
      } catch (error) {
        console.error("Failed to delete category from backend", error);
        toast.error("Failed to delete category from server");
      }
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{categoriesList.length} categories</p>
        {hasPermission("admin") && (
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditCat(null); }}>
            <DialogTrigger asChild>
              <Button className="rounded-full gap-2"><Plus className="h-4 w-4" /> Add Category</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editCat ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 mt-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    name="name"
                    defaultValue={editCat?.name}
                    onChange={(e) => {
                      if (!editCat) {
                        const slugEl = document.querySelector('input[name="slug"]') as HTMLInputElement;
                        if (slugEl) {
                          slugEl.value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
                        }
                      }
                    }}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input name="slug" defaultValue={editCat?.slug} className="mt-1" required />
                </div>
                <div>
                  <Label>Category Image</Label>
                  <div className="mt-1.5 flex items-center gap-4">
                    {imagePreview && (
                      <img
                        src={resolveImgUrl(imagePreview)}
                        alt="Preview"
                        className="h-16 w-16 rounded-lg object-cover border bg-muted"
                      />
                    )}
                    <div className="flex-1">
                      <Button type="button" variant="outline" className="w-full text-left justify-start" onClick={() => setIsMediaLibraryOpen(true)}>
                        {imagePreview ? "Change Image" : "Browse Media Storage"}
                      </Button>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Select an image from your media library.
                      </p>
                    </div>
                  </div>
                  <MediaLibraryDialog
                    open={isMediaLibraryOpen}
                    onOpenChange={setIsMediaLibraryOpen}
                    onSelect={(url) => {
                      setImagePreview(url.startsWith("http") ? url : `http://localhost:5000${url}`);
                      setIsMediaLibraryOpen(false);
                    }}
                  />
                </div>
                <div>
                  <Label>Menu</Label>
                  <select
                    name="group"
                    defaultValue={editCat?.group || (menus[0] ? menus[0].slug : "interior-lighting")}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    {menus.map((m) => (
                      <option key={m.slug} value={m.slug}>
                        {m.menu}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditCat(null); }}>Cancel</Button>
                  <Button type="submit">{editCat ? "Update" : "Create"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="overflow-hidden rounded-xl border bg-card shadow-sm space-y-4 pb-4">
              <Skeleton className="h-40 w-full rounded-t-xl rounded-b-none" />
              <div className="px-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5 flex-1 pr-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          categoriesList.map((c) => {
            const count = (c as any)._count?.products ?? 0;
            const matchedMenu = menus.find((m) => m.slug === c.group);
            const menuLabel = matchedMenu ? matchedMenu.menu : c.group;

            return (
              <div key={c.slug} className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <SafeImage src={c.image} alt={c.name} className="h-40 w-full object-cover" fallbackType="category" />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{c.name}</h3>
                      <p className="text-xs text-muted-foreground">{count} products · Menu: {menuLabel}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditCat(c); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {hasPermission("admin") && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.slug, c.name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminCategories;