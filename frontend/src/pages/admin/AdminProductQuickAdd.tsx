import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  X,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  Loader2,
  Clock,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAdmin } from "@/context/AdminContext";
import { brandRepository } from "@/client/apiClient";
import {
  clearQuickAddSession,
  fileFromDataUrl,
  loadQuickAddSession,
  saveQuickAddSession,
} from "@/utils/quickAddSession";
import { getApiV1Url } from "@/utils/endpoints";
import { resolveImgUrl } from "@/utils/image";
import { MediaLibraryDialog } from "@/components/admin/media/MediaLibraryDialog";

interface ProductRow {
  key: string;
  hint: string;
  price: string;
  brand: string;
  imageFile: File | null;
  imagePreview: string | null;
}

type RowProcessStatus =
  | "idle"
  | "queued"
  | "analyzing"
  | "images"
  | "saving"
  | "done"
  | "failed";

interface RowProgress {
  status: RowProcessStatus;
  error?: string;
  draftId?: string;
  productName?: string;
}

const emptyRow = (): ProductRow => ({
  key: `row-${Date.now()}-${Math.random()}`,
  hint: "",
  price: "",
  brand: "",
  imageFile: null,
  imagePreview: null,
});

const restoredSession = loadQuickAddSession();

const AdminProductQuickAdd = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAdmin();

  const [rows, setRows] = useState<ProductRow[]>(() => {
    if (restoredSession?.rows?.length) {
      return restoredSession.rows.map((r) => ({ ...r, imageFile: null }));
    }
    return [emptyRow()];
  });
  const [imagePromptOverride, setImagePromptOverride] = useState(
    restoredSession?.imagePromptOverride || "",
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [bulkLimit, setBulkLimit] = useState(5);
  const [imageCountLimit, setImageCountLimit] = useState(1);
  const [aiOutputLanguageLabel, setAiOutputLanguageLabel] = useState("Dutch (Nederlands)");
  const [rowProgress, setRowProgress] = useState<Record<string, RowProgress>>(
    (restoredSession?.rowProgress as Record<string, RowProgress>) || {},
  );
  const [activeRowKey, setActiveRowKey] = useState<string | null>(null);
  const [batchSummary, setBatchSummary] = useState<{ ok: number; failed: number; total: number } | null>(
    restoredSession?.batchSummary || null,
  );
  
  // Media Picker states for specific rows
  const [mediaPickerRowKey, setMediaPickerRowKey] = useState<string | null>(null);

  const openMediaSelectorForRow = (key: string) => {
    setMediaPickerRowKey(key);
  };

  const handleSelectMediaImage = async (url: string) => {
    if (!mediaPickerRowKey) return;
    const rowKey = mediaPickerRowKey;
    setMediaPickerRowKey(null);

    const toastId = toast.loading("Loading image from media library...");
    try {
      const resolvedUrl = resolveImgUrl(url);
      const filename = url.split("/").pop() || "media-image.jpg";
      
      const response = await fetch(resolvedUrl);
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type });

      updateRow(rowKey, {
        imageFile: file,
        imagePreview: resolvedUrl,
      });
      toast.success("Image selected from media library", { id: toastId });
    } catch (error) {
      console.error("Failed to load image from media library:", error);
      toast.error("Failed to select image from media library", { id: toastId });
    }
  };
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const imagePhaseTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const generatingRef = useRef(false);
  const sessionNotified = useRef(false);

  const apiUrl = getApiV1Url();
  const authHeaders = { Authorization: `Bearer ${localStorage.getItem("admin_token")}` };

  useEffect(() => {
    fetch(`${apiUrl}/ai/limits`, { headers: authHeaders })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setBulkLimit(data.bulkLimit ?? 5);
          setImageCountLimit(data.imageCount ?? 1);
          if (data.outputLanguageLabel) setAiOutputLanguageLabel(data.outputLanguageLabel);
        }
      })
      .catch(() => {});

    brandRepository
      .getAll()
      .then((data) => {
        if (data.success && data.brands) setBrands(data.brands);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      imagePhaseTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (sessionNotified.current || !restoredSession) return;
    sessionNotified.current = true;
    if (restoredSession.interrupted) {
      toast.info(t("admin_quick_add.batch_interrupted"));
    } else if (restoredSession.batchSummary || Object.keys(restoredSession.rowProgress || {}).length > 0) {
      toast.success(t("admin_quick_add.session_restored"));
    }
  }, [t]);

  useEffect(() => {
    const hasContent = rows.some((r) => r.hint.trim() || r.imagePreview || r.price.trim());
    const hasProgress = Object.keys(rowProgress).length > 0 || batchSummary;
    if (!hasContent && !hasProgress) return;

    saveQuickAddSession({
      rows: rows.map(({ key, hint, price, brand, imagePreview }) => ({
        key,
        hint,
        price,
        brand,
        imagePreview,
      })),
      imagePromptOverride,
      rowProgress,
      batchSummary,
    });
  }, [rows, imagePromptOverride, rowProgress, batchSummary]);

  useEffect(() => {
    return () => {
      if (!generatingRef.current) return;
      saveQuickAddSession({
        rows: rows.map(({ key, hint, price, brand, imagePreview }) => ({
          key,
          hint,
          price,
          brand,
          imagePreview,
        })),
        imagePromptOverride,
        rowProgress,
        batchSummary,
        interrupted: true,
      });
    };
  }, [rows, imagePromptOverride, rowProgress, batchSummary]);

  if (!hasPermission("products") && !hasPermission("ai")) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        <p>{t("admin_product_form.no_permission")}</p>
      </div>
    );
  }

  const updateRow = (key: string, patch: Partial<ProductRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const patchRowProgress = (key: string, patch: Partial<RowProgress>) => {
    setRowProgress((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const startImagePhaseTimer = (key: string) => {
    const existing = imagePhaseTimers.current.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setRowProgress((prev) => {
        const current = prev[key];
        if (!current || current.status !== "analyzing") return prev;
        return { ...prev, [key]: { ...current, status: "images" } };
      });
    }, 3500);
    imagePhaseTimers.current.set(key, timer);
  };

  const clearImagePhaseTimer = (key: string) => {
    const timer = imagePhaseTimers.current.get(key);
    if (timer) clearTimeout(timer);
    imagePhaseTimers.current.delete(key);
  };

  const handleImageChange = (key: string, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("admin_quick_add.toast_invalid_image"));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      updateRow(key, { imageFile: file, imagePreview: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const addRow = () => {
    if (rows.length >= bulkLimit) {
      toast.error(t("admin_quick_add.toast_bulk_limit", { limit: bulkLimit }));
      return;
    }
    setRows((prev) => [...prev, emptyRow()]);
  };

  const removeRow = (key: string) => {
    if (rows.length <= 1 || isGenerating) return;
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const validRows = rows.filter((r) => r.imageFile || r.imagePreview || r.hint.trim());

  const resolveRowImageFile = (row: ProductRow): File | null => {
    if (row.imageFile) return row.imageFile;
    if (row.imagePreview) {
      return fileFromDataUrl(row.imagePreview, `product-${row.key}.jpg`);
    }
    return null;
  };

  const startNewBatch = () => {
    clearQuickAddSession();
    setRows([emptyRow()]);
    setRowProgress({});
    setBatchSummary(null);
    setActiveRowKey(null);
    setImagePromptOverride("");
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validRows.length === 0) {
      toast.error(t("admin_quick_add.toast_missing_info"));
      return;
    }

    setBatchSummary(null);
    setIsGenerating(true);
    generatingRef.current = true;
    setActiveRowKey(null);

    const initial: Record<string, RowProgress> = {};
    validRows.forEach((r) => {
      initial[r.key] = { status: "queued" };
    });
    setRowProgress(initial);

    let ok = 0;

    for (const row of validRows) {
      setActiveRowKey(row.key);
      patchRowProgress(row.key, { status: "analyzing", error: undefined });
      startImagePhaseTimer(row.key);

      const formData = new FormData();
      const imageFile = resolveRowImageFile(row);
      if (imageFile) formData.append("image", imageFile);
      if (row.hint.trim()) formData.append("hint", row.hint.trim());
      if (row.price.trim()) formData.append("price", row.price.trim());
      if (row.brand.trim()) formData.append("brandName", row.brand.trim());
      if (imagePromptOverride.trim()) formData.append("imagePromptOverride", imagePromptOverride.trim());

      try {
        const response = await fetch(`${apiUrl}/ai/products/quick-add`, {
          method: "POST",
          body: formData,
          headers: authHeaders,
        });
        const data = await response.json();
        clearImagePhaseTimer(row.key);

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed");
        }

        patchRowProgress(row.key, {
          status: "done",
          draftId: data.draftId,
          productName: data.draft?.name || row.hint.trim() || t("admin_drafts.untitled"),
        });
        ok += 1;
      } catch (error: any) {
        clearImagePhaseTimer(row.key);
        patchRowProgress(row.key, {
          status: "failed",
          error: error.message || t("admin_quick_add.toast_failed"),
        });
      }
    }

    setActiveRowKey(null);
    setIsGenerating(false);
    generatingRef.current = false;
    setBatchSummary({ ok, failed: validRows.length - ok, total: validRows.length });

    if (ok > 0) {
      toast.success(t("admin_quick_add.toast_bulk_success", { ok, total: validRows.length }));
    } else {
      toast.error(t("admin_quick_add.toast_failed"));
    }
  };

  const completedCount = validRows.filter((r) => rowProgress[r.key]?.status === "done").length;
  const failedCount = validRows.filter((r) => rowProgress[r.key]?.status === "failed").length;
  const progressPercent =
    validRows.length > 0
      ? Math.round(((completedCount + failedCount) / validRows.length) * 100)
      : 0;
  const activeIndex = activeRowKey ? validRows.findIndex((r) => r.key === activeRowKey) : -1;
  const showProgressPanel = isGenerating || !!batchSummary;

  const statusLabel = (status: RowProcessStatus | undefined) => {
    switch (status) {
      case "queued":
        return t("admin_quick_add.status_queued");
      case "analyzing":
        return t("admin_quick_add.status_analyzing");
      case "images":
        return t("admin_quick_add.status_images", { count: imageCountLimit });
      case "saving":
        return t("admin_quick_add.status_saving");
      case "done":
        return t("admin_quick_add.status_done");
      case "failed":
        return t("admin_quick_add.status_failed");
      default:
        return "";
    }
  };

  const StatusIcon = ({ status }: { status: RowProcessStatus | undefined }) => {
    if (status === "done") return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
    if (status === "failed") return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
    if (status === "queued") return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
    if (status === "analyzing" || status === "images" || status === "saving") {
      return <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />;
    }
    return null;
  };

  const rowBorderClass = (key: string) => {
    const s = rowProgress[key]?.status;
    if (s === "done") return "border-green-500/50 bg-green-500/5";
    if (s === "failed") return "border-destructive/50 bg-destructive/5";
    if (key === activeRowKey) return "border-primary/60 bg-primary/5 ring-1 ring-primary/20";
    if (s === "queued") return "border-border/60 bg-muted/5 opacity-80";
    return "border-border/60 bg-muted/10";
  };

  return (
    <div className="w-full min-w-0 max-w-[1400px] mx-auto space-y-6 pb-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/45 backdrop-blur-md p-6 rounded-2xl border border-border/80">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/admin/products")} className="rounded-full" disabled={isGenerating}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              <span>✨</span> {t("admin_quick_add.title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("admin_quick_add.subtitle_bulk", { limit: bulkLimit, images: imageCountLimit })}
              {" · "}
              {t("admin_quick_add.ai_language", { language: aiOutputLanguageLabel, defaultValue: "AI language: {{language}}" })}
            </p>
          </div>
        </div>
        <Button variant="outline" className="rounded-full gap-2" onClick={() => navigate("/admin/product-drafts")} disabled={isGenerating}>
          <FileText className="h-4 w-4" /> {t("admin_quick_add.view_drafts")}
        </Button>
      </div>

      {showProgressPanel && (
        <Card className="rounded-2xl border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold flex items-center gap-2">
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      {t("admin_quick_add.progress_title")}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      {t("admin_quick_add.progress_complete")}
                    </>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isGenerating && activeIndex >= 0
                    ? t("admin_quick_add.progress_active", {
                        current: activeIndex + 1,
                        total: validRows.length,
                      })
                    : batchSummary
                      ? t("admin_quick_add.progress_summary", {
                          ok: batchSummary.ok,
                          failed: batchSummary.failed,
                          total: batchSummary.total,
                        })
                      : t("admin_quick_add.progress_waiting")}
                </p>
              </div>
              <div className="text-right text-sm font-semibold tabular-nums">
                {completedCount + failedCount}/{validRows.length}{" "}
                <span className="text-muted-foreground font-normal">{t("admin_quick_add.progress_processed")}</span>
              </div>
            </div>

            <Progress value={isGenerating ? Math.max(progressPercent, activeIndex >= 0 ? ((activeIndex + 0.35) / validRows.length) * 100 : 5) : 100} className="h-2" />

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
              {validRows.map((row, index) => {
                const prog = rowProgress[row.key];
                const isActive = row.key === activeRowKey;
                return (
                  <div
                    key={`prog-${row.key}`}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-sm transition-all min-w-0 overflow-hidden ${
                      prog?.status === "done"
                        ? "border-green-500/40 bg-green-500/10"
                        : prog?.status === "failed"
                          ? "border-destructive/40 bg-destructive/10"
                          : isActive
                            ? "border-primary/50 bg-primary/10"
                            : "border-border/50 bg-background/60"
                    }`}
                  >
                    <StatusIcon status={prog?.status} />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="font-semibold truncate">
                        {t("admin_quick_add.product_row", { n: index + 1 })}
                        {row.hint.trim() ? `: ${row.hint.trim()}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{statusLabel(prog?.status)}</p>
                      {prog?.status === "done" && prog.draftId && (
                        <a
                          href={`/admin/products/drafts/${prog.draftId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline min-w-0 max-w-full"
                          title={prog.productName || t("admin_drafts.untitled")}
                        >
                          <span className="truncate">{prog.productName || t("admin_drafts.untitled")}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      )}
                      {prog?.status === "failed" && prog.error && (
                        <p className="text-xs text-destructive mt-1 line-clamp-2">{prog.error}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {batchSummary && !isGenerating && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="button" className="rounded-xl gap-2" onClick={() => navigate("/admin/product-drafts")}>
                  <FileText className="h-4 w-4" /> {t("admin_quick_add.view_drafts")}
                </Button>
                <Button type="button" variant="outline" className="rounded-xl" onClick={startNewBatch}>
                  {t("admin_quick_add.new_batch")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-border/80 min-w-0 overflow-hidden">
        <form onSubmit={handleGenerate} className="min-w-0">
          <CardContent className="p-6 space-y-6 min-w-0">
            {rows.map((row, index) => {
              const prog = rowProgress[row.key];
              return (
                <div key={row.key} className={`p-4 rounded-xl border space-y-4 transition-all min-w-0 overflow-hidden ${rowBorderClass(row.key)}`}>
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      <span className="text-sm font-bold">{t("admin_quick_add.product_row", { n: index + 1 })}</span>
                      {prog?.status && prog.status !== "idle" && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            prog.status === "done"
                              ? "bg-green-500/15 text-green-700"
                              : prog.status === "failed"
                                ? "bg-destructive/15 text-destructive"
                                : prog.status === "queued"
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-primary/15 text-primary"
                          }`}
                        >
                          <StatusIcon status={prog.status} />
                          {statusLabel(prog.status)}
                        </span>
                      )}
                    </div>
                    {rows.length > 1 && !isGenerating && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(row.key)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {(prog?.status === "analyzing" || prog?.status === "images") && row.key === activeRowKey && (
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <StepPill done={true} active={prog.status === "analyzing"} label={t("admin_quick_add.step_analyze")} />
                      <StepPill
                        done={prog.status === "images"}
                        active={prog.status === "images"}
                        label={t("admin_quick_add.step_images", { count: imageCountLimit })}
                      />
                      <StepPill done={false} active={false} label={t("admin_quick_add.step_save")} />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4">
                    <div>
                      {!row.imagePreview ? (
                        <div className="flex flex-col gap-2">
                          <label className={`flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg ${isGenerating ? "opacity-50 pointer-events-none" : "cursor-pointer hover:bg-muted/30"}`}>
                            <ImageIcon className="h-5 w-5 text-muted-foreground mb-0.5" />
                            <span className="text-[9px] text-muted-foreground text-center px-1 leading-tight">{t("admin_quick_add.upload_click")}</span>
                            <input type="file" accept="image/*" className="hidden" disabled={isGenerating} onChange={(e) => handleImageChange(row.key, e.target.files?.[0] || null)} />
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] rounded-lg gap-1 border-border/80"
                            disabled={isGenerating}
                            onClick={() => openMediaSelectorForRow(row.key)}
                          >
                            <ImageIcon className="h-3 w-3 text-primary/80" /> Media Library
                          </Button>
                        </div>
                      ) : (
                        <div className="relative h-32 border rounded-lg overflow-hidden">
                          <img src={row.imagePreview} alt="" className="h-full w-full object-contain bg-muted/20" />
                          {!isGenerating && (
                            <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => updateRow(row.key, { imageFile: null, imagePreview: null })}>
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Textarea
                        value={row.hint}
                        onChange={(e) => updateRow(row.key, { hint: e.target.value })}
                        placeholder={t("admin_quick_add.hint_placeholder")}
                        className="min-h-[72px] text-sm resize-none"
                        disabled={isGenerating}
                      />
                      {!isGenerating && (
                        <div className="flex flex-wrap gap-1.5 pb-1">
                          {["Modern", "Industrieel", "Rotan", "Vintage", "Zwart", "Hout", "Koper"].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                const current = row.hint.trim();
                                const separator = current && !current.endsWith(",") ? ", " : current ? " " : "";
                                updateRow(row.key, { hint: current + separator + tag.toLowerCase() });
                              }}
                              className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-primary transition-colors"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                          <Input value={row.price} onChange={(e) => updateRow(row.key, { price: e.target.value })} placeholder="89.95" className="pl-6 h-9 text-sm" disabled={isGenerating} />
                        </div>
                        <Select
                          value={row.brand || "none"}
                          onValueChange={(v) => updateRow(row.key, { brand: v === "none" ? "" : v })}
                          disabled={isGenerating}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder={t("admin_product_form.placeholder_brand")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-sm italic text-muted-foreground">
                              {t("admin_product_form.brand_none")}
                            </SelectItem>
                            {brands.map((b) => (
                              <SelectItem key={b.id} value={b.name} className="text-sm">
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {rows.length < bulkLimit && !isGenerating && (
              <Button type="button" variant="outline" className="w-full rounded-xl gap-2 border-dashed" onClick={addRow}>
                <Plus className="h-4 w-4" /> {t("admin_quick_add.add_row", { current: rows.length, limit: bulkLimit })}
              </Button>
            )}

            <div className="pt-4 border-t space-y-2">
              <Label>{t("admin_quick_add.custom_prompt_label")}</Label>
              <Input value={imagePromptOverride} onChange={(e) => setImagePromptOverride(e.target.value)} placeholder={t("admin_quick_add.custom_prompt_placeholder")} disabled={isGenerating} />
              <p className="text-xs text-muted-foreground">{t("admin_quick_add.custom_prompt_desc")}</p>
            </div>
          </CardContent>

          <CardFooter className="p-6 pt-0 flex flex-col sm:flex-row gap-3 sm:justify-between">
            <p className="text-xs text-muted-foreground">{t("admin_quick_add.draft_note")}</p>
            <Button type="submit" disabled={isGenerating || validRows.length === 0} className="rounded-xl gap-2 px-8">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("admin_quick_add.btn_generating")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />{" "}
                  {validRows.length > 1
                    ? t("admin_quick_add.btn_generate_bulk", { count: validRows.length })
                    : t("admin_quick_add.btn_generate")}
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {mediaPickerRowKey && (
        <MediaLibraryDialog
          open={Boolean(mediaPickerRowKey)}
          onClose={() => setMediaPickerRowKey(null)}
          onSelect={handleSelectMediaImage}
        />
      )}
    </div>
  );
};

function StepPill({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 border ${
        done
          ? "border-green-500/40 bg-green-500/10 text-green-700"
          : active
            ? "border-primary/50 bg-primary/10 text-primary font-semibold"
            : "border-border/50 text-muted-foreground"
      }`}
    >
      {done ? <CheckCircle2 className="h-3 w-3" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
      {label}
    </span>
  );
}

export default AdminProductQuickAdd;
