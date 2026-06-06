import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "sonner";
import { productRepository } from "@/client/apiClient";
import { resolveImgUrl } from "@/utils/image";
import { SafeImage } from "@/components/ui/SafeImage";

const AdminProducts = () => {
  const { hasPermission } = useAdmin();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [productsList, setProductsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const data = await productRepository.getAll();
        if (data.success && data.products) {
          setProductsList(data.products);
        } else {
          setProductsList([]);
        }
      } catch (err) {
        console.error("Failed to fetch products from API:", err);
        toast.error("Failed to load products from server");
        setProductsList([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filtered = productsList.filter((p) => {
    const nameStr = p.name || "";
    const brandStr = typeof p.brand === "object" ? p.brand?.name : p.brand;
    return (
      nameStr.toLowerCase().includes(search.toLowerCase()) ||
      (brandStr || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleDelete = async (p: any) => {
    if (!hasPermission("products")) {
      toast.error("Only admins can delete products");
      return;
    }
    if (window.confirm(`Delete "${p.name}"? This action cannot be undone.`)) {
      try {
        const data = await productRepository.delete(p.id);
        if (data.success) {
          toast.success(`Deleted "${p.name}" successfully`);
          setProductsList((prev) => prev.filter((x) => x.id !== p.id));
          return;
        } else {
          toast.error("Failed to delete product");
        }
      } catch (err) {
        console.error("Failed to delete product via API:", err);
        toast.error("Error communicating with server to delete product");
      }
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{productsList.length} products total</p>
        {hasPermission("products") && (
          <Button className="rounded-full gap-2" onClick={() => navigate("/admin/products/new")}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        )}
      </div>

      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="pl-10"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Product</th>
              <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Category</th>
              <th className="px-4 py-3 text-left font-semibold">Price</th>
              <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Stock</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              filtered.map((p) => {
                const brandName = typeof p.brand === "object" ? p.brand?.name : p.brand;
                const catName = typeof p.category === "object" ? p.category?.name : p.category;
                return (
                  <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <SafeImage src={p.image} alt={p.name} className="h-10 w-10 rounded-lg object-cover border" fallbackType="product" />
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{brandName || "Generic"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize hidden md:table-cell">{(catName || "").replace(/-/g, " ")}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">€{(p.price || 0).toFixed(2)}</span>
                      {p.oldPrice && (
                        <span className="ml-1 text-xs text-muted-foreground line-through">€{(p.oldPrice || 0).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.inStock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.inStock ? "In stock" : "Out of stock"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/admin/products/${p.id}/edit`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View Reviews"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          onClick={() => navigate(`/admin/products/${p.id}/reviews`)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(p)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProducts;