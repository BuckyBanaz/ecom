import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PackageOpen, Search, Loader2, RefreshCw, ExternalLink, PlusCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { returnsRepository } from "@/client/apiClient";
import { toast } from "sonner";

type ReturnRecord = {
  id: string;
  orderId: string;
  status: string;
  resolutionType?: string | null;
  replacementOrderId?: string | null;
  order?: { orderNumber: string; customerName?: string; customerEmail?: string; total?: number };
  user?: { name: string; email: string };
};

export default function AdminReplacements() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await returnsRepository.getAll();
      if (res.success && res.data) {
        const replacementReturns = res.data.filter(
          (r: ReturnRecord) => r.resolutionType === "replacement"
        );
        setReturns(replacementReturns);
      }
    } catch {
      toast.error("Failed to load returns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateOrder = async (id: string) => {
    if (!window.confirm("Create a 0-cost replacement order for this return?")) return;
    try {
      setProcessingId(id);
      const res = await returnsRepository.createReplacementOrder(id);
      if (res.success) {
        toast.success("Replacement order created successfully!");
        await load();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create replacement order");
    } finally {
      setProcessingId(null);
    }
  };

  const filterRows = (rows: ReturnRecord[]) => {
    const q = search.toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.order?.orderNumber?.toLowerCase().includes(q) ||
        r.user?.email?.toLowerCase().includes(q) ||
        r.order?.customerEmail?.toLowerCase().includes(q)
    );
  };

  const filtered = filterRows(returns);
  const pendingReplacements = filtered.filter((r) => !r.replacementOrderId);
  const createdReplacements = filtered.filter((r) => r.replacementOrderId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <PackageOpen className="h-6 w-6 text-primary" />
            Replacement Orders
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage replacement shipments for received returns.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order or email..."
          className="pl-10 h-10 text-xs rounded-lg"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">

          {/* Pending Replacements */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[10px] text-orange-700">
                {pendingReplacements.length}
              </span>
              Pending Replacement Orders (Awaiting Item Return)
            </h3>
            {pendingReplacements.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-muted-foreground text-sm">
                No pending replacements.
              </div>
            ) : (
              <div className="rounded-xl border bg-card overflow-x-auto overflow-y-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground text-xs">
                    <tr>
                      <th className="px-4 py-3 font-medium">Original Order</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pendingReplacements.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium">{r.order?.orderNumber}</td>
                        <td className="px-4 py-3">
                          <p>{r.user?.name || r.order?.customerName}</p>
                          <p className="text-xs text-muted-foreground">{r.user?.email || r.order?.customerEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded w-max text-xs border border-amber-200">
                            {r.status === "awaiting_return" ? "Waiting for customer to return" : "Waiting for label"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {createdReplacements.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-[10px] text-green-700">
                  {createdReplacements.length}
                </span>
                Generated Replacement Orders
              </h3>
              <div className="rounded-xl border bg-card overflow-x-auto overflow-y-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground text-xs">
                    <tr>
                      <th className="px-4 py-3 font-medium">Original Order</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Replacement Order</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {createdReplacements.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium">{r.order?.orderNumber}</td>
                        <td className="px-4 py-3">
                          <p>{r.user?.name || r.order?.customerName}</p>
                          <p className="text-xs text-muted-foreground">{r.user?.email || r.order?.customerEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded w-max">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Created
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full gap-1.5 text-xs h-7"
                            onClick={() => navigate(`/admin/orders/${r.replacementOrderId}`)}
                          >
                            <ExternalLink className="h-3 w-3" /> View Order
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
