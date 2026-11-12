import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Radio, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import apiClient from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";

export type GeoRow = { name: string; country?: string; countryCode: string; users: number; sessions?: number };

type Realtime = { activeUsers: number; countries: GeoRow[]; cities: GeoRow[]; fetchedAt: string };

const REFRESH_MS = 60_000;

/** GA4 labels visitors it cannot place as "(not set)" */
function placeName(row: GeoRow, unknown: string) {
  return row.name === "(not set)" ? unknown : row.name;
}

const countryLabel = (row: GeoRow) => (row.country && row.country !== "(not set)" ? row.country : undefined);

/** GA4 can return several "(not set)" rows for one country (different hidden cityIds); show them as one */
export function mergeGeoRows(rows: GeoRow[]): GeoRow[] {
  const merged = new Map<string, GeoRow>();
  for (const r of rows) {
    const key = `${r.name}|${r.country ?? ""}|${r.countryCode}`;
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, users: prev.users + r.users } : { ...r });
  }
  return [...merged.values()].sort((a, b) => b.users - a.users);
}

function CodeBadge({ code }: { code: string }) {
  if (!code || code === "(not set)") return <span className="w-7 shrink-0" />;
  return (
    <span className="w-7 shrink-0 rounded bg-muted px-1 py-0.5 text-center font-mono text-[10px] font-semibold text-muted-foreground">
      {code}
    </span>
  );
}

/** One row with a proportional bar; `max` is the largest value in the list */
function GeoBarRow({ label, sub, code, value, max, total }: { label: string; sub?: string; code: string; value: number; max: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <li className="space-y-1">
      <div className="flex items-center gap-2 text-sm">
        <CodeBadge code={code} />
        <span className="min-w-0 flex-1 truncate font-medium">
          {label}
          {sub && <span className="ml-1 font-normal text-muted-foreground">· {sub}</span>}
        </span>
        <span className="shrink-0 tabular-nums font-semibold">{value.toLocaleString()}</span>
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div className="ml-9 h-1.5 rounded-full bg-muted">
        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${max > 0 ? Math.max(3, (value / max) * 100) : 0}%` }} />
      </div>
    </li>
  );
}

function GeoList({ rows: rawRows, withCountry, empty }: { rows: GeoRow[]; withCountry?: boolean; empty: string }) {
  const { t } = useTranslation();
  const unknown = t("admin_analytics.geo.unknown");
  const rows = mergeGeoRows(rawRows);
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.users));
  const total = rows.reduce((sum, r) => sum + r.users, 0);
  return (
    <ul className="space-y-3">
      {rows.slice(0, 10).map((r, i) => (
        <GeoBarRow
          key={`${r.name}-${r.countryCode}-${i}`}
          label={placeName(r, unknown)}
          sub={withCountry ? countryLabel(r) : undefined}
          code={r.countryCode}
          value={r.users}
          max={max}
          total={total}
        />
      ))}
    </ul>
  );
}

export type RealtimeVisitors = {
  data: Realtime | null;
  loading: boolean;
  failed: boolean;
  reload: () => void;
};

/** GA4 realtime visitors (last 30 minutes), refreshed every minute while the tab is visible */
export function useRealtimeVisitors(enabled: boolean): RealtimeVisitors {
  const [data, setData] = useState<Realtime | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ connected: boolean; realtime: Realtime | null }>(ENDPOINTS.ADMIN_ANALYTICS_REALTIME);
      setData(res.realtime);
      setFailed(!res.connected);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [enabled]);

  return { data, loading, failed, reload: load };
}

/** Visitors on the site right now, by country and city */
export function LiveVisitorsCard({ live }: { live: RealtimeVisitors }) {
  const { t } = useTranslation();
  const { data, loading, failed, reload: load } = live;

  const unknown = t("admin_analytics.geo.unknown");
  const updated = data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {!!data?.activeUsers && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${data?.activeUsers ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            </span>
            <CardTitle>{t("admin_analytics.geo.live_title")}</CardTitle>
          </div>
          <CardDescription>{t("admin_analytics.geo.live_desc")}</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading} title={t("admin_analytics.geo.refresh")}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {failed && !data ? (
          <p className="text-sm text-muted-foreground">{t("admin_analytics.geo.not_connected")}</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums">{data ? data.activeUsers.toLocaleString() : "—"}</span>
              <span className="text-sm text-muted-foreground">{t("admin_analytics.geo.live_unit", { count: data?.activeUsers ?? 0 })}</span>
            </div>
            {data && data.activeUsers > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin_analytics.geo.countries")}</p>
                  <ul className="space-y-1.5">
                    {mergeGeoRows(data.countries).slice(0, 6).map((r, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CodeBadge code={r.countryCode} />
                        <span className="flex-1 truncate">{placeName(r, unknown)}</span>
                        <span className="tabular-nums font-semibold">{r.users}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin_analytics.geo.cities")}</p>
                  <ul className="space-y-1.5">
                    {mergeGeoRows(data.cities).slice(0, 6).map((r, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">
                          {placeName(r, unknown)}
                          {countryLabel(r) && <span className="text-muted-foreground"> · {countryLabel(r)}</span>}
                        </span>
                        <span className="tabular-nums font-semibold">{r.users}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {updated && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Radio className="h-3 w-3" />
                {t("admin_analytics.geo.updated", { time: updated })}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Visitors by country / city over the last 30 days, as tabs in one card (sits beside the globe) */
export function VisitorLocationsCard({ countries, cities }: { countries: GeoRow[]; cities: GeoRow[] }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"countries" | "cities">("countries");
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="space-y-1.5">
          <CardTitle>{t(`admin_analytics.geo.${tab}_title`)}</CardTitle>
          <CardDescription>{t(`admin_analytics.geo.${tab}_desc`)}</CardDescription>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "countries" | "cities")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="countries">{t("admin_analytics.geo.countries")}</TabsTrigger>
            <TabsTrigger value="cities">{t("admin_analytics.geo.cities")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {tab === "countries" ? (
          <GeoList rows={countries} empty={t("admin_analytics.geo.empty")} />
        ) : (
          <GeoList rows={cities} withCountry empty={t("admin_analytics.geo.empty")} />
        )}
      </CardContent>
    </Card>
  );
}
