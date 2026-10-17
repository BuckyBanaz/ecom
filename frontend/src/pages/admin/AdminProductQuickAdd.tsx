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
  Ruler,
  Layers,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAdmin } from "@/context/AdminContext";
import { brandRepository, seriesRepository, categoryRepository } from "@/client/apiClient";
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
  category?: string;
  brand: string;
  series?: string;
  imageFile: File | null;
  imagePreview: string | null;
  sizeGroupId?: string;
  sizeLabel?: string;
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
  category: "",
  brand: "",
  series: "",
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
  const [rowProgress, setRowProgress] = useState<Record<string, RowProgress>>({});
  const [activeRowKey, setActiveRowKey] = useState<string | null>(null);
  const [batchSummary, setBatchSummary] = useState<{ ok: number; failed: number; total: number } | null>(null);
  
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
  const [seriesList, setSeriesList] = useState<Array<{ id: string; name: string; brandId: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string; parentId?: string | null }>>([]);
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

    seriesRepository
      .getAll()
      .then((data) => {
        if (data.success && data.series) setSeriesList(data.series);
      })
      .catch(() => {});

    categoryRepository
      .getAll()
      .then((data) => {
        if (data.success && data.categories) setCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  const [liveDuplicates, setLiveDuplicates] = useState<Record<string, Array<{ id: string; name: string; slug: string; price: number }>>>({});

  // Real-time debounced check as admin types in product hint
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    rows.forEach((row) => {
      const hintText = row.hint.trim();
      if (hintText.length >= 3) {
        const timer = setTimeout(() => {
          fetch(`${apiUrl}/ai/products/check-duplicate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ text: hintText }),
          })
            .then((r) => r.json())
            .then((res) => {
              if (res.success && res.existingMatches?.length) {
                setLiveDuplicates((prev) => ({ ...prev, [row.key]: res.existingMatches }));
              } else {
                setLiveDuplicates((prev) => {
                  const next = { ...prev };
                  delete next[row.key];
                  return next;
                });
              }
            })
            .catch(() => {});
        }, 400);
        timers.push(timer);
      } else {
        setLiveDuplicates((prev) => {
          const next = { ...prev };
          delete next[row.key];
          return next;
        });
      }
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [rows.map((r) => `${r.key}:${r.hint}`).join("|")]);

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

  // Listen to localStorage changes across tabs for live progress sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "admin_quick_add_session" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.rowProgress) setRowProgress(parsed.rowProgress);
          if (parsed.batchSummary) setBatchSummary(parsed.batchSummary);
          if (parsed.isProcessing !== undefined) setIsGenerating(parsed.isProcessing);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const hasContent = rows.some((r) => r.hint.trim() || r.imagePreview || r.price.trim());
    const hasProgress = Object.keys(rowProgress).length > 0 || batchSummary;
    if (!hasContent && !hasProgress) return;

    // Filter rowProgress to only include keys for current active rows
    const validKeys = new Set(rows.map((r) => r.key));
    const cleanRowProgress: Record<string, RowProgress> = {};
    Object.keys(rowProgress).forEach((k) => {
      if (validKeys.has(k)) {
        cleanRowProgress[k] = rowProgress[k];
      }
    });

    saveQuickAddSession({
      rows: rows.map(({ key, hint, price, brand, series, category, imagePreview, sizeGroupId, sizeLabel }) => ({
        key,
        hint,
        price,
        brand,
        series,
        category,
        imagePreview,
        sizeGroupId,
        sizeLabel,
      })),
      imagePromptOverride,
      rowProgress: cleanRowProgress,
      batchSummary,
      isProcessing: isGenerating,
    });
  }, [rows, imagePromptOverride, rowProgress, batchSummary, isGenerating]);

  const latestStateRef = useRef({ rows, imagePromptOverride, rowProgress, batchSummary });
  useEffect(() => {
    latestStateRef.current = { rows, imagePromptOverride, rowProgress, batchSummary };
  }, [rows, imagePromptOverride, rowProgress, batchSummary]);

  useEffect(() => {
    const handleUnload = () => {
      if (generatingRef.current) {
        const { rows, imagePromptOverride, rowProgress, batchSummary } = latestStateRef.current;
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
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
    };
  }, []);

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

  // Multi-Size Generator states & presets
  interface SizeVariationItem {
    id: string;
    label: string;
    price: string;
  }

  const SIZE_PRESETS = [
    {
      label: "🔘 Diameter (Ø 40cm, 60cm, 80cm)",
      sizes: ["Ø 40 cm", "Ø 60 cm", "Ø 80 cm"],
    },
    {
      label: "📏 Lengte (80cm, 100cm, 120cm)",
      sizes: ["80 cm", "100 cm", "120 cm"],
    },
    {
      label: "💍 Ringen (2-Ring, 3-Ring, 4-Ring)",
      sizes: ["2-Ring", "3-Ring", "4-Ring"],
    },
    {
      label: "💡 Lichts (3-Lichts, 5-Lichts, 7-Lichts)",
      sizes: ["3-Lichts", "5-Lichts", "7-Lichts"],
    },
    {
      label: "🏷️ Maten (S, M, L)",
      sizes: ["Small (S)", "Medium (M)", "Large (L)"],
    },
  ];

  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [sizeTargetRowKey, setSizeTargetRowKey] = useState<string | null>(null);
  const [sizeBaseHint, setSizeBaseHint] = useState("");
  const [sizeVariations, setSizeVariations] = useState<SizeVariationItem[]>([
    { id: "1", label: "Ø 40 cm", price: "69.95" },
    { id: "2", label: "Ø 60 cm", price: "89.95" },
    { id: "3", label: "Ø 80 cm", price: "119.95" },
  ]);

  const openMultiSizeModal = (row: ProductRow) => {
    setSizeTargetRowKey(row.key);
    // Strip common size suffixes from hint to get clean base title if present
    const cleanHint = row.hint.replace(/[-–—]?\s*(?:Ø\s*\d+\s*(?:cm|mm)?|\b\d+\s*(?:cm|mm)\b|\b\d+[- ](?:ring|lichts|rings)\b|\b(?:small|medium|large|xl)\b).*$/i, "").trim();
    setSizeBaseHint(cleanHint || row.hint.trim());

    const baseP = row.price.trim() ? parseFloat(row.price) : 89.95;
    setSizeVariations([
      { id: "1", label: "Ø 40 cm", price: isNaN(baseP) ? "69.95" : (baseP * 0.8).toFixed(2) },
      { id: "2", label: "Ø 60 cm", price: isNaN(baseP) ? "89.95" : baseP.toFixed(2) },
      { id: "3", label: "Ø 80 cm", price: isNaN(baseP) ? "119.95" : (baseP * 1.35).toFixed(2) },
    ]);
    setIsSizeModalOpen(true);
  };

  const applySizePreset = (presetSizes: string[]) => {
    const baseP = parseFloat(sizeVariations[0]?.price || "89.95") || 89.95;
    const newItems: SizeVariationItem[] = presetSizes.map((sz, idx) => {
      const multiplier = idx === 0 ? 0.85 : idx === 1 ? 1 : 1 + idx * 0.3;
      return {
        id: `sz-${Date.now()}-${idx}`,
        label: sz,
        price: (baseP * multiplier).toFixed(2),
      };
    });
    setSizeVariations(newItems);
  };

  const handleApplySizesToBatch = () => {
    if (!sizeTargetRowKey) return;
    const validSizes = sizeVariations.filter((s) => s.label.trim().length > 0);
    if (validSizes.length === 0) {
      toast.error("Please enter at least one size variation.");
      return;
    }

    const targetIndex = rows.findIndex((r) => r.key === sizeTargetRowKey);
    if (targetIndex === -1) return;

    const baseRow = rows[targetIndex];
    const cleanBaseHint = sizeBaseHint.trim() || baseRow.hint.trim();
    const groupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Update the base row to be size 1
    const firstSize = validSizes[0];
    const updatedBaseRow: ProductRow = {
      ...baseRow,
      hint: cleanBaseHint ? `${cleanBaseHint} - ${firstSize.label}` : firstSize.label,
      price: firstSize.price || baseRow.price,
      sizeGroupId: groupId,
      sizeLabel: firstSize.label,
    };

    // Create rows for the remaining sizes
    const newSizeRows: ProductRow[] = validSizes.slice(1).map((s) => ({
      key: `row-${Date.now()}-${Math.random()}`,
      hint: cleanBaseHint ? `${cleanBaseHint} - ${s.label}` : s.label,
      price: s.price || baseRow.price,
      category: baseRow.category,
      brand: baseRow.brand,
      series: baseRow.series,
      imageFile: baseRow.imageFile,
      imagePreview: baseRow.imagePreview,
      sizeGroupId: groupId,
      sizeLabel: s.label,
    }));

    const totalAfterAdding = rows.length - 1 + validSizes.length;
    if (totalAfterAdding > bulkLimit) {
      toast.warning(`Note: Adding ${validSizes.length} sizes totals ${totalAfterAdding} products. You can raise your batch limit in Settings if needed.`);
    }

    // Insert new size rows immediately following the base row
    const newRows = [...rows];
    newRows.splice(targetIndex, 1, updatedBaseRow, ...newSizeRows);
    setRows(newRows);

    setIsSizeModalOpen(false);
    toast.success(`✨ Generated ${validSizes.length} size variations! All linked as siblings.`);
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
    }, 7000);
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
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Image file is too large (maximum 50MB limit).");
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

    clearQuickAddSession();
    setBatchSummary(null);
    setRowProgress({});
    setIsGenerating(true);
    generatingRef.current = true;
    setActiveRowKey(null);

    const initial: Record<string, RowProgress> = {};
    validRows.forEach((r) => {
      initial[r.key] = { status: "queued" };
    });
  const processRow = async (row: ProductRow, index: number = 0): Promise<boolean> => {
    // Stagger request start by 600ms per row to prevent API rate spikes while running in parallel
    if (index > 0) {
      await new Promise((r) => setTimeout(r, index * 600));
    }

    patchRowProgress(row.key, { status: "analyzing", error: undefined });
    startImagePhaseTimer(row.key);

    const formData = new FormData();
    const imageFile = resolveRowImageFile(row);
    if (imageFile) formData.append("image", imageFile);
    if (row.hint.trim()) formData.append("hint", row.hint.trim());
    if (row.price.trim()) formData.append("price", row.price.trim());
    if (row.brand.trim()) formData.append("brandName", row.brand.trim());
    if (row.series?.trim()) formData.append("seriesName", row.series.trim());
    if (row.category?.trim()) formData.append("category", row.category.trim());
    if (imagePromptOverride.trim()) formData.append("imagePromptOverride", imagePromptOverride.trim());
    if (row.sizeGroupId) formData.append("sizeGroupId", row.sizeGroupId);
    if (row.sizeLabel) formData.append("sizeLabel", row.sizeLabel);

    let lastErrorMsg = "";

    // Allow 1 retry per row in case of transient network or rate limit error
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        if (attempt > 1) {
          await new Promise((r) => setTimeout(r, 3000));
        }

        const response = await fetch(`${apiUrl}/ai/products/quick-add`, {
          method: "POST",
          body: formData,
          headers: authHeaders,
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed");
        }

        clearImagePhaseTimer(row.key);
        patchRowProgress(row.key, {
          status: "done",
          draftId: data.draftId,
          productName: data.draft?.name || row.hint.trim() || t("admin_drafts.untitled"),
        });
        return true;
      } catch (error: any) {
        lastErrorMsg = error.message || t("admin_quick_add.toast_failed");
      }
    }

    clearImagePhaseTimer(row.key);
    patchRowProgress(row.key, {
      status: "failed",
      error: lastErrorMsg,
    });
    return false;
  };

  const retrySingleRow = async (rowKey: string) => {
    if (isGenerating) return;
    const targetRow = rows.find((r) => r.key === rowKey);
    if (!targetRow) return;

    if (!targetRow.imageFile && !targetRow.imagePreview && !targetRow.hint.trim()) {
      toast.error(t("admin_quick_add.toast_missing_info"));
      return;
    }

    setIsGenerating(true);
    generatingRef.current = true;
    setActiveRowKey(rowKey);
    patchRowProgress(rowKey, { status: "queued", error: undefined });

    const success = await processRow(targetRow, 0);

    setActiveRowKey(null);
    setIsGenerating(false);
    generatingRef.current = false;

    // Recalculate summary with latest status
    setBatchSummary(() => {
      let okCount = 0;
      let failedCount = 0;
      validRows.forEach((r) => {
        const s = r.key === rowKey ? (success ? "done" : "failed") : rowProgress[r.key]?.status;
        if (s === "done") okCount++;
        else if (s === "failed") failedCount++;
      });
      return { ok: okCount, failed: failedCount, total: validRows.length };
    });

    if (success) {
      toast.success(
        targetRow.sizeLabel
          ? `Maat ${targetRow.sizeLabel} succesvol aangemaakt en als sibling gekoppeld!`
          : t("admin_quick_add.toast_bulk_success", { ok: 1, total: 1 })
      );
    } else {
      toast.error("Opnieuw proberen mislukt. Probeer het nogmaals.");
    }
  };

  const retryAllFailedRows = async () => {
    if (isGenerating) return;
    const failedRows = validRows.filter((r) => rowProgress[r.key]?.status === "failed");
    if (failedRows.length === 0) return;

    setIsGenerating(true);
    generatingRef.current = true;
    setActiveRowKey(null);

    failedRows.forEach((r) => {
      patchRowProgress(r.key, { status: "queued", error: undefined });
    });

    let newlyOk = 0;
    for (let i = 0; i < failedRows.length; i++) {
      const row = failedRows[i];
      setActiveRowKey(row.key);
      if (i > 0) {
        await new Promise((r) => setTimeout(r, 1200));
      }
      const ok = await processRow(row, i);
      if (ok) newlyOk++;
    }

    setActiveRowKey(null);
    setIsGenerating(false);
    generatingRef.current = false;

    setBatchSummary(() => {
      let okCount = 0;
      let failedCount = 0;
      validRows.forEach((r) => {
        const s = rowProgress[r.key]?.status;
        if (s === "done") okCount++;
        else if (s === "failed") failedCount++;
      });
      return { ok: okCount, failed: failedCount, total: validRows.length };
    });

    if (newlyOk > 0) {
      toast.success(`${newlyOk} product(en) succesvol opnieuw gegenereerd!`);
    } else {
      toast.error("Opnieuw proberen mislukt voor resterende producten.");
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validRows.length === 0) {
      toast.error(t("admin_quick_add.toast_missing_info"));
      return;
    }

    clearQuickAddSession();
    setBatchSummary(null);
    setRowProgress({});
    setIsGenerating(true);
    generatingRef.current = true;
    setActiveRowKey(null);

    const initial: Record<string, RowProgress> = {};
    validRows.forEach((r) => {
      initial[r.key] = { status: "queued" };
    });
    setRowProgress(initial);

    let ok = 0;
    for (let rowIndex = 0; rowIndex < validRows.length; rowIndex++) {
      const row = validRows[rowIndex];
      setActiveRowKey(row.key);
      if (rowIndex > 0) {
        await new Promise((r) => setTimeout(r, 1200));
      }
      const success = await processRow(row, rowIndex);
      if (success) ok += 1;
    }

    setActiveRowKey(null);
    setIsGenerating(false);
    generatingRef.current = false;
    setBatchSummary({ ok, failed: validRows.length - ok, total: validRows.length });

    if (ok === validRows.length) {
      clearQuickAddSession();
    }

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
                const origIdx = rows.findIndex((r) => r.key === row.key);
                const displayNum = origIdx >= 0 ? origIdx + 1 : index + 1;

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
                        {t("admin_quick_add.product_row", { n: displayNum })}
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
                      {prog?.status === "failed" && (
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="text-xs text-destructive break-all flex-1">
                            {prog.error || "Unknown error — check backend logs"}
                          </p>
                          {!isGenerating && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 text-[11px] text-destructive hover:bg-destructive/10 border-destructive/30 px-2 rounded-md shrink-0 flex items-center gap-1"
                              onClick={() => retrySingleRow(row.key)}
                            >
                              <RefreshCw className="h-3 w-3" /> Retry
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {batchSummary && !isGenerating && (
              <div className="flex flex-wrap gap-2 pt-2">
                {failedCount > 0 && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-xl gap-2 shadow-sm"
                    onClick={retryAllFailedRows}
                  >
                    <RefreshCw className="h-4 w-4" /> Opnieuw proberen ({failedCount} mislukt)
                  </Button>
                )}
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
                      {row.sizeLabel && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                          <Ruler className="h-3 w-3 text-amber-600" />
                          <span>{row.sizeLabel}</span>
                        </span>
                      )}
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
                    <div className="flex items-center gap-2">
                      {prog?.status === "failed" && !isGenerating && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => retrySingleRow(row.key)}
                          className="h-7 text-xs rounded-lg gap-1.5 font-semibold shrink-0 shadow-sm"
                          title="Opnieuw proberen voor dit product"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Opnieuw proberen</span>
                        </Button>
                      )}
                      {isGenerating && activeRowKey === row.key && (
                        <span className="text-xs text-primary flex items-center gap-1 font-medium px-2 py-0.5 bg-primary/10 rounded-md">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Bezig...
                        </span>
                      )}
                      {!isGenerating && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openMultiSizeModal(row)}
                          className="h-7 text-xs rounded-lg gap-1 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium shrink-0"
                          title="Generate size variations with linked pricing for this product"
                        >
                          <Ruler className="h-3.5 w-3.5 text-amber-500" />
                          <span>{row.sizeLabel ? `Size: ${row.sizeLabel}` : "Add Sizes"}</span>
                        </Button>
                      )}
                      {rows.length > 1 && !isGenerating && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(row.key)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {(prog?.status === "analyzing" || prog?.status === "images") && row.key === activeRowKey && (
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <StepPill
                        done={prog.status === "images" || prog.status === "done"}
                        active={prog.status === "analyzing"}
                        label={t("admin_quick_add.step_analyze")}
                      />
                      <StepPill
                        done={prog.status === "done"}
                        active={prog.status === "images"}
                        label={t("admin_quick_add.step_images", { count: imageCountLimit })}
                      />
                      <StepPill done={prog.status === "done"} active={false} label={t("admin_quick_add.step_save")} />
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {/* Price */}
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">€</span>
                          <Input
                            value={row.price}
                            onChange={(e) => updateRow(row.key, { price: e.target.value })}
                            placeholder="89.95"
                            className="pl-7 h-9 text-xs"
                            disabled={isGenerating}
                          />
                        </div>

                        {/* Category */}
                        <Select
                          value={row.category || "auto"}
                          onValueChange={(v) => updateRow(row.key, { category: v === "auto" ? "" : v })}
                          disabled={isGenerating}
                        >
                          <SelectTrigger className="h-9 text-xs truncate">
                            <SelectValue placeholder="Category (Auto)" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="auto" className="text-xs italic text-muted-foreground">
                              ✨ Auto (AI Detects Category)
                            </SelectItem>
                            {(() => {
                              const hasChildren = new Set(categories.filter((c) => c.parentId).map((c) => c.parentId));
                              const selectable = categories.filter((c) => !hasChildren.has(c.id));
                              const list = selectable.length > 0 ? selectable : categories;
                              return list.map((c) => (
                                <SelectItem key={c.id || c.slug} value={c.slug} className="text-xs">
                                  {c.name}
                                </SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>

                        {/* Brand */}
                        <Select
                          value={row.brand || "none"}
                          onValueChange={(v) => {
                            const brandVal = v === "none" ? "" : v;
                            updateRow(row.key, { brand: brandVal });
                          }}
                          disabled={isGenerating}
                        >
                          <SelectTrigger className="h-9 text-xs truncate">
                            <SelectValue placeholder={t("admin_product_form.placeholder_brand", "Select Brand")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-xs italic text-muted-foreground">
                              {t("admin_product_form.brand_none", "Auto / No Brand")}
                            </SelectItem>
                            {brands.map((b) => (
                              <SelectItem key={b.id} value={b.name} className="text-xs">
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Series (Collection) */}
                        <Select
                          value={row.series || "auto"}
                          onValueChange={(v) => updateRow(row.key, { series: v === "auto" ? "" : v })}
                          disabled={isGenerating}
                        >
                          <SelectTrigger className="h-9 text-xs truncate">
                            <SelectValue placeholder="Collection / Series (Auto)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto" className="text-xs italic text-muted-foreground">
                              ✨ Auto (AI Picks Collection)
                            </SelectItem>
                            {(() => {
                              const selectedBrandId = brands.find((b) => b.name === row.brand)?.id;
                              const filteredSeries = selectedBrandId
                                ? seriesList.filter((s) => s.brandId === selectedBrandId)
                                : seriesList;
                              const listToShow = filteredSeries.length > 0 ? filteredSeries : seriesList;
                              return listToShow.map((s) => (
                                <SelectItem key={s.id} value={s.name} className="text-xs">
                                  {s.name}
                                </SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                      </div>

                      {((prog?.existingMatches && prog.existingMatches.length > 0) || (liveDuplicates[row.key] && liveDuplicates[row.key].length > 0)) && (
                        <div className="mt-3 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-900 text-xs space-y-1.5">
                          <p className="font-bold flex items-center gap-1.5 text-amber-800">
                            <span>⚠️</span> Similar product already exists in catalog or drafts:
                          </p>
                          <div className="space-y-1 pt-1">
                            {(prog?.existingMatches || liveDuplicates[row.key] || []).map((m) => (
                              <div key={m.id} className="flex items-center justify-between gap-2 border-t border-amber-500/20 pt-1.5">
                                <span className="font-semibold truncate max-w-[260px]" title={m.name}>
                                  • {m.name} (€{m.price})
                                </span>
                                <a
                                  href={m.slug.startsWith("drafts/") ? `/admin/product-drafts/${m.id}` : `/product/${m.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-amber-900 underline hover:text-amber-950 font-bold shrink-0 flex items-center gap-1"
                                >
                                  View Product ↗
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {prog?.status === "failed" && (
                        <div className="mt-3 p-3.5 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                            <div className="min-w-0">
                              <p className="font-bold text-sm">
                                {row.sizeLabel ? `Maat ${row.sizeLabel} generatie mislukt` : "Product generatie mislukt"}
                              </p>
                              <p className="text-[11px] opacity-90 truncate">
                                {prog.error || "Mogelijk tijdelijke AI-timeout of netwerkfout. Klik op retry om opnieuw te proberen."}
                              </p>
                            </div>
                          </div>
                          {!isGenerating && (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-8 text-xs rounded-lg gap-1.5 shrink-0 shadow-sm"
                              onClick={() => retrySingleRow(row.key)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Opnieuw proberen (Retry)</span>
                            </Button>
                          )}
                        </div>
                      )}
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

      {/* ========================================================================= */}
      {/* MODAL: MULTI-SIZE VARIATIONS GENERATOR                                    */}
      {/* ========================================================================= */}
      <Dialog open={isSizeModalOpen} onOpenChange={setIsSizeModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <Ruler className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold">Generate Size Variations</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Easily generate size options (e.g. 40cm, 60cm, 80cm) for this LED lamp. All generated sizes will share the same photo, category & brand, and will be automatically linked as clickable size options on the product page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Target Row Context Header */}
            {(() => {
              const targetRow = rows.find((r) => r.key === sizeTargetRowKey);
              const previewImg = targetRow?.imagePreview;
              const hintText = sizeBaseHint || targetRow?.hint?.trim();
              return (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/70 text-xs">
                  {previewImg && (
                    <img
                      src={previewImg}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover border border-border/80 shrink-0"
                    />
                  )}
                  <div className="truncate flex-1">
                    <p className="text-[11px] text-muted-foreground font-medium">Adding sizes to:</p>
                    <p className="font-semibold text-foreground truncate">
                      {hintText || "Current Product Row"}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0">
                    Sibling Group
                  </span>
                </div>
              );
            })()}

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Quick Size Presets
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {SIZE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applySizePreset(p.sizes)}
                    className="text-[11px] rounded-full border border-border bg-muted/50 px-2.5 py-1 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes & Prices Table */}
            <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span>Sizes & Prices to Generate:</span>
                <button
                  type="button"
                  onClick={() =>
                    setSizeVariations((prev) => [
                      ...prev,
                      { id: `sz-${Date.now()}`, label: "", price: "" },
                    ])
                  }
                  className="text-amber-600 hover:underline flex items-center gap-1 text-[11px] font-medium"
                >
                  <Plus className="h-3 w-3" /> Add Size Row
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sizeVariations.map((sz, idx) => (
                  <div key={sz.id} className="flex items-center gap-2">
                    <span className="w-5 text-muted-foreground font-semibold text-center">{idx + 1}.</span>
                    <Input
                      value={sz.label}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSizeVariations((prev) =>
                          prev.map((item) => (item.id === sz.id ? { ...item, label: val } : item))
                        );
                      }}
                      placeholder="e.g. Ø 60 cm or 3-Ring"
                      className="h-8 text-xs flex-1"
                    />
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">€</span>
                      <Input
                        value={sz.price}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSizeVariations((prev) =>
                            prev.map((item) => (item.id === sz.id ? { ...item, price: val } : item))
                          );
                        }}
                        placeholder="89.95"
                        className="pl-6 h-8 text-xs"
                      />
                    </div>
                    {sizeVariations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() =>
                          setSizeVariations((prev) => prev.filter((item) => item.id !== sz.id))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded-lg border bg-amber-500/10 border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-300">
              💡 <strong>Linked Siblings</strong>: Each size will get its own product entry with matching photos and specifications, and will display interactive size pill buttons on the storefront!
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSizeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApplySizesToBatch}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium gap-1.5"
            >
              <Ruler className="h-3.5 w-3.5" />
              <span>Generate {sizeVariations.filter((s) => s.label.trim()).length} Size Rows</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {mediaPickerRowKey && (
        <MediaLibraryDialog
          open={Boolean(mediaPickerRowKey)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setMediaPickerRowKey(null);
          }}
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
