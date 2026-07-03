import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Loader2, CheckCircle2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import apiClient from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";
import { cn } from "@/lib/utils";
import { useSeoJobStatus } from "@/hooks/useSeoJobStatus";
import { SeoJobBanner } from "./SeoJobBanner";

type EntityType = "product" | "category" | "blog" | "cms_page" | "homepage";

type AuditItem = {
  entityType: EntityType;
  entityId: string;
  label: string;
  url: string;
  seoTitle: string | null;
  seoDescription: string | null;
  score: number;
  issues: string[];
};

const scoreBadge = (score: number) => {
  if (score >= 90) return "bg-green-100 text-green-800";
  if (score >= 70) return "bg-blue-100 text-blue-800";
  if (score >= 40) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
};

export function SeoAuditPanel() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [bulkStarting, setBulkStarting] = useState(false);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState("all");
  const [onlyIssues, setOnlyIssues] = useState(true);
  const [customPrompt, setCustomPrompt] = useState("");
  const [summary, setSummary] = useState<{ total: number; excellent: number; good: number; needsWork: number; critical: number } | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);

  const typeLabel = (type: EntityType) => {
    const map: Record<EntityType, string> = {
      product: t("cms_seo.audit_type_product"),
      category: t("cms_seo.audit_type_category"),
      blog: t("cms_seo.audit_type_blog"),
      cms_page: t("cms_seo.audit_type_cms"),
      homepage: t("cms_seo.audit_type_homepage"),
    };
    return map[type];
  };

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter !== "all") params.set("entityType", entityFilter);
      if (onlyIssues) params.set("onlyIssues", "true");
      const res = await apiClient.get<{ summary: typeof summary; items: AuditItem[] }>(`${ENDPOINTS.AI_SEO_AUDIT}?${params}`);
      setSummary(res.summary);
      setItems(res.items || []);
    } catch (err: any) {
      toast.error(err?.message || t("cms_seo.audit_toast_failed"));
    } finally {
      setLoading(false);
    }
  }, [entityFilter, onlyIssues, t]);

  const { job, isActive, refresh: refreshJob } = useSeoJobStatus(fetchAudit);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const optimizeOne = async (item: AuditItem) => {
    const key = `${item.entityType}:${item.entityId}`;
    setOptimizingId(key);
    try {
      await apiClient.post(ENDPOINTS.AI_SEO_OPTIMIZE, { entityType: item.entityType, entityId: item.entityId, save: true, customPrompt: customPrompt || undefined });
      toast.success(t("cms_seo.audit_toast_optimized", { label: item.label }));
      fetchAudit();
    } catch (err: any) {
      toast.error(err?.message || t("cms_seo.audit_toast_optimize_error"));
    } finally {
      setOptimizingId(null);
    }
  };

  const bulkOptimize = async () => {
    setBulkStarting(true);
    try {
      const res = await apiClient.post<{ message?: string; alreadyRunning?: boolean }>(ENDPOINTS.AI_SEO_BULK_OPTIMIZE, {
        entityType: entityFilter !== "all" ? entityFilter : undefined,
        onlyIssues: true,
        limit: 10,
        customPrompt: customPrompt || undefined,
      });
      toast.success(res.message || (res.alreadyRunning ? t("cms_seo.audit_toast_bulk_running") : t("cms_seo.audit_toast_bulk_queued")));
      refreshJob();
    } catch (err: any) {
      toast.error(err?.message || t("cms_seo.audit_toast_bulk_error"));
    } finally {
      setBulkStarting(false);
    }
  };

  const bulkBusy = bulkStarting || isActive;

  return (
    <div className="space-y-4">
      <SeoJobBanner job={job} onDismiss={refreshJob} />
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={fetchAudit} disabled={loading} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> {t("cms_seo.audit_refresh")}
        </Button>
        <Button onClick={bulkOptimize} disabled={bulkBusy || loading} className="gap-2">
          {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {t("cms_seo.audit_bulk_optimize")}
        </Button>
      </div>
      {summary && (
        <div className="grid gap-3 sm:grid-cols-5">
          {[
            [t("cms_seo.audit_summary_total"), summary.total, ""],
            [t("cms_seo.audit_summary_excellent"), summary.excellent, "text-green-600"],
            [t("cms_seo.audit_summary_good"), summary.good, "text-blue-600"],
            [t("cms_seo.audit_summary_needs_work"), summary.needsWork, "text-amber-600"],
            [t("cms_seo.audit_summary_critical"), summary.critical, "text-red-600"],
          ].map(([label, val, cls]) => (
            <Card key={label as string}><CardHeader className="pb-2"><CardDescription>{label}</CardDescription><CardTitle className={cn("text-2xl", cls)}>{val}</CardTitle></CardHeader></Card>
          ))}
        </div>
      )}
      <Card>
        <CardContent className="pt-6 flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("cms_seo.audit_filter_all")}</SelectItem>
                <SelectItem value="product">{t("cms_seo.audit_filter_products")}</SelectItem>
                <SelectItem value="category">{t("cms_seo.audit_filter_categories")}</SelectItem>
                <SelectItem value="blog">{t("cms_seo.audit_filter_blogs")}</SelectItem>
                <SelectItem value="cms_page">{t("cms_seo.audit_filter_cms")}</SelectItem>
                <SelectItem value="homepage">{t("cms_seo.audit_filter_homepage")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={onlyIssues ? "default" : "outline"} size="sm" onClick={() => setOnlyIssues((v) => !v)}>
              {onlyIssues ? t("cms_seo.audit_issues_only") : t("cms_seo.audit_all_pages")}
            </Button>
          </div>
          
          <div className="w-full">
            <label className="text-sm font-medium mb-1 block text-muted-foreground">
              Custom AI Prompt / Instructions (Optional)
            </label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="E.g., Focus specifically on long-tail keywords about modern pendant lights, keep the tone luxurious..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("cms_seo.audit_title")}</CardTitle><CardDescription>{t("cms_seo.audit_desc")}</CardDescription></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12 gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> {t("cms_seo.audit_scanning")}</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground"><CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />{t("cms_seo.audit_all_good")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4">{t("cms_seo.audit_col_page")}</th>
                    <th className="pb-3 pr-4">{t("cms_seo.audit_col_type")}</th>
                    <th className="pb-3 pr-4">{t("cms_seo.audit_col_score")}</th>
                    <th className="pb-3 pr-4">{t("cms_seo.audit_col_issues")}</th>
                    <th className="pb-3">{t("cms_seo.audit_col_action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const key = `${item.entityType}:${item.entityId}`;
                    return (
                      <tr key={key} className="border-b align-top">
                        <td className="py-3 pr-4"><div className="font-medium">{item.label}</div><div className="text-xs text-muted-foreground">{item.url}</div></td>
                        <td className="py-3 pr-4"><Badge variant="outline">{typeLabel(item.entityType)}</Badge></td>
                        <td className="py-3 pr-4"><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", scoreBadge(item.score))}>{item.score}</span></td>
                        <td className="py-3 pr-4 text-xs">{item.issues.length ? item.issues.join(", ") : t("cms_seo.audit_ok")}</td>
                        <td className="py-3">
                          <Button size="sm" variant="outline" className="gap-1" disabled={optimizingId === key || bulkBusy} onClick={() => optimizeOne(item)}>
                            {optimizingId === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} {t("cms_seo.audit_optimize")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
