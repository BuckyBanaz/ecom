import { useState, useEffect, useCallback } from "react";

import { useTranslation } from "react-i18next";

import { useNavigate } from "react-router-dom";

import { CreditCard, Search, Loader2, RefreshCw, ExternalLink, Calendar, Truck, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { returnsRepository } from "@/client/apiClient";

import { toast } from "sonner";



type RefundRecord = {

  id: string;

  orderId: string;

  status: string;

  refundAmount?: number | null;

  stripeRefundId?: string | null;

  refundProcessedAt?: string | null;

  refundExpectedAt?: string | null;

  refundEtaDays?: string;

  returnCarrier?: string | null;

  returnTrackingNumber?: string | null;

  order?: { orderNumber: string; customerName?: string; customerEmail?: string; total?: number };

  user?: { name: string; email: string };

};



export default function AdminPaymentRefunds() {

  const { t } = useTranslation();

  const navigate = useNavigate();

  const [refunds, setRefunds] = useState<RefundRecord[]>([]);

  const [pending, setPending] = useState<RefundRecord[]>([]);

  const [loading, setLoading] = useState(true);

  const [processingId, setProcessingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");



  const load = useCallback(async () => {

    try {

      setLoading(true);

      const res = await returnsRepository.listRefunds();

      setRefunds(res.data || []);

      setPending(res.pending || []);

    } catch {

      toast.error(t("admin_refunds.toast_load_failed"));

    } finally {

      setLoading(false);

    }

  }, [t]);



  useEffect(() => {

    load();

  }, [load]);



  const handleManualRefund = async (id: string) => {

    if (!window.confirm(t("admin_refunds.confirm_manual_refund"))) return;

    try {

      setProcessingId(id);

      await returnsRepository.processRefund(id);

      toast.success(t("admin_refunds.toast_manual_refund"));

      await load();

    } catch (err: unknown) {

      toast.error(err instanceof Error ? err.message : t("admin_refunds.toast_refund_failed"));

    } finally {

      setProcessingId(null);

    }

  };



  const filterRows = (rows: RefundRecord[]) => {

    const q = search.toLowerCase();

    if (!q) return rows;

    return rows.filter(

      (r) =>

        r.order?.orderNumber?.toLowerCase().includes(q) ||

        r.stripeRefundId?.toLowerCase().includes(q) ||

        r.user?.email?.toLowerCase().includes(q) ||

        r.order?.customerEmail?.toLowerCase().includes(q),

    );

  };



  const filteredPending = filterRows(pending);

  const filteredProcessed = filterRows(refunds);



  return (

    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        <div>

          <h2 className="text-2xl font-semibold flex items-center gap-2">

            <CreditCard className="h-6 w-6 text-primary" />

            {t("admin_refunds.title")}

          </h2>

          <p className="text-sm text-muted-foreground mt-1">{t("admin_refunds.subtitle")}</p>

        </div>

        <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={load} disabled={loading}>

          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />

          {t("admin_refunds.refresh")}

        </Button>

      </div>



      <div className="relative max-w-md">

        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

        <Input

          value={search}

          onChange={(e) => setSearch(e.target.value)}

          placeholder={t("admin_refunds.search_placeholder")}

          className="pl-10 h-10 text-xs rounded-lg"

        />

      </div>



      {filteredPending.length > 0 && (

        <div className="space-y-3">

          <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-800">

            <AlertCircle className="h-4 w-4" />

            {t("admin_refunds.pending_title")} ({filteredPending.length})

          </h3>

          <div className="overflow-x-auto rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">

            <table className="w-full text-sm text-left">

              <thead>

                <tr className="border-b border-amber-200/60 text-muted-foreground text-xs">

                  <th className="p-4">{t("admin_refunds.col_order")}</th>

                  <th className="p-4">{t("admin_refunds.col_customer")}</th>

                  <th className="p-4">{t("admin_refunds.col_amount")}</th>

                  <th className="p-4">{t("admin_refunds.col_status")}</th>

                  <th className="p-4 text-right">{t("admin_refunds.col_actions")}</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-amber-200/40 text-xs">

                {filteredPending.map((r) => (

                  <tr key={r.id}>

                    <td className="p-4 font-mono font-bold">{r.order?.orderNumber}</td>

                    <td className="p-4">

                      <p className="font-medium">{r.user?.name || r.order?.customerName}</p>

                      <p className="text-muted-foreground">{r.user?.email || r.order?.customerEmail}</p>

                    </td>

                    <td className="p-4 font-semibold">€{(r.refundAmount ?? r.order?.total ?? 0).toFixed(2)}</td>

                    <td className="p-4 capitalize">{t(`returns.statuses.${r.status}`, { defaultValue: r.status })}</td>

                    <td className="p-4 text-right space-x-1">

                      <Button

                        size="sm"

                        className="h-7 rounded-full text-[10px] gap-1"

                        disabled={processingId === r.id}

                        onClick={() => handleManualRefund(r.id)}

                      >

                        {processingId === r.id ? (

                          <Loader2 className="h-3 w-3 animate-spin" />

                        ) : (

                          <CreditCard className="h-3 w-3" />

                        )}

                        {t("admin_refunds.process_refund")}

                      </Button>

                      <Button

                        size="sm"

                        variant="outline"

                        className="h-7 rounded-full text-[10px]"

                        onClick={() => navigate("/admin/orders/returns")}

                      >

                        {t("admin_refunds.manage_return")}

                      </Button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}



      <div className="space-y-3">

        <h3 className="text-sm font-semibold">{t("admin_refunds.processed_title")}</h3>

        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">

          <table className="w-full text-sm text-left">

            <thead>

              <tr className="border-b bg-muted/40 text-muted-foreground text-xs">

                <th className="p-4">{t("admin_refunds.col_order")}</th>

                <th className="p-4">{t("admin_refunds.col_customer")}</th>

                <th className="p-4">{t("admin_refunds.col_amount")}</th>

                <th className="p-4">{t("admin_refunds.col_stripe")}</th>

                <th className="p-4">{t("admin_refunds.col_eta")}</th>

                <th className="p-4">{t("admin_refunds.col_return_ship")}</th>

                <th className="p-4 text-right">{t("admin_refunds.col_actions")}</th>

              </tr>

            </thead>

            <tbody className="divide-y text-xs">

              {loading ? (

                <tr>

                  <td colSpan={7} className="p-12 text-center">

                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />

                  </td>

                </tr>

              ) : filteredProcessed.length === 0 ? (

                <tr>

                  <td colSpan={7} className="p-8 text-center text-muted-foreground">

                    {t("admin_refunds.empty")}

                  </td>

                </tr>

              ) : (

                filteredProcessed.map((r) => (

                  <tr key={r.id} className="hover:bg-muted/20">

                    <td className="p-4 font-mono font-bold">{r.order?.orderNumber}</td>

                    <td className="p-4">

                      <p className="font-medium">{r.user?.name || r.order?.customerName}</p>

                      <p className="text-muted-foreground">{r.user?.email || r.order?.customerEmail}</p>

                    </td>

                    <td className="p-4 font-semibold text-green-700">

                      €{(r.refundAmount ?? 0).toFixed(2)}

                    </td>

                    <td className="p-4 font-mono text-[10px] max-w-[120px] truncate" title={r.stripeRefundId || ""}>

                      {r.stripeRefundId || "—"}

                    </td>

                    <td className="p-4">

                      <div className="flex items-center gap-1 text-muted-foreground">

                        <Calendar className="h-3 w-3" />

                        {r.refundExpectedAt

                          ? new Date(r.refundExpectedAt).toLocaleDateString()

                          : r.refundEtaDays

                            ? `${r.refundEtaDays} ${t("admin_refunds.days")}`

                            : "—"}

                      </div>

                      {r.refundProcessedAt && (

                        <p className="text-[10px] text-muted-foreground mt-0.5">

                          {t("admin_refunds.processed")}: {new Date(r.refundProcessedAt).toLocaleDateString()}

                        </p>

                      )}

                    </td>

                    <td className="p-4">

                      {r.returnTrackingNumber ? (

                        <div className="flex items-center gap-1">

                          <Truck className="h-3 w-3" />

                          <span>{r.returnCarrier}</span>

                          <span className="font-mono">{r.returnTrackingNumber}</span>

                        </div>

                      ) : (

                        <span className="text-muted-foreground">—</span>

                      )}

                    </td>

                    <td className="p-4 text-right space-x-1">

                      <Button

                        size="sm"

                        variant="outline"

                        className="h-7 rounded-full text-[10px] gap-1"

                        onClick={() => navigate("/admin/orders/returns")}

                      >

                        {t("admin_refunds.manage_return")}

                      </Button>

                      <Button

                        size="sm"

                        variant="ghost"

                        className="h-7 rounded-full text-[10px] gap-1"

                        onClick={() => navigate(`/admin/orders/${r.orderId}`)}

                      >

                        <ExternalLink className="h-3 w-3" />

                      </Button>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>

  );

}

