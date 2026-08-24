import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, Loader2, Play, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import apiClient from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";
import { useSeoJobStatus } from "@/hooks/useSeoJobStatus";
import { SeoJobBanner } from "./SeoJobBanner";
import { SuggestionActions } from "@/components/admin/SuggestionActions";

type AutopilotConfig = {
  enabled: boolean;
  weeklyBlogEnabled: boolean;
  weeklyBlogDay: number;
  autoSeoOptimizeEnabled: boolean;
  autoSeoOptimizeLimit: number;
  generateBacklinkSuggestions: boolean;
  lastRunAt: string | null;
  lastRunSummary: string | null;
  lastBacklinkSuggestions: string[];
};

type Props = { compact?: boolean };

export function SeoAutopilotPanel({ compact = false }: Props) {
  const { t } = useTranslation();
  const dayKeys = [
    "cms_seo.day_sunday",
    "cms_seo.day_monday",
    "cms_seo.day_tuesday",
    "cms_seo.day_wednesday",
    "cms_seo.day_thursday",
    "cms_seo.day_friday",
    "cms_seo.day_saturday",
  ] as const;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [dismissedBacklinks, setDismissedBacklinks] = useState<Set<number>>(() => new Set());
  const [config, setConfig] = useState<AutopilotConfig>({
    enabled: false,
    weeklyBlogEnabled: true,
    weeklyBlogDay: 1,
    autoSeoOptimizeEnabled: true,
    autoSeoOptimizeLimit: 15,
    generateBacklinkSuggestions: true,
    lastRunAt: null,
    lastRunSummary: null,
    lastBacklinkSuggestions: [],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ config: AutopilotConfig }>(ENDPOINTS.AI_SEO_AUTOPILOT);
      if (res.config) setConfig(res.config);
    } catch {
      toast.error(t("cms_seo.autopilot_toast_load_error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const { job, isActive, refresh: refreshJob } = useSeoJobStatus(load);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put<{ config: AutopilotConfig }>(ENDPOINTS.AI_SEO_AUTOPILOT, config);
      setConfig(res.config);
      toast.success(t("cms_seo.autopilot_toast_save_success"));
    } catch (err: any) {
      toast.error(err?.message || t("cms_seo.autopilot_toast_save_error"));
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await apiClient.post<{ summary?: string; message?: string; alreadyRunning?: boolean }>(
        ENDPOINTS.AI_SEO_AUTOPILOT_RUN,
        { force: true },
      );
      toast.success(res.summary || res.message || t("cms_seo.autopilot_toast_queued"));
      refreshJob();
    } catch (err: any) {
      toast.error(err?.message || t("cms_seo.autopilot_toast_run_error"));
    } finally {
      setRunning(false);
    }
  };

  const runBusy = running || isActive;

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground py-6"><Loader2 className="h-5 w-5 animate-spin" /> {t("cms_seo.autopilot_loading")}</div>;
  }

  return (
    <div className="space-y-4">
      <SeoJobBanner job={job} onDismiss={refreshJob} />
      <Alert>
        <Bot className="h-4 w-4" />
        <AlertDescription>
          {t("cms_seo.autopilot_alert")}{" "}
          {!compact ? (
            <>{t("cms_seo.autopilot_alert_playbook")}</>
          ) : (
            <>
              {t("cms_seo.autopilot_alert_full")}{" "}
              <Link to="/admin/cms/seo" className="font-semibold text-primary underline">{t("cms_seo.autopilot_alert_cms_link")}</Link>
            </>
          )}
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> {t("cms_seo.autopilot_title")}</CardTitle>
          <CardDescription>{t("cms_seo.autopilot_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
            <Label>{t("cms_seo.autopilot_enable")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={config.weeklyBlogEnabled} onCheckedChange={(v) => setConfig({ ...config, weeklyBlogEnabled: v })} />
            <Label>{t("cms_seo.autopilot_weekly_blog")}</Label>
          </div>
          {!compact && (
            <div>
              <Label>{t("cms_seo.autopilot_publish_day")}</Label>
              <Select value={String(config.weeklyBlogDay)} onValueChange={(v) => setConfig({ ...config, weeklyBlogDay: Number(v) })}>
                <SelectTrigger className="mt-1 w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dayKeys.map((key, i) => (
                    <SelectItem key={key} value={String(i)}>{t(key)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={config.autoSeoOptimizeEnabled} onCheckedChange={(v) => setConfig({ ...config, autoSeoOptimizeEnabled: v })} />
            <Label>{t("cms_seo.autopilot_auto_optimize", { limit: config.autoSeoOptimizeLimit })}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={config.generateBacklinkSuggestions} onCheckedChange={(v) => setConfig({ ...config, generateBacklinkSuggestions: v })} />
            <Label>{t("cms_seo.autopilot_backlinks")}</Label>
          </div>
          {config.lastRunAt && (
            <p className="text-xs text-muted-foreground">
              {t("cms_seo.autopilot_last_run", {
                date: new Date(config.lastRunAt).toLocaleString(),
                summary: config.lastRunSummary || "",
              })}
            </p>
          )}
          {config.lastBacklinkSuggestions?.length > 0 && (
            <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
              <p className="text-sm font-semibold">{t("cms_seo.autopilot_backlink_ideas")}</p>
              {config.lastBacklinkSuggestions.map((s, i) => {
                if (dismissedBacklinks.has(i)) return null;
                return (
                  <div key={i} className="flex flex-col gap-2 rounded-md border bg-background p-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="text-xs flex-1">{s}</p>
                    <SuggestionActions
                      copyLabel={t("cms_seo.suggestion_copy", { defaultValue: "Copy" })}
                      dismissLabel={t("cms_seo.suggestion_skip", { defaultValue: "Skip" })}
                      onCopy={() => {
                        navigator.clipboard.writeText(s);
                        toast.success(t("cms_seo.suggestion_copied", { defaultValue: "Copied to clipboard" }));
                      }}
                      onDismiss={() => setDismissedBacklinks((prev) => new Set(prev).add(i))}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("cms_seo.autopilot_save")}
            </Button>
            <Button variant="secondary" onClick={runNow} disabled={runBusy} className="gap-2">
              {runBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} {t("cms_seo.autopilot_run_now")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
