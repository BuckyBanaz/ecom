import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Search, MessageSquare, Eye, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "sonner";
import { productRepository, adminSettingsRepository } from "@/client/apiClient";
import { resolveImgUrl } from "@/utils/image";
import { SafeImage } from "@/components/ui/SafeImage";

const AdminProducts = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAdmin();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [productsList, setProductsList] = useState<any[]>([]);
  const [totalServerCount, setTotalServerCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      // Fetch with limit: 500 so all products in the catalog are loaded for admin management
      const data = await productRepository.getAll({ limit: 500 });
      if (data.success && data.products) {
        setProductsList(data.products);
        setTotalServerCount(data.pagination?.totalItems ?? data.products.length);
      } else {
        setProductsList([]);
        setTotalServerCount(0);
      }
    } catch (err) {
      console.error("Failed to fetch products from API:", err);
      toast.error(t("admin_products.toast_load_failed"));
      setProductsList([]);
      setTotalServerCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchAiStatus = async () => {
      try {
        const res = await adminSettingsRepository.getAiSettings();
        if (res.success && res.data) {
          setAiEnabled(res.data.enabled);
        }
      } catch (err) {
        console.error("Failed to fetch AI settings", err);
      }
    };
    
    fetchProducts();
    fetchAiStatus();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  const filtered = productsList.filter((p) => {
    const nameStr = p.name || "";
    const brandStr = typeof p.brand === "object" ? p.brand?.name : p.brand;
    const catStr = typeof p.category === "object" ? p.category?.name : p.category;
    const q = search.toLowerCase();
    return (
      nameStr.toLowerCase().includes(q) ||
      (brandStr || "").toLowerCase().includes(q) ||
      (catStr || "").toLowerCase().includes(q)
    );
  });

  const totalPages = pageSize === -1 ? 1 : Math.ceil(filtered.length / pageSize) || 1;
  const paginatedProducts = pageSize === -1 ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDelete = async (p: any) => {
    if (!hasPermission("products")) {
      toast.error(t("admin_products.toast_no_permission_delete"));
      return;
    }
    if (window.confirm(t("admin_products.confirm_delete", { name: p.name }))) {
      try {
        const data = await productRepository.delete(p.id);
        if (data.success) {
          toast.success(t("admin_products.toast_deleted", { name: p.name }));
          setProductsList((prev) => prev.filter((x) => x.id !== p.id));
          setTotalServerCount((prev) => Math.max(0, prev - 1));
          return;
        } else {
          toast.error(t("admin_products.toast_delete_failed"));
        }
      } catch (err) {
        console.error("Failed to delete product via API:", err);
        toast.error(t("admin_products.toast_delete_error"));
      }
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground font-medium">
            {t("admin_products.total_count", { count: totalServerCount || productsList.length })}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Refresh products"
            onClick={fetchProducts}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        {hasPermission("products") && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
              onClick={() => navigate("/admin/products/quick-add")}
            >
              <span className="text-base leading-none">✨</span> Quick Add (AI)
            </Button>
            <Button
              variant="outline"
              className="rounded-full gap-2"
              onClick={() => navigate("/admin/product-drafts")}
            >
              Drafts
            </Button>
            <Button className="rounded-full gap-2" onClick={() => navigate("/admin/products/new")}>
              <Plus className="h-4 w-4" /> {t("admin_products.add_product")}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin_products.search_placeholder")}
          className="pl-10"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">{t("admin_products.th_product")}</th>
              <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">{t("admin_products.th_category")}</th>
              <th className="px-4 py-3 text-left font-semibold">{t("admin_products.th_price")}</th>
              <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">{t("admin_products.th_stock")}</th>
              <th className="px-4 py-3 text-right font-semibold">{t("admin_products.th_actions")}</th>
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
            ) : paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                  {search.trim() ? "No products matching your search." : "No products found."}
                </td>
              </tr>
            ) : (
              paginatedProducts.map((p) => {
                const brandName = typeof p.brand === "object" ? p.brand?.name : p.brand;
                const catName = typeof p.category === "object" ? p.category?.name : p.category;
                return (
                  <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <SafeImage src={p.image} alt={p.name} className="h-10 w-10 rounded-lg object-cover border" fallbackType="product" />
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{brandName || t("admin_products.brand_fallback")}</p>
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
                        {p.inStock ? t("admin_products.in_stock") : t("admin_products.out_of_stock")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={t("admin_products.action_edit")}
                          onClick={() => navigate(`/admin/products/${p.id}/edit`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("admin_products.action_view", { defaultValue: "View Product" })}
                          className="h-8 w-8 text-green-600 hover:bg-green-50"
                          onClick={() => window.open(`/product/${p.slug || p.id}`, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("admin_products.action_view_reviews")}
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          onClick={() => navigate(`/admin/products/${p.id}/reviews`)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          title={t("admin_products.action_delete")}
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

      {/* Pagination Footer */}
      {!isLoading && filtered.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>All ({filtered.length})</option>
            </select>
            <span>
              Showing {pageSize === -1 ? 1 : Math.min((currentPage - 1) * pageSize + 1, filtered.length)}–
              {pageSize === -1 ? filtered.length : Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
            </span>
          </div>

          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;