import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories as initialCategories, Category } from "@/data/categories";
import { products } from "@/data/products";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { megaMenuData } from "@/data/megaMenu";
import axios from "axios";

const API_URL = "http://localhost:5000/api/v1/megamenus";

const AdminCategories = () => {
  const { hasPermission } = useAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<string>("");

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
        const response = await axios.get("http://localhost:5000/api/v1/categories");
        if (response.data.success && response.data.categories) {
          const apiCats = response.data.categories;
          const mappedCats = apiCats.map((c: any) => {
            if (groupMapping[c.group]) {
              return { ...c, group: groupMapping[c.group] };
            }
            return c;
          });
          setCategoriesList(mappedCats);
          localStorage.setItem("categories_data", JSON.stringify(mappedCats));
        }
      } catch (error) {
        console.error("Failed to fetch categories from API, loading local backup", error);
        const savedCats = localStorage.getItem("categories_data");
        let loadedCats = initialCategories;
        if (savedCats) {
          try {
            loadedCats = JSON.parse(savedCats);
          } catch (e) {
            loadedCats = initialCategories;
          }
        }
        const mappedCats = loadedCats.map((c: any) => {
          if (groupMapping[c.group]) {
            return { ...c, group: groupMapping[c.group] };
          }
          return c;
        });
        setCategoriesList(mappedCats);
      }
    };

    // Load menus from backend API
    const loadMenus = async () => {
      try {
        const response = await axios.get(API_URL);
        if (response.data.success && response.data.menus) {
          setMenus(response.data.menus);
        } else {
          loadFromLocalstorage();
        }
      } catch (error) {
        console.error("Failed to fetch menus from API", error);
        loadFromLocalstorage();
      }
    };

    const loadFromLocalstorage = () => {
      const savedMenus = localStorage.getItem("mega_menu_data");
      if (savedMenus) {
        try {
          setMenus(JSON.parse(savedMenus));
        } catch (e) {
          setMenus(megaMenuData);
        }
      } else {
        setMenus(megaMenuData);
      }
    };

    loadCategories();
    loadMenus();
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
      // Edit existing
      try {
        const catId = (editCat as any).id;
        const matchedDbCat = categoriesList.find((c) => c.slug === editCat.slug);
        const actualId = catId || (matchedDbCat as any)?.id;

        let response;
        if (actualId) {
          response = await axios.put(`http://localhost:5000/api/v1/categories/${actualId}`, {
            name,
            slug,
            image,
            group,
          });
        } else {
          // If no DB ID is found, fallback to creating it
          response = await axios.post("http://localhost:5000/api/v1/categories", {
            name,
            slug,
            image,
            group,
          });
        }

        const updatedCat = response.data.category;
        const updated = categoriesList.map((c) =>
          c.slug === editCat.slug ? updatedCat : c
        );
        setCategoriesList(updated);
        localStorage.setItem("categories_data", JSON.stringify(updated));
        toast.success("Category updated successfully");
      } catch (error) {
        console.error("Failed to update category on backend", error);
        // Fallback to local update
        const updated = categoriesList.map((c) =>
          c.slug === editCat.slug ? { ...c, name, slug, image, group } : c
        );
        setCategoriesList(updated);
        localStorage.setItem("categories_data", JSON.stringify(updated));
        toast.success("Category updated locally");
      }
    } else {
      // Add new
      try {
        const response = await axios.post("http://localhost:5000/api/v1/categories", {
          name,
          slug,
          image,
          group,
        });
        const newCat = response.data.category;
        const updated = [...categoriesList, newCat];
        setCategoriesList(updated);
        localStorage.setItem("categories_data", JSON.stringify(updated));
        toast.success("Category added successfully");
      } catch (error) {
        console.error("Failed to create category on backend", error);
        // Fallback to local save
        const updated = [...categoriesList, { name, slug, image, group }];
        setCategoriesList(updated);
        localStorage.setItem("categories_data", JSON.stringify(updated));
        toast.success("Category added locally");
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
          await axios.delete(`http://localhost:5000/api/v1/categories/${catId}`);
        }
        const updated = categoriesList.filter((c) => c.slug !== slug);
        setCategoriesList(updated);
        localStorage.setItem("categories_data", JSON.stringify(updated));
        toast.success("Category deleted successfully");
      } catch (error) {
        console.error("Failed to delete category from backend", error);
        // Fallback to local delete
        const updated = categoriesList.filter((c) => c.slug !== slug);
        setCategoriesList(updated);
        localStorage.setItem("categories_data", JSON.stringify(updated));
        toast.success("Category deleted locally");
      }
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">{categoriesList.length} categories</p>
        </div>
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
                        src={imagePreview}
                        alt="Preview"
                        className="h-16 w-16 rounded-lg object-cover border bg-muted"
                      />
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setImagePreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="cursor-pointer"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Choose a local image file.
                      </p>
                    </div>
                  </div>
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
        {categoriesList.map((c) => {
          const count = products.filter((p) => p.category === c.slug).length;
          const matchedMenu = menus.find((m) => m.slug === c.group);
          const menuLabel = matchedMenu ? matchedMenu.menu : c.group;

          return (
            <div key={c.slug} className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <img src={c.image} alt={c.name} className="h-40 w-full object-cover" />
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
        })}
      </div>
    </div>
  );
};

export default AdminCategories;