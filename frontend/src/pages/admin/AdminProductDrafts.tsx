import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Pencil, Trash2, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAdmin } from "@/context/AdminContext";
import { resolveImgUrl } from "@/utils/image";
import { getApiV1Url } from "@/utils/endpoints";

interface Draft {
  id: string;
  name: string | null;
  status: string;
  batchId: string | null;
  error: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

const AdminProductDrafts = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const batchFilter = searchParams.get("batch");
  const { hasPermission } = useAdmin();

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const apiUrl = getApiV1Url();
  const authHeaders = { Authorization: `Bearer ${localStorage.getItem("admin_token")}`, "Content-Type": "application/json" };

  const loadDrafts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/ai/drafts?status=draft`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        let list: Draft[] = data.drafts || [];
        if (batchFilter) list = list.filter((d) => d.batchId === batchFilter);
        setDrafts(list);
      }
    } catch {
      toast.error(t("admin_drafts.load_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, [batchFilter]);

  const deleteDraft = async (id: string) => {
    if (!window.confirm(t("admin_drafts.confirm_delete"))) return;
    try {
      await fetch(`${apiUrl}/ai/drafts/${id}`, { method: "DELETE", headers: authHeaders });
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.success(t("admin_drafts.deleted"));
    } catch {
      toast.error(t("admin_drafts.delete_failed"));
    }
  };

  if (!hasPermission("products") && !hasPermission("ai")) {
    return <p className="text-center py-12 text-muted-foreground">{t("admin_product_form.no_permission")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => navigate("/admin/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("admin_drafts.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("admin_drafts.subtitle")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={loadDrafts}>
            <RefreshCw className="h-4 w-4" /> {t("admin_drafts.refresh")}
          </Button>
          <Button size="sm" className="gap-2" onClick={() => navigate("/admin/products/quick-add")}>
            <Sparkles className="h-4 w-4" /> {t("admin_drafts.new_quick_add")}
          </Button>
        </div>
      </div>

      {batchFilter && (
        <p className="text-sm text-primary">{t("admin_drafts.batch_filter", { id: batchFilter.slice(0, 8) })}</p>
      )}

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">{t("admin_drafts.th_product")}</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">{t("admin_drafts.th_price")}</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">{t("admin_drafts.th_date")}</th>
              <th className="px-4 py-3 text-right">{t("admin_drafts.th_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-3"><Skeleton className="h-10 w-48" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20 ml-auto" /></td>
                </tr>
              ))
            ) : drafts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                  {t("admin_drafts.empty")}
                </td>
              </tr>
            ) : (
              drafts.map((d) => {
                const p = d.payload || {};
                const img = (p.image as string) || "";
                return (
                  <tr key={d.id} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {img && (
                          <img src={resolveImgUrl(img)} alt="" className="h-10 w-10 rounded object-cover bg-muted" />
                        )}
                        <div>
                          <p className="font-medium">{d.name || (p.name as string) || t("admin_drafts.untitled")}</p>
                          {d.error && <p className="text-xs text-destructive">{d.error}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">€{p.price ?? "—"}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/products/drafts/${d.id}`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteDraft(d.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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

export default AdminProductDrafts;
