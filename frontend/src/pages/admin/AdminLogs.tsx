import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { RefreshCw, Trash2, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logsRepository } from "@/client/apiClient";
import { useAdmin } from "@/context/AdminContext";

type LogLevel = "info" | "warn" | "error";
type LogType = "request" | "error" | "system";

interface AppLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  type: LogType;
  message: string;
  method?: string;
  url?: string;
  statusCode?: number;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

interface LogStats {
  totalStored: number;
  maxStored: number;
  lastHour: {
    total: number;
    errors: number;
    warnings: number;
    requests: number;
    avgDurationMs: number;
  };
}

const levelVariant = (level: LogLevel) => {
  if (level === "error") return "destructive" as const;
  if (level === "warn") return "secondary" as const;
  return "outline" as const;
};

export default function AdminLogs() {
  const { t } = useTranslation();
  const { user } = useAdmin();
  const isSuperAdmin = user?.role === "superadmin";

  const [logs, setLogs] = useState<AppLogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [level, setLevel] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const params: Record<string, string | number> = { limit: 200 };
      if (level !== "all") params.level = level;
      if (type !== "all") params.type = type;
      if (search.trim()) params.search = search.trim();

      const [listRes, statsRes] = await Promise.all([
        logsRepository.list(params),
        logsRepository.stats(),
      ]);

      if (listRes.success) {
        setLogs(listRes.logs || []);
        setTotal(listRes.total ?? 0);
      }
      if (statsRes.success) {
        setStats(statsRes.stats);
      }
    } catch (err: any) {
      toast.error(err.message || t("admin_logs.toast_load_failed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [level, type, search, t]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const timer = setInterval(() => fetchLogs(true), 15000);
    return () => clearInterval(timer);
  }, [fetchLogs]);

  const handleClear = async () => {
    if (!isSuperAdmin) return;
    if (!window.confirm(t("admin_logs.confirm_clear"))) return;

    try {
      await logsRepository.clear();
      toast.success(t("admin_logs.toast_cleared"));
      fetchLogs();
    } catch (err: any) {
      toast.error(err.message || t("admin_logs.toast_clear_failed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ScrollText className="h-6 w-6" />
            {t("admin_logs.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("admin_logs.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchLogs(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {t("admin_logs.refresh")}
          </Button>
          {isSuperAdmin && (
            <Button variant="destructive" size="sm" onClick={handleClear}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t("admin_logs.clear")}
            </Button>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{t("admin_logs.stored")}</p>
            <p className="text-2xl font-bold">{stats.totalStored} / {stats.maxStored}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{t("admin_logs.last_hour")}</p>
            <p className="text-2xl font-bold">{stats.lastHour.total}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{t("admin_logs.errors_last_hour")}</p>
            <p className="text-2xl font-bold text-destructive">{stats.lastHour.errors}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{t("admin_logs.avg_response")}</p>
            <p className="text-2xl font-bold">{Math.round(stats.lastHour.avgDurationMs)}ms</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder={t("admin_logs.search_placeholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder={t("admin_logs.filter_level")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin_logs.all_levels")}</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder={t("admin_logs.filter_type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin_logs.all_types")}</SelectItem>
            <SelectItem value="request">{t("admin_logs.type_request")}</SelectItem>
            <SelectItem value="error">{t("admin_logs.type_error")}</SelectItem>
            <SelectItem value="system">{t("admin_logs.type_system")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3 text-sm text-muted-foreground">
          {t("admin_logs.showing", { count: logs.length, total })}
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">{t("admin_logs.loading")}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{t("admin_logs.empty")}</div>
        ) : (
          <div className="max-h-[calc(100vh-22rem)] overflow-y-auto divide-y">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3 text-sm hover:bg-muted/40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {format(new Date(log.timestamp), "dd MMM HH:mm:ss")}
                  </span>
                  <Badge variant={levelVariant(log.level)}>{log.level}</Badge>
                  <Badge variant="outline">{log.type}</Badge>
                  {log.method && <Badge variant="outline">{log.method}</Badge>}
                  {log.statusCode != null && (
                    <Badge variant={log.statusCode >= 400 ? "destructive" : "outline"}>
                      {log.statusCode}
                    </Badge>
                  )}
                  {log.durationMs != null && (
                    <span className="text-xs text-muted-foreground">{log.durationMs}ms</span>
                  )}
                </div>
                <p className="mt-1 break-all font-mono text-xs">{log.message}</p>
                {log.url && (
                  <p className="mt-0.5 break-all text-xs text-muted-foreground">{log.url}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
