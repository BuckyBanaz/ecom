import { useCallback, useEffect, useState } from "react";
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

const TYPE_LABELS: Record<EntityType, string> = {
  product: "Product",
  category: "Category",
  blog: "Blog",
  cms_page: "CMS Page",
  homepage: "Homepage",
};

const scoreBadge = (score: number) => {
  if (score >= 90) return "bg-green-100 text-green-800";
  if (score >= 70) return "bg-blue-100 text-blue-800";
  if (score >= 40) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
};

export function SeoAuditPanel() {
  const [loading, setLoading] = useState(true);
  const [bulkStarting, setBulkStarting] = useState(false);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState("all");
  const [onlyIssues, setOnlyIssues] = useState(true);
  const [summary, setSummary] = useState<{ total: number; excellent: number; good: number; needsWork: number; critical: number } | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);

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
      toast.error(err?.message || "Audit failed");
    } finally {
      setLoading(false);
    }
  }, [entityFilter, onlyIssues]);

  const { job, isActive, refresh: refreshJob } = useSeoJobStatus(fetchAudit);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const optimizeOne = async (item: AuditItem) => {
    const key = `${item.entityType}:${item.entityId}`;
    setOptimizingId(key);
    try {
      await apiClient.post(ENDPOINTS.AI_SEO_OPTIMIZE, { entityType: item.entityType, entityId: item.entityId, save: true });
      toast.success(`Optimized: ${item.label}`);
      fetchAudit();
    } catch (err: any) {
      toast.error(err?.message || "Optimization failed");
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
      });
      toast.success(res.message || (res.alreadyRunning ? "Job already running" : "Bulk optimize queued"));
      refreshJob();
    } catch (err: any) {
      toast.error(err?.message || "Bulk optimize failed");
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
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
        </Button>
        <Button onClick={bulkOptimize} disabled={bulkBusy || loading} className="gap-2">
          {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          AI optimize (10)
        </Button>
      </div>
      {summary && (
        <div className="grid gap-3 sm:grid-cols-5">
          {[
            ["Total", summary.total, ""],
            ["Excellent", summary.excellent, "text-green-600"],
            ["Good", summary.good, "text-blue-600"],
            ["Needs work", summary.needsWork, "text-amber-600"],
            ["Critical", summary.critical, "text-red-600"],
          ].map(([label, val, cls]) => (
            <Card key={label as string}><CardHeader className="pb-2"><CardDescription>{label}</CardDescription><CardTitle className={cn("text-2xl", cls)}>{val}</CardTitle></CardHeader></Card>
          ))}
        </div>
      )}
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-3">
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="product">Products</SelectItem>
              <SelectItem value="category">Categories</SelectItem>
              <SelectItem value="blog">Blogs</SelectItem>
              <SelectItem value="cms_page">CMS pages</SelectItem>
              <SelectItem value="homepage">Homepage</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={onlyIssues ? "default" : "outline"} size="sm" onClick={() => setOnlyIssues((v) => !v)}>
            {onlyIssues ? "Issues only" : "All pages"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Page audit</CardTitle><CardDescription>SEO, GEO & AEO scores per page</CardDescription></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12 gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Scanning…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground"><CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />All pages look good</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4">Page</th><th className="pb-3 pr-4">Type</th><th className="pb-3 pr-4">Score</th><th className="pb-3 pr-4">Issues</th><th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const key = `${item.entityType}:${item.entityId}`;
                    return (
                      <tr key={key} className="border-b align-top">
                        <td className="py-3 pr-4"><div className="font-medium">{item.label}</div><div className="text-xs text-muted-foreground">{item.url}</div></td>
                        <td className="py-3 pr-4"><Badge variant="outline">{TYPE_LABELS[item.entityType]}</Badge></td>
                        <td className="py-3 pr-4"><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", scoreBadge(item.score))}>{item.score}</span></td>
                        <td className="py-3 pr-4 text-xs">{item.issues.length ? item.issues.join(", ") : "OK"}</td>
                        <td className="py-3">
                          <Button size="sm" variant="outline" className="gap-1" disabled={optimizingId === key || bulkBusy} onClick={() => optimizeOne(item)}>
                            {optimizingId === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Optimize
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
