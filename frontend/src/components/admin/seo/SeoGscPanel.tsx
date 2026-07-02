import { useCallback, useEffect, useState } from "react";
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
  sourceLabel: string;
  sourceUrl: string;
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

export function SeoGscPanel() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [siteUrl, setSiteUrl] = useState<string | null>(null);
  const [overview, setOverview] = useState<GscOverview | null>(null);
  const [trends, setTrends] = useState<RankTrend[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [links, setLinks] = useState<InternalLinkSuggestion[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const res = await apiClient.get<{ overview: GscOverview }>(ENDPOINTS.AI_SEO_GSC_OVERVIEW);
      setOverview(res.overview);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load Search Console data";
      toast.error(msg);
      setOverview(null);
    }
  }, []);

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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load link suggestions");
    } finally {
      setLinksLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const status = await apiClient.get<{ configured: boolean; siteUrl: string | null }>(
        ENDPOINTS.AI_SEO_GSC_STATUS,
      );
      setConfigured(status.configured);
      setSiteUrl(status.siteUrl);

      if (status.configured) {
        await Promise.all([loadOverview(), loadRankTracking(), loadInternalLinks()]);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load Search Console status");
    } finally {
      setLoading(false);
    }
  }, [loadOverview, loadRankTracking, loadInternalLinks]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSyncRanks = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.post<{ trends: RankTrend[]; history: { lastSyncedAt: string | null }; synced: number }>(
        ENDPOINTS.AI_SEO_RANK_SYNC,
        {},
      );
      setTrends(res.trends || []);
      setLastSyncedAt(res.history?.lastSyncedAt ?? null);
      toast.success(`Synced ${res.synced} keyword rankings from Search Console`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Rank sync failed");
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

  if (!configured) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Search Console not configured</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Add your <strong>GSC site URL</strong> and the same <strong>GA4 service account</strong> used in Admin → Analytics
            under the <strong>Site & Analytics</strong> tab. Grant the service account <em>Full</em> access in Search Console.
          </p>
          <p className="text-xs text-muted-foreground">
            Site URL examples: <code>https://schipenster.com/</code> or <code>sc-domain:schipenster.com</code>
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Connected: <span className="font-mono text-foreground">{siteUrl}</span>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={loadAll}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {overview && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Clicks</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{overview.totals.clicks.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Impressions</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{overview.totals.impressions.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg CTR</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{(overview.totals.ctr * 100).toFixed(1)}%</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Position</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{overview.totals.position.toFixed(1)}</p></CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Search className="h-4 w-4" /> Top queries</CardTitle>
            <CardDescription>Last {overview?.period.days ?? 28} days from Search Console</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {(overview?.topQueries || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No query data yet.</p>
            ) : (
              overview!.topQueries.map((row) => (
                <div key={row.query} className="flex justify-between gap-2 text-sm border-b pb-2 last:border-0">
                  <span className="font-medium truncate">{row.query}</span>
                  <span className="text-muted-foreground shrink-0">
                    {row.clicks} clk · pos {row.position.toFixed(1)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Rank tracking</CardTitle>
              <CardDescription>
                Playbook target keywords
                {lastSyncedAt && ` · last sync ${new Date(lastSyncedAt).toLocaleString()}`}
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={handleSyncRanks} disabled={syncing}>
              {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Sync
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {trends.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sync to pull positions for playbook target keywords.</p>
            ) : (
              trends.map((row) => (
                <div key={row.keyword} className="flex items-center justify-between gap-2 text-sm border-b pb-2 last:border-0">
                  <span className="font-medium truncate">{row.keyword}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <TrendIcon trend={row.trend} />
                    {row.latest?.position ? `pos ${row.latest.position.toFixed(1)}` : "—"}
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
            <CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4" /> Internal linking suggestions</CardTitle>
            <CardDescription>AI-free matches from catalog + playbook keywords + GSC queries (suggestions only — not auto-inserted)</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={loadInternalLinks} disabled={linksLoading}>
            {linksLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suggestions yet — add more products/blogs or connect GSC.</p>
          ) : (
            links.map((item, i) => (
              <div key={`${item.sourceUrl}-${item.targetUrl}-${i}`} className="rounded-lg border p-3 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">From</span>{" "}
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">{item.sourceLabel}</a>
                  {" → "}
                  <a href={item.targetUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">{item.targetLabel}</a>
                </p>
                <p className="text-xs text-muted-foreground">Anchor: &quot;{item.anchorHint}&quot; · {item.reason}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
