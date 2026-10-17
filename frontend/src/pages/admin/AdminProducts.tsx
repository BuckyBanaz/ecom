import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  MessageSquare,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "sonner";
import { productRepository, adminSettingsRepository } from "@/client/apiClient";
import { SafeImage } from "@/components/ui/SafeImage";
import { getApiV1Url } from "@/utils/endpoints";

const PRESET_ISSUES = [
  {
    label: "💎 Crystal -> Ambiance & G9",
    text: "These are crystal lamps with faceted glass prisms. Move to Ambiance Royale collection, set fitting to G9, and write Dutch description highlighting luxury crystal refraction.",
  },
  {
    label: "🏷️ Tafellamp (Table Base)",
    text: "These are table lamps (Tafellampen) with a tabletop base. Set category to table-lamps (Tafellampen), change title to include Tafellamp, and update specs.",
  },
  {
    label: "🔘 Hanglamp (Pendant)",
    text: "These lamps hang from ceiling cables as chandeliers/pendants. Set category to pendant-lights (Hanglampen), ensure title has Hanglamp, and add adjustable cable height to specs.",
  },
  {
    label: "🎨 Color: Zilver / Chroom",
    text: "The finish of these lamps is cool shiny silver chrome (Zilver / Chroom). Set color attribute to Silver and update titles and specs to Zilver / Chroom. Never say Gold.",
  },
  {
    label: "✨ Color: Goud / Messing",
    text: "The finish of these lamps is warm brushed gold / brass (Goud / Messing). Set color attribute to Gold and update titles and specs to Goud / Messing. Never say Silver.",
  },
  {
    label: "🇳🇱 Schip en Ster SOP Standard",
    text: "Review titles, descriptions, and specs according to Schip en Ster SOP. Ensure fluent Dutch text with 'Belangrijkste kenmerken' bullet points, valid categories, and comprehensive technical specs.",
  },
  {
    label: "⚡ Fitting & Dimmer Specs",
    text: "Verify fitting (G9 for Ambiance crystal, E27 for vintage, Integrated LED for rings/Stockholm) and mark Dimbaar: Ja with dimmable specifications in specs and attributes.",
  },
];

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

  // Selection & AI Quick Edit state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [quickEditTargetProduct, setQuickEditTargetProduct] = useState<any | null>(null);
  const [quickEditPrompt, setQuickEditPrompt] = useState("");
  const [quickEditScope, setQuickEditScope] = useState<"selected" | "filtered" | "all">("selected");
  const [quickEditFields, setQuickEditFields] = useState({
    name: true,
    category: true,
    description: true,
    specs: true,
    attributes: true,
    seo: true,
    price: false,
  });
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);

  // Background Job Queue state
  const [jobState, setJobState] = useState<any | null>(null);

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

  const pollJobStatus = async () => {
    try {
      const apiUrl = getApiV1Url();
      const token = localStorage.getItem("admin_token");
      if (!token) return;
      const res = await fetch(`${apiUrl}/ai/seo/job`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.job) {
        const prevStatus = jobState?.status;
        setJobState(data.job);
        // If it just transitioned to completed, auto-refresh products!
        if (
          data.job.status === "completed" &&
          prevStatus !== "completed" &&
          data.job.type === "bulk_product_edit"
        ) {
          toast.success(data.job.summary || "AI Bulk Edit completed successfully!");
          fetchProducts();
        }
      }
    } catch (err) {
      console.error("Job status polling error:", err);
    }
  };

  const handleDismissJob = async () => {
    try {
      const apiUrl = getApiV1Url();
      const token = localStorage.getItem("admin_token");
      await fetch(`${apiUrl}/ai/seo/job/dismiss`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobState(null);
    } catch (err) {
      console.error("Failed to dismiss job:", err);
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
    pollJobStatus();
  }, []);

  // Poll background job when queued or running
  useEffect(() => {
    let interval: any = null;
    if (jobState?.status === "running" || jobState?.status === "queued") {
      interval = setInterval(pollJobStatus, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobState?.status]);

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
  const paginatedProducts =
    pageSize === -1
      ? filtered
      : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(p.id);
            return next;
          });
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

  const handleStartQuickEdit = async () => {
    if (!quickEditPrompt.trim()) {
      toast.error("Please describe what issue exists or what needs fixing.");
      return;
    }

    let targetProductIds: string[] = [];
    let scope: "selected" | "all" | "category" = "selected";

    if (quickEditTargetProduct) {
      targetProductIds = [quickEditTargetProduct.id];
    } else if (quickEditScope === "selected") {
      if (selectedIds.size === 0) {
        toast.error("No products selected. Please select items or change scope.");
        return;
      }
      targetProductIds = Array.from(selectedIds);
    } else if (quickEditScope === "filtered") {
      targetProductIds = filtered.map((p) => p.id);
    } else {
      scope = "all";
      targetProductIds = productsList.map((p) => p.id);
    }

    if (targetProductIds.length === 0) {
      toast.error("No products match the chosen scope.");
      return;
    }

    setIsSubmittingJob(true);
    try {
      const apiUrl = getApiV1Url();
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${apiUrl}/ai/products/bulk-edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productIds: targetProductIds,
          issuePrompt: quickEditPrompt.trim(),
          scope,
          fields: quickEditFields,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to start AI Quick Edit job.");
      }

      if (data.alreadyRunning) {
        toast.warning("An AI job is already running in the background queue. Tracking progress...");
      } else {
        toast.success(
          `AI Edit job queued for ${targetProductIds.length} product(s)! Processing in background.`
        );
      }

      setJobState(data.job);
      setIsQuickEditOpen(false);
      setQuickEditTargetProduct(null);
    } catch (err: any) {
      console.error("Failed to start AI Quick Edit job:", err);
      toast.error(err.message || "Failed to start AI Quick Edit job.");
    } finally {
      setIsSubmittingJob(false);
    }
  };

  return (
    <div>
      {/* Top Header & Action Buttons */}
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
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Edit (AI) */}
            <Button
              variant="outline"
              className="rounded-full gap-2 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium transition-all"
              onClick={() => {
                setQuickEditTargetProduct(null);
                if (selectedIds.size > 0) {
                  setQuickEditScope("selected");
                } else if (filtered.length > 0 && filtered.length < productsList.length) {
                  setQuickEditScope("filtered");
                } else {
                  setQuickEditScope("all");
                }
                setIsQuickEditOpen(true);
              }}
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Quick Edit (AI)</span>
              {selectedIds.size > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-500 px-1.5 py-0.2 text-[11px] font-bold text-white leading-none">
                  {selectedIds.size}
                </span>
              )}
            </Button>

            {/* Quick Add (AI) */}
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

      {/* Background AI Queue Job Progress Banner */}
      {jobState &&
        (jobState.status === "running" ||
          jobState.status === "queued" ||
          (jobState.status === "completed" && jobState.type === "bulk_product_edit") ||
          (jobState.status === "failed" && jobState.type === "bulk_product_edit")) && (
          <div
            className={`mt-4 rounded-2xl border p-4 transition-all shadow-sm ${
              jobState.status === "completed"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                : jobState.status === "failed"
                ? "border-destructive/30 bg-destructive/10 text-destructive-foreground"
                : "border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-primary/5 to-purple-500/10"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {jobState.status === "running" || jobState.status === "queued" ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 animate-pulse">
                    <Sparkles className="h-5 w-5 animate-spin" />
                  </div>
                ) : jobState.status === "completed" ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/20 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">
                      {jobState.status === "running"
                        ? "⚡ AI Quick Edit Running in Background Queue"
                        : jobState.status === "queued"
                        ? "⏳ AI Edit Queued in Backend Scheme..."
                        : jobState.status === "completed"
                        ? "🎉 AI Bulk Edit Complete!"
                        : "❌ AI Edit Job Failed"}
                    </h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        jobState.status === "completed"
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : jobState.status === "failed"
                          ? "bg-destructive/20 text-destructive"
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {jobState.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {jobState.progress?.label ||
                      jobState.summary ||
                      (jobState.status === "running"
                        ? "Processing products safely in the background..."
                        : "")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-2 text-xs">
                  {jobState.succeeded > 0 && (
                    <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-700 dark:text-emerald-300 font-medium">
                      ✓ {jobState.succeeded} updated
                    </span>
                  )}
                  {jobState.failed > 0 && (
                    <span className="rounded-md bg-destructive/15 px-2 py-1 text-destructive font-medium">
                      ✗ {jobState.failed} failed
                    </span>
                  )}
                </div>
                {(jobState.status === "completed" || jobState.status === "failed") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs hover:bg-background/80"
                    onClick={handleDismissJob}
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Dismiss
                  </Button>
                )}
              </div>
            </div>

            {/* Live Progress Bar for Running/Queued Jobs */}
            {(jobState.status === "running" || jobState.status === "queued") && (
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                  <span>
                    Progress: {jobState.progress?.current || 0} of {jobState.progress?.total || 1} products
                  </span>
                  <span>
                    {Math.round(
                      ((jobState.progress?.current || 0) / (jobState.progress?.total || 1)) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((jobState.progress?.current || 0) / (jobState.progress?.total || 1)) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/80 italic pt-0.5">
                  ℹ️ Running via backend job queue scheme. You can safely browse, edit other items, or refresh without interrupting this task.
                </p>
              </div>
            )}
          </div>
        )}

      {/* Search & Bulk Action Banner */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin_products.search_placeholder")}
            className="pl-10"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-muted/70 px-3 py-1.5 rounded-xl border text-xs font-medium">
            <span>{selectedIds.size} selected</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
              onClick={() => {
                setQuickEditTargetProduct(null);
                setQuickEditScope("selected");
                setIsQuickEditOpen(true);
              }}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Quick Edit ({selectedIds.size})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <Checkbox
                  checked={
                    paginatedProducts.length > 0 &&
                    paginatedProducts.every((p) => selectedIds.has(p.id))
                  }
                  onCheckedChange={(checked) => {
                    const next = new Set(selectedIds);
                    if (checked) {
                      paginatedProducts.forEach((p) => next.add(p.id));
                    } else {
                      paginatedProducts.forEach((p) => next.delete(p.id));
                    }
                    setSelectedIds(next);
                  }}
                  aria-label="Select all on page"
                />
              </th>
              <th className="px-4 py-3 text-left font-semibold">{t("admin_products.th_product")}</th>
              <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">
                {t("admin_products.th_category")}
              </th>
              <th className="px-4 py-3 text-left font-semibold">{t("admin_products.th_price")}</th>
              <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">
                {t("admin_products.th_stock")}
              </th>
              <th className="px-4 py-3 text-right font-semibold">{t("admin_products.th_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-4 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
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
                <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                  {search.trim() ? "No products matching your search." : "No products found."}
                </td>
              </tr>
            ) : (
              paginatedProducts.map((p) => {
                const brandName = typeof p.brand === "object" ? p.brand?.name : p.brand;
                const catName = typeof p.category === "object" ? p.category?.name : p.category;
                const isSelected = selectedIds.has(p.id);

                return (
                  <tr
                    key={p.id}
                    className={`border-t hover:bg-muted/30 transition-colors ${
                      isSelected ? "bg-amber-500/5 dark:bg-amber-500/10" : ""
                    }`}
                  >
                    <td className="w-10 px-4 py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedIds);
                          if (checked) next.add(p.id);
                          else next.delete(p.id);
                          setSelectedIds(next);
                        }}
                        aria-label={`Select ${p.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <SafeImage
                          src={p.image}
                          alt={p.name}
                          className="h-10 w-10 rounded-lg object-cover border"
                          fallbackType="product"
                        />
                        <div>
                          <p className="font-semibold leading-snug">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {brandName || t("admin_products.brand_fallback")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize hidden md:table-cell">
                      {(catName || "").replace(/-/g, " ")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">€{(p.price || 0).toFixed(2)}</span>
                      {p.oldPrice && (
                        <span className="ml-1 text-xs text-muted-foreground line-through">
                          €{(p.oldPrice || 0).toFixed(2)}
                        </span>
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
                        {/* Quick Edit (AI) for single product */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                          title="Quick Edit with AI"
                          onClick={() => {
                            setQuickEditTargetProduct(p);
                            setIsQuickEditOpen(true);
                          }}
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>

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
                          onClick={() => window.open(`/product/${p.slug || p.id}`, "_blank")}
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

      {/* Quick Edit (AI) Modal */}
      <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <Sparkles className="h-5 w-5" />
              <DialogTitle className="text-xl">
                {quickEditTargetProduct ? "AI Quick Edit (Single Product)" : "AI Quick Edit (Batch Fix)"}
              </DialogTitle>
            </div>
            <DialogDescription>
              {quickEditTargetProduct
                ? `Specify whatever needs fixing on "${quickEditTargetProduct.name}". AI will inspect the photo, specs, and SOP rules to edit it directly in the background.`
                : "Tell AI what issue exists across the products (collection, lamp type, color finish, specs, Dutch SOP text). It runs safely in the background job queue."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Target Scope Selection (for bulk edit) */}
            {!quickEditTargetProduct ? (
              <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Target Products Scope
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickEditScope("selected")}
                    disabled={selectedIds.size === 0}
                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                      quickEditScope === "selected"
                        ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-sm"
                        : "border-input bg-background/50 hover:bg-background text-muted-foreground"
                    } ${selectedIds.size === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span className="text-xs font-bold">Selected Only</span>
                    <span className="text-[11px] opacity-80">
                      {selectedIds.size} product{selectedIds.size === 1 ? "" : "s"} checked
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickEditScope("filtered")}
                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                      quickEditScope === "filtered"
                        ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-sm"
                        : "border-input bg-background/50 hover:bg-background text-muted-foreground"
                    }`}
                  >
                    <span className="text-xs font-bold">Current Search Filter</span>
                    <span className="text-[11px] opacity-80">{filtered.length} products found</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickEditScope("all")}
                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                      quickEditScope === "all"
                        ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-sm"
                        : "border-input bg-background/50 hover:bg-background text-muted-foreground"
                    }`}
                  >
                    <span className="text-xs font-bold">Entire Catalog</span>
                    <span className="text-[11px] opacity-80">{productsList.length} total products</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                <SafeImage
                  src={quickEditTargetProduct.image}
                  alt={quickEditTargetProduct.name}
                  className="h-12 w-12 rounded-lg object-cover border shrink-0"
                  fallbackType="product"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Target Product</p>
                  <p className="font-semibold text-sm truncate">{quickEditTargetProduct.name}</p>
                  <p className="text-xs text-muted-foreground">
                    €{quickEditTargetProduct.price} · {quickEditTargetProduct.category?.name || "No Category"}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Presets / Tags */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Quick SOP Presets (Click to add)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ISSUES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuickEditPrompt((prev) =>
                        prev ? `${prev}\n${preset.text}` : preset.text
                      );
                    }}
                    className="text-xs rounded-full border border-border bg-muted/60 px-2.5 py-1 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Issue Description Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Describe what is wrong or what to fix <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">Plain text in English, Hindi, or Dutch</span>
              </div>
              <textarea
                value={quickEditPrompt}
                onChange={(e) => setQuickEditPrompt(e.target.value)}
                rows={4}
                placeholder="e.g. Inka sabka naam marbella likha hua h par ye crystal table lamp h jisme G9 bulb lagta h. Isko Ambiance collection mai move karo, category tafellamp karo, aur color gold karo."
                className="w-full rounded-xl border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 resize-y"
              />
            </div>

            {/* Fields to Update Selection */}
            <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fields to Update by AI
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setQuickEditFields({
                      name: true,
                      category: true,
                      description: true,
                      specs: true,
                      attributes: true,
                      seo: true,
                      price: false,
                    })
                  }
                  className="text-[11px] text-amber-600 hover:underline"
                >
                  Reset Defaults
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={quickEditFields.name}
                    onCheckedChange={(c) =>
                      setQuickEditFields((f) => ({ ...f, name: !!c }))
                    }
                  />
                  <span>Product Title (Name)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={quickEditFields.category}
                    onCheckedChange={(c) =>
                      setQuickEditFields((f) => ({ ...f, category: !!c }))
                    }
                  />
                  <span>Category & Collection</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={quickEditFields.description}
                    onCheckedChange={(c) =>
                      setQuickEditFields((f) => ({ ...f, description: !!c }))
                    }
                  />
                  <span>Dutch Descriptions</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={quickEditFields.specs}
                    onCheckedChange={(c) =>
                      setQuickEditFields((f) => ({ ...f, specs: !!c }))
                    }
                  />
                  <span>Specs Table (Fitting, etc.)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={quickEditFields.attributes}
                    onCheckedChange={(c) =>
                      setQuickEditFields((f) => ({ ...f, attributes: !!c }))
                    }
                  />
                  <span>Color & Fitting Filters</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={quickEditFields.seo}
                    onCheckedChange={(c) =>
                      setQuickEditFields((f) => ({ ...f, seo: !!c }))
                    }
                  />
                  <span>SEO Title & Meta</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={quickEditFields.price}
                    onCheckedChange={(c) =>
                      setQuickEditFields((f) => ({ ...f, price: !!c }))
                    }
                  />
                  <span className="text-muted-foreground">Price (if specified)</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsQuickEditOpen(false);
                setQuickEditTargetProduct(null);
              }}
              disabled={isSubmittingJob}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleStartQuickEdit}
              disabled={isSubmittingJob || !quickEditPrompt.trim()}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              {isSubmittingJob ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Queueing Job...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Enqueue AI Background Job
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;