import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Link2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import apiClient from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";
import { toast } from "sonner";
import { SuggestionActions } from "@/components/admin/SuggestionActions";

type GscOverview = {
  siteUrl: string;
  period: { startDate: string; endDate: string; days: number };
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  topPages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>;
};

type RankTrend = {
  keyword: string;
  latest: { position: number; clicks: number; impressions: number } | null;
  previous: { position: number } | null;
  trend: "up" | "down" | "flat" | "unknown";
};

type InternalLinkSuggestion = {
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
  sourceUrl: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  targetUrl: string;
  anchorHint: string;
  reason: string;
  score: number;
};

function TrendIcon({ trend }: { trend: RankTrend["trend"] }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-600" />;
  if (trend === "flat") return <Minus className="h-4 w-4 text-muted-foreground" />;
  return <span className="text-muted-foreground text-xs">—</span>;
}

type GscStatus = {
  configured: boolean;
  connected?: boolean;
  siteUrl: string | null;
  hasCredentials?: boolean;
  hasSiteUrl?: boolean;
  gscSiteUrlExplicit?: boolean;
  error?: string | null;
};

export function SeoGscPanel() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<GscStatus | null>(null);
  const [overview, setOverview] = useState<GscOverview | null>(null);
  const [trends, setTrends] = useState<RankTrend[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [links, setLinks] = useState<InternalLinkSuggestion[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [dismissedLinkKeys, setDismissedLinkKeys] = useState<Set<string>>(() => new Set());
  const [applyingLinkKey, setApplyingLinkKey] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const res = await apiClient.get<{ overview: GscOverview }>(ENDPOINTS.AI_SEO_GSC_OVERVIEW);
      setOverview(res.overview);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("cms_seo.gsc_toast_overview_error");
      toast.error(msg);
      setOverview(null);
    }
  }, [t]);

  const loadRankTracking = useCallback(async () => {
    try {
      const res = await apiClient.get<{ trends: RankTrend[]; history: { lastSyncedAt: string | null } }>(
        ENDPOINTS.AI_SEO_RANK_TRACKING,
      );
      setTrends(res.trends || []);
      setLastSyncedAt(res.history?.lastSyncedAt ?? null);
    } catch {
      setTrends([]);
    }
  }, []);

  const loadInternalLinks = useCallback(async () => {
    setLinksLoading(true);
    try {
      const res = await apiClient.get<{ suggestions: InternalLinkSuggestion[] }>(
        ENDPOINTS.AI_SEO_INTERNAL_LINKS,
      );
      setLinks(res.suggestions || []);
      setDismissedLinkKeys(new Set());
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("cms_seo.gsc_toast_links_error"));
    } finally {
      setLinksLoading(false);
    }
  }, [t]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const gscStatus = await apiClient.get<GscStatus>(ENDPOINTS.AI_SEO_GSC_STATUS);
      setStatus(gscStatus);

      if (gscStatus.connected) {
        await Promise.all([loadOverview(), loadRankTracking(), loadInternalLinks()]);
      } else {
        setOverview(null);
        setTrends([]);
        setLinks([]);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("cms_seo.gsc_toast_status_error"));
    } finally {
      setLoading(false);
    }
  }, [loadOverview, loadRankTracking, loadInternalLinks, t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleApplyInternalLink = async (item: InternalLinkSuggestion, key: string) => {
    setApplyingLinkKey(key);
    try {
      const res = await apiClient.post<{ applied: boolean; alreadyExists?: boolean }>(
        ENDPOINTS.AI_SEO_INTERNAL_LINK_APPLY,
        {
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          targetUrl: item.targetUrl,
          anchorHint: item.anchorHint,
        },
      );
      if (res.alreadyExists) {
        toast.info(t("cms_seo.suggestion_link_exists"));
      } else if (res.applied) {
        toast.success(t("cms_seo.suggestion_link_added"));
      }
      setDismissedLinkKeys((prev) => new Set(prev).add(key));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("cms_seo.suggestion_link_error"));
    } finally {
      setApplyingLinkKey(null);
    }
  };

  const handleSyncRanks = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.post<{ trends: RankTrend[]; history: { lastSyncedAt: string | null }; synced: number }>(
        ENDPOINTS.AI_SEO_RANK_SYNC,
        {},
      );
      setTrends(res.trends || []);
      setLastSyncedAt(res.history?.lastSyncedAt ?? null);
      toast.success(t("cms_seo.gsc_toast_sync_success", { count: res.synced }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("cms_seo.gsc_toast_sync_error"));
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!status?.hasCredentials) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("cms_seo.gsc_no_credentials_title")}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            {t("cms_seo.gsc_no_credentials_desc_before")}
            <Link to="/admin/analytics" className="font-semibold text-primary underline">{t("cms_seo.gsc_no_credentials_link")}</Link>
            {t("cms_seo.gsc_no_credentials_desc_after")}
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (!status.connected) {
    const apiDisabled = status.error?.includes("Search Console API has not been used");
    return (
      <Alert variant={status.hasSiteUrl ? "destructive" : "default"}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {status.hasSiteUrl ? t("cms_seo.gsc_not_connected") : t("cms_seo.gsc_url_missing")}
        </AlertTitle>
        <AlertDescription className="space-y-3 text-sm">
          {status.error && <p className="text-foreground/90">{status.error}</p>}
          {!status.gscSiteUrlExplicit && status.siteUrl && (
            <p className="text-muted-foreground">
              {t("cms_seo.gsc_fallback_canonical", { url: status.siteUrl })}
            </p>
          )}
          {apiDisabled && (
            <p>
              {t("cms_seo.gsc_api_disabled_before")}
              <a
                href="https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=452847782141"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline"
              >
                {t("cms_seo.gsc_api_disabled_link")}
              </a>
              {t("cms_seo.gsc_api_disabled_after")}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t("cms_seo.gsc_url_examples")}</p>
        </AlertDescription>
      </Alert>
    );
  }

  const siteUrl = status.siteUrl;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          {t("cms_seo.gsc_connected")} <span className="font-mono text-foreground">{siteUrl}</span>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={loadAll}>
          <RefreshCw className="h-4 w-4" /> {t("cms_seo.gsc_refresh")}
        </Button>
      </div>

      {overview && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("cms_seo.gsc_clicks")}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{overview.totals.clicks.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("cms_seo.gsc_impressions")}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{overview.totals.impressions.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("cms_seo.gsc_avg_ctr")}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{(overview.totals.ctr * 100).toFixed(1)}%</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("cms_seo.gsc_avg_position")}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{overview.totals.position.toFixed(1)}</p></CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Search className="h-4 w-4" /> {t("cms_seo.gsc_top_queries")}</CardTitle>
            <CardDescription>{t("cms_seo.gsc_top_queries_desc", { days: overview?.period.days ?? 28 })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {(overview?.topQueries || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("cms_seo.gsc_no_queries")}</p>
            ) : (
              overview!.topQueries.map((row) => (
                <div key={row.query} className="flex justify-between gap-2 text-sm border-b pb-2 last:border-0">
                  <span className="font-medium truncate">{row.query}</span>
                  <span className="text-muted-foreground shrink-0">
                    {t("cms_seo.gsc_query_stats", { clicks: row.clicks, position: row.position.toFixed(1) })}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{t("cms_seo.gsc_rank_tracking")}</CardTitle>
              <CardDescription>
                {t("cms_seo.gsc_rank_keywords")}
                {lastSyncedAt && t("cms_seo.gsc_last_sync", { date: new Date(lastSyncedAt).toLocaleString() })}
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={handleSyncRanks} disabled={syncing}>
              {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {t("cms_seo.gsc_sync")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {trends.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("cms_seo.gsc_rank_empty")}</p>
            ) : (
              trends.map((row) => (
                <div key={row.keyword} className="flex items-center justify-between gap-2 text-sm border-b pb-2 last:border-0">
                  <span className="font-medium truncate">{row.keyword}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <TrendIcon trend={row.trend} />
                    {row.latest?.position ? t("cms_seo.gsc_rank_position", { position: row.latest.position.toFixed(1) }) : "—"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4" /> {t("cms_seo.gsc_internal_links")}</CardTitle>
            <CardDescription>{t("cms_seo.gsc_internal_links_desc")}</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={loadInternalLinks} disabled={linksLoading}>
            {linksLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : t("cms_seo.gsc_refresh")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("cms_seo.gsc_links_empty")}</p>
          ) : (
            links.map((item, i) => {
              const key = `${item.sourceUrl}-${item.targetUrl}-${i}`;
              if (dismissedLinkKeys.has(key)) return null;
              const canApply = item.sourceType !== "category";
              const copyText = `${item.sourceLabel} → ${item.targetLabel}\nAnchor: ${item.anchorHint}\n${item.reason}`;
              return (
              <div key={key} className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <p>
                    <span className="text-muted-foreground">{t("cms_seo.gsc_link_from")}</span>{" "}
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">{item.sourceLabel}</a>
                    {" → "}
                    <a href={item.targetUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">{item.targetLabel}</a>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("cms_seo.gsc_link_anchor", { anchor: item.anchorHint, reason: item.reason })}
                  </p>
                  {!canApply && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">{t("cms_seo.suggestion_link_category_hint")}</p>
                  )}
                </div>
                <SuggestionActions
                  addLabel={t("cms_seo.suggestion_add_link", { defaultValue: "Add link" })}
                  copyLabel={t("cms_seo.suggestion_copy", { defaultValue: "Copy" })}
                  dismissLabel={t("cms_seo.suggestion_skip", { defaultValue: "Skip" })}
                  addDisabled={!canApply || applyingLinkKey === key}
                  onAdd={canApply ? () => handleApplyInternalLink(item, key) : undefined}
                  onCopy={() => {
                    navigator.clipboard.writeText(copyText);
                    toast.success(t("cms_seo.suggestion_copied", { defaultValue: "Copied to clipboard" }));
                  }}
                  onDismiss={() => setDismissedLinkKeys((prev) => new Set(prev).add(key))}
                />
                {applyingLinkKey === key && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground sm:hidden" />
                )}
              </div>
            );})
          )}
        </CardContent>
      </Card>
    </div>
  );
}
