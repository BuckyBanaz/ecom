import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  RotateCcw,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Truck,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SafeImage } from "@/components/ui/SafeImage";
import { returnsRepository, ordersRepository } from "@/client/apiClient";
import { resolveImgUrl } from "@/utils/image";
import { getApiV1Url } from "@/utils/endpoints";
import { validateReturnShipmentWeight } from "@/utils/returnValidation";
import { toast } from "sonner";

type ReturnRecord = {
  id: string;
  orderId: string;
  reason: string;
  customerNote?: string | null;
  photos: string[];
  status: string;
  aiFraudScore?: number | null;
  aiSummary?: string | null;
  aiRecommendation?: string | null;
  adminNote?: string | null;
  refundAmount?: number | null;
  stripeRefundId?: string | null;
  refundExpectedAt?: string | null;
  refundProcessedAt?: string | null;
  refundEtaDays?: string;
  returnCarrier?: string | null;
  returnTrackingNumber?: string | null;
  returnTrackingUrl?: string | null;
  returnLabelUrl?: string | null;
  returnShipmentStatus?: string | null;
  itemReceivedAt?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  order?: {
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    customerName?: string;
    customerEmail?: string;
    items?: Array<{ productName: string; productImage: string; quantity: number; price: number }>;
  };
  user?: { name: string; email: string };
};

function fraudBadge(score: number | null | undefined, t: (k: string) => string) {
  if (score == null) return { label: t("admin_returns.ai_na"), className: "bg-muted text-muted-foreground" };
  if (score <= 25) return { label: t("admin_returns.ai_low", { score }), className: "bg-green-100 text-green-800" };
  if (score <= 60) return { label: t("admin_returns.ai_medium", { score }), className: "bg-amber-100 text-amber-800" };
  return { label: t("admin_returns.ai_high", { score }), className: "bg-red-100 text-red-800" };
}

export default function AdminReturns() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState("pending_review");
  const [search, setSearch] = useState("");
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReturnRecord | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [returnWeight, setReturnWeight] = useState("1");
  const [loadingMethods, setLoadingMethods] = useState(false);

  const [resolutionType, setResolutionType] = useState("refund");
  const [resolutionNote, setResolutionNote] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const loadReturns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await returnsRepository.getAll(tab);
      setReturns(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error(t("admin_returns.toast_load_failed"));
    } finally {
      setLoading(false);
    }
  }, [tab, t]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  useEffect(() => {
    if (selected?.status === "approved" && !selected.returnTrackingNumber) {
      setLoadingMethods(true);
      ordersRepository
        .getShippingMethods({ toCountry: "NL", weight: parseFloat(returnWeight) || 1 })
        .then((res) => {
          const methods = res?.data?.shipping_methods;
          setShippingMethods(Array.isArray(methods) ? methods : []);
        })
        .catch(() => {
          setShippingMethods([]);
          toast.error(t("admin_returns.toast_methods_failed"));
        })
        .finally(() => setLoadingMethods(false));
    } else {
      setShippingMethods([]);
    }
  }, [selected?.id, selected?.status, returnWeight, t]);

  const filtered = returns.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.order?.orderNumber?.toLowerCase().includes(q) ||
      r.user?.name?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r.order?.customerName?.toLowerCase().includes(q)
    );
  });

  const handleApprove = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      await returnsRepository.approve(selected.id, adminNote.trim() || undefined, resolutionType, resolutionNote.trim() || undefined);
      toast.success(t("admin_returns.toast_approved"));
      setSelected(null);
      setAdminNote("");
      setResolutionNote("");
      setAiPrompt("");
      loadReturns();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("admin_returns.toast_action_failed"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateAiEmail = async () => {
    if (!selected || !aiPrompt.trim()) return;
    try {
      setAiLoading(true);
      const res = await returnsRepository.generateReturnEmail({
        prompt: aiPrompt,
        resolutionType,
        customerName: selected.user?.name || selected.order?.customerName || "Customer",
        orderNumber: selected.order?.orderNumber || "Unknown",
        reason: selected.reason
      });
      setResolutionNote(res.email);
    } catch (err: any) {
      toast.error(err.message || t("admin_returns.toast_action_failed"));
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateRejectAiEmail = async () => {
    if (!selected || !aiPrompt.trim()) return;
    try {
      setAiLoading(true);
      const res = await returnsRepository.generateReturnEmail({
        prompt: aiPrompt,
        resolutionType: "reject",
        customerName: selected.user?.name || selected.order?.customerName || "Customer",
        orderNumber: selected.order?.orderNumber || "Unknown",
        reason: selected.reason
      });
      setAdminNote(res.email);
    } catch (err: any) {
      toast.error(err.message || t("admin_returns.toast_action_failed"));
    } finally {
      setAiLoading(false);
    }
  };


  const handleReject = async () => {
    if (!selected || !adminNote.trim()) {
      toast.error(t("admin_returns.toast_reject_note_required"));
      return;
    }
    try {
      setActionLoading(true);
      await returnsRepository.reject(selected.id, adminNote.trim());
      toast.success(t("admin_returns.toast_rejected"));
      setRejectDialogOpen(false);
      setSelected(null);
      setAdminNote("");
      loadReturns();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("admin_returns.toast_action_failed"));
    } finally {
      setActionLoading(false);
    }
  };

  const openReject = () => {
    setAdminNote("");
    setRejectDialogOpen(true);
  };

  const openAdminReturnLabel = (returnId: string) => {
    const token = localStorage.getItem("admin_token") || localStorage.getItem("customer_token");
    if (!token) {
      toast.error(t("admin_returns.toast_login_required"));
      return;
    }
    window.open(
      `${getApiV1Url()}/returns/${returnId}/label?token=${encodeURIComponent(token)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleCreateReturnLabel = async () => {
    if (!selected || !selectedMethodId) {
      toast.error(t("admin_returns.toast_select_carrier"));
      return;
    }
    const weightError = validateReturnShipmentWeight(returnWeight);
    if (weightError) {
      toast.error(t(weightError));
      return;
    }
    try {
      setActionLoading(true);
      await returnsRepository.createReturnShipment(
        selected.id,
        parseInt(selectedMethodId, 10),
        parseFloat(returnWeight),
      );
      toast.success(t("admin_returns.toast_label_created"));
      setSelected(null);
      setSelectedMethodId("");
      setTab("awaiting_return");
      loadReturns();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("admin_returns.toast_action_failed"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReceived = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      await returnsRepository.markReceived(selected.id);
      toast.success(t("admin_returns.toast_received"));
      setSelected(null);
      setTab("refunded");
      loadReturns();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("admin_returns.toast_action_failed"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualRefund = async () => {
    if (!selected) return;
    if (!window.confirm(t("admin_returns.confirm_manual_refund"))) return;
    try {
      setActionLoading(true);
      await returnsRepository.processRefund(selected.id);
      toast.success(t("admin_returns.toast_manual_refund"));
      setSelected(null);
      setTab("refunded");
      loadReturns();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("admin_returns.toast_action_failed"));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-primary" />
            {t("admin_returns.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("admin_returns.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={loadReturns} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("admin_returns.refresh")}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-full">
          <TabsTrigger value="pending_review" className="rounded-full text-xs">
            {t("admin_returns.tab_pending")}
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-full text-xs">
            {t("admin_returns.tab_approved")}
          </TabsTrigger>
          <TabsTrigger value="awaiting_return" className="rounded-full text-xs">
            {t("admin_returns.tab_awaiting")}
          </TabsTrigger>
          <TabsTrigger value="return_received" className="rounded-full text-xs">
            {t("admin_returns.tab_received")}
          </TabsTrigger>
          <TabsTrigger value="refunded" className="rounded-full text-xs">
            {t("admin_returns.tab_completed")}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-full text-xs">
            {t("admin_returns.tab_rejected")}
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-full text-xs">
            {t("admin_returns.tab_all")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin_returns.search_placeholder")}
          className="pl-10 h-10 text-xs rounded-lg"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
              {t("admin_returns.empty")}
            </div>
          ) : (
            filtered.map((r) => {
              const badge = fraudBadge(r.aiFraudScore, t);
              const isActive = selected?.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelected(r);
                    setAdminNote("");
                    setResolutionType("refund");
                    setResolutionNote("");
                    setAiPrompt("");
                  }}
                  className={`w-full text-left rounded-xl border p-4 transition ${
                    isActive ? "border-primary bg-primary/5 shadow-sm" : "bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono font-bold text-sm">{r.order?.orderNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.user?.name || r.order?.customerName} · {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <p className="text-xs">{t(`returns.reasons.${r.reason}`)}</p>
                    {r.resolutionType && (
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                        r.resolutionType === "replacement" 
                          ? "bg-purple-50 text-purple-700 border-purple-200" 
                          : "bg-green-50 text-green-700 border-green-200"
                      }`}>
                        {t(`admin_returns.resolution_${r.resolutionType}`)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-3">
          {!selected ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-12 text-center text-muted-foreground text-sm">
              {t("admin_returns.select_hint")}
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="border-b bg-muted/30 px-5 py-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold">{selected.order?.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.user?.email || selected.order?.customerEmail} · €{selected.order?.total?.toFixed(2)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs gap-1"
                  onClick={() => navigate(`/admin/orders/${selected.orderId}`)}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> {t("admin_returns.view_order")}
                </Button>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("admin_returns.label_reason")}</p>
                    <p className="font-medium">{t(`returns.reasons.${selected.reason}`)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("admin_returns.label_status")}</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{t(`returns.statuses.${selected.status}`, { defaultValue: selected.status })}</p>
                      {selected.resolutionType && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          selected.resolutionType === "replacement"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }`}>
                          {t(`admin_returns.resolution_${selected.resolutionType}`)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {selected.customerNote && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("admin_returns.label_customer_note")}</p>
                    <p className="text-sm rounded-lg bg-muted/50 p-3">{selected.customerNote}</p>
                  </div>
                )}

                {selected.aiSummary && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {t("admin_returns.ai_report")}
                    </p>
                    <p className="text-sm text-muted-foreground">{selected.aiSummary}</p>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const b = fraudBadge(selected.aiFraudScore, t);
                        return (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.className}`}>
                            {b.label}
                          </span>
                        );
                      })()}
                      {selected.aiRecommendation && (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                          {t(`admin_returns.rec_${selected.aiRecommendation}`, { defaultValue: selected.aiRecommendation })}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {selected.photos?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t("admin_returns.customer_photos")}</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.photos.map((photo) => (
                        <a
                          key={photo}
                          href={resolveImgUrl(photo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-24 w-24 rounded-lg overflow-hidden border hover:ring-2 ring-primary/30"
                        >
                          <SafeImage src={photo} alt="" className="h-full w-full object-cover" fallbackType="product" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selected.order?.items && selected.order.items.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t("admin_returns.order_items")}</p>
                    <div className="space-y-2">
                      {selected.order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                          <SafeImage src={item.productImage} alt="" className="h-10 w-10 rounded object-cover" fallbackType="product" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">×{item.quantity} · €{item.price.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.status === "pending_review" && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("admin_returns.resolution_action")}</Label>
                        <Select value={resolutionType} onValueChange={setResolutionType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="refund">{t("admin_returns.refund_customer")}</SelectItem>
                            <SelectItem value="replacement">{t("admin_returns.send_replacement")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin_returns.admin_note_label")} {t("admin_returns.internal_note_hint")}</Label>
                        <Input
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          placeholder={t("admin_returns.admin_note_placeholder")}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2 rounded-xl bg-primary/5 border border-primary/20 p-4 mt-4">
                      <p className="text-sm font-semibold flex items-center gap-2 text-primary">
                        <Sparkles className="h-4 w-4" /> {t("admin_returns.customer_message_label")}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("admin_returns.customer_message_hint")}</p>
                      <div className="flex gap-2 items-center">
                        <Input 
                          placeholder={t("admin_returns.ai_prompt_placeholder")}
                          className="text-xs h-8"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                        />
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={handleGenerateAiEmail} 
                          disabled={aiLoading || !aiPrompt.trim()}
                          className="h-8 gap-1 text-xs shrink-0"
                        >
                          {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
                          {t("admin_returns.ai_assist_btn")}
                        </Button>
                      </div>
                      <Textarea
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        placeholder={t("admin_returns.customer_message_placeholder")}
                        rows={4}
                        className="text-xs mt-2"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        className="rounded-full gap-2"
                        onClick={handleApprove}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {t("admin_returns.approve_refund")}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-full gap-2 border-rose-300 text-rose-700 hover:bg-rose-50"
                        onClick={openReject}
                        disabled={actionLoading}
                      >
                        <XCircle className="h-4 w-4" />
                        {t("admin_returns.reject")}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      {t("admin_returns.approve_hint")}
                    </p>
                  </div>
                )}

                {selected.status === "approved" && (
                  <div className="border-t pt-4 space-y-4">
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
                      <p className="font-semibold text-green-800">{t("admin_returns.approved_banner")}</p>
                      <p className="text-green-700 text-xs mt-1">
                        {t("admin_returns.refund_pending", {
                          amount: (selected.refundAmount ?? selected.order?.total ?? 0).toFixed(2),
                        })}
                      </p>
                    </div>

                    {!selected.returnTrackingNumber ? (
                      <>
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <Truck className="h-4 w-4" /> {t("admin_returns.create_return_label")}
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>{t("admin_returns.weight_label")}</Label>
                            <Input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={returnWeight}
                              onChange={(e) => setReturnWeight(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t("admin_returns.carrier_label")}</Label>
                            <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
                              <SelectTrigger>
                                <SelectValue placeholder={loadingMethods ? t("admin_returns.loading_methods") : t("admin_returns.select_carrier")} />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.isArray(shippingMethods) && shippingMethods.length > 0 ? (
                                  shippingMethods.map((m: any) => (
                                    <SelectItem key={m.id} value={String(m.id)}>
                                      {m.name}
                                      {m.carrier ? ` — ${m.carrier}` : ""}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="__none" disabled>
                                    {loadingMethods ? t("admin_returns.loading_methods") : t("admin_returns.no_carriers")}
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          className="rounded-full gap-2"
                          onClick={handleCreateReturnLabel}
                          disabled={actionLoading || loadingMethods}
                        >
                          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                          {t("admin_returns.create_label_btn")}
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-full gap-2 border-amber-300 text-amber-800 hover:bg-amber-50"
                          onClick={handleManualRefund}
                          disabled={actionLoading}
                        >
                          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                          {t("admin_returns.manual_refund_btn")}
                        </Button>
                      </>
                    ) : (
                      <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                        <p className="font-semibold">{t("admin_returns.return_label_ready")}</p>
                        <p>{selected.returnCarrier} · {selected.returnTrackingNumber}</p>
                        {selected.returnLabelUrl && (
                          <button
                            type="button"
                            onClick={() => openAdminReturnLabel(selected.id)}
                            className="text-primary text-xs underline"
                          >
                            {t("admin_returns.download_label")}
                          </button>
                        )}
                        {selected.returnTrackingUrl && (
                          <a href={selected.returnTrackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline block mt-1">
                            {t("returns.track_return")}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {selected.status === "awaiting_return" && (
                  <div className="border-t pt-4 space-y-4">
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
                      <p className="font-semibold text-amber-900">{t("admin_returns.awaiting_return_banner")}</p>
                      {selected.returnShipmentStatus && (
                        <p className="text-amber-800 text-xs mt-1">
                          {t("admin_returns.return_shipment_status")}: {selected.returnShipmentStatus}
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                      <p>{selected.returnCarrier} · {selected.returnTrackingNumber}</p>
                      {selected.returnLabelUrl && (
                        <button
                          type="button"
                          onClick={() => openAdminReturnLabel(selected.id)}
                          className="text-primary text-xs underline"
                        >
                          {t("admin_returns.download_label")}
                        </button>
                      )}
                      {selected.returnTrackingUrl && (
                        <a href={selected.returnTrackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline block mt-1">
                          {t("returns.track_return")}
                        </a>
                      )}
                    </div>
                    <Button
                      className="rounded-full gap-2"
                      onClick={handleMarkReceived}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {t("admin_returns.mark_received_btn")}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full gap-2 border-amber-300 text-amber-800 hover:bg-amber-50"
                      onClick={handleManualRefund}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      {t("admin_returns.manual_refund_btn")}
                    </Button>
                  </div>
                )}

                {selected.status === "return_received" && (
                  <div className="border-t pt-4 space-y-4">
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
                      <p className="font-semibold text-blue-900">{t("admin_returns.received_pending_refund")}</p>
                      {selected.itemReceivedAt && (
                        <p className="text-blue-800 text-xs mt-1">
                          {t("admin_returns.item_received_at", {
                            date: new Date(selected.itemReceivedAt).toLocaleString(),
                          })}
                        </p>
                      )}
                      {selected.returnShipmentStatus && (
                        <p className="text-blue-700 text-xs mt-1">{selected.returnShipmentStatus}</p>
                      )}
                    </div>
                    <Button
                      className="rounded-full gap-2"
                      onClick={handleManualRefund}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      {t("admin_returns.retry_refund_btn")}
                    </Button>
                  </div>
                )}

                {selected.status === "refunded" && (
                  <div className="border-t pt-4 space-y-3">
                    {selected.itemReceivedAt && (
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
                        <p className="font-semibold text-blue-900">{t("admin_returns.item_received_title")}</p>
                        <p className="text-blue-800 text-xs mt-1">
                          {t("admin_returns.item_received_at", {
                            date: new Date(selected.itemReceivedAt).toLocaleString(),
                          })}
                        </p>
                        {selected.returnShipmentStatus && (
                          <p className="text-blue-700 text-xs mt-1">{selected.returnShipmentStatus}</p>
                        )}
                      </div>
                    )}
                    {selected.refundAmount != null && (
                      <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
                        <p className="font-semibold text-green-800">{t("admin_returns.refund_initiated")}</p>
                        <p className="text-green-700 text-xs mt-1">
                          €{selected.refundAmount.toFixed(2)} · {t("admin_returns.refund_eta", {
                            days: selected.refundEtaDays || "5-7",
                            date: selected.refundExpectedAt
                              ? new Date(selected.refundExpectedAt).toLocaleDateString()
                              : "—",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selected.adminNote && selected.status !== "pending_review" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("admin_returns.admin_note_label")}</p>
                    <p className="text-sm rounded-lg bg-muted/50 p-3">{selected.adminNote}</p>
                  </div>
                )}

                {selected.stripeRefundId && (
                  <p className="text-xs text-green-700 font-mono">
                    Stripe: {selected.stripeRefundId}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin_returns.reject_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2 rounded-xl bg-primary/5 border border-primary/20 p-4">
              <p className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" /> {t("admin_returns.customer_message_label")}
              </p>
              <p className="text-xs text-muted-foreground">{t("admin_returns.customer_message_hint")}</p>
              <div className="flex gap-2 items-center">
                <Input 
                  placeholder={t("admin_returns.ai_prompt_placeholder")}
                  className="text-xs h-8"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={handleGenerateRejectAiEmail} 
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="h-8 gap-1 text-xs shrink-0"
                >
                  {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
                  {t("admin_returns.ai_assist_btn")}
                </Button>
              </div>
              <Label className="mt-4 block">{t("admin_returns.reject_note_label")}</Label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={t("admin_returns.reject_note_placeholder")}
                rows={5}
                className="text-xs mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={actionLoading}>
              {t("returns.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading} className="gap-2">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              {t("admin_returns.confirm_reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
