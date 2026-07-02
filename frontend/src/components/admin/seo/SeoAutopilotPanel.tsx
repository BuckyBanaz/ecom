import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Props = { compact?: boolean };

export function SeoAutopilotPanel({ compact = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
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
      toast.error("Failed to load autopilot settings");
    } finally {
      setLoading(false);
    }
  }, []);

  const { job, isActive, refresh: refreshJob } = useSeoJobStatus(load);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put<{ config: AutopilotConfig }>(ENDPOINTS.AI_SEO_AUTOPILOT, config);
      setConfig(res.config);
      toast.success("Autopilot settings saved");
    } catch (err: any) {
      toast.error(err?.message || "Save failed");
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
      toast.success(res.summary || res.message || "Autopilot queued");
      refreshJob();
    } catch (err: any) {
      toast.error(err?.message || "Autopilot run failed");
    } finally {
      setRunning(false);
    }
  };

  const runBusy = running || isActive;

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground py-6"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <SeoJobBanner job={job} onDismiss={refreshJob} />
      <Alert>
        <Bot className="h-4 w-4" />
        <AlertDescription>
          Autopilot runs weekly SEO optimization, publishes AI blog posts, and generates backlink outreach ideas.
          Actual backlinks require manual outreach — AI cannot create links automatically.
          {!compact && (
            <> Configure target keywords in the <strong>Playbook</strong> tab.</>
          )}
          {compact && (
            <> Full SEO controls: <Link to="/admin/cms/seo" className="font-semibold text-primary underline">CMS → SEO</Link></>
          )}
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> SEO Autopilot</CardTitle>
          <CardDescription>Automate SEO, GEO, AEO, and weekly blog publishing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
            <Label>Enable scheduled autopilot</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={config.weeklyBlogEnabled} onCheckedChange={(v) => setConfig({ ...config, weeklyBlogEnabled: v })} />
            <Label>Weekly AI blog post</Label>
          </div>
          {!compact && (
            <div>
              <Label>Publish day</Label>
              <Select value={String(config.weeklyBlogDay)} onValueChange={(v) => setConfig({ ...config, weeklyBlogDay: Number(v) })}>
                <SelectTrigger className="mt-1 w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={config.autoSeoOptimizeEnabled} onCheckedChange={(v) => setConfig({ ...config, autoSeoOptimizeEnabled: v })} />
            <Label>Auto SEO optimize pages with issues ({config.autoSeoOptimizeLimit} per run)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={config.generateBacklinkSuggestions} onCheckedChange={(v) => setConfig({ ...config, generateBacklinkSuggestions: v })} />
            <Label>Generate backlink outreach suggestions</Label>
          </div>
          {config.lastRunAt && (
            <p className="text-xs text-muted-foreground">Last run: {new Date(config.lastRunAt).toLocaleString()} — {config.lastRunSummary}</p>
          )}
          {config.lastBacklinkSuggestions?.length > 0 && (
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-sm font-semibold mb-2">Backlink outreach ideas</p>
              <ul className="text-xs space-y-1 list-disc pl-4">{config.lastBacklinkSuggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </Button>
            <Button variant="secondary" onClick={runNow} disabled={runBusy} className="gap-2">
              {runBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
