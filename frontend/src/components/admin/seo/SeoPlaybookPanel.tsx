import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Save, RefreshCw, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import apiClient from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";

export type SeoPlaybook = {
  siteName: string;
  titleTemplate: string;
  globalKeywords: string;
  targetRankKeywords: string;
  descriptionCta: string;
  brandVoice: string;
  geoFocus: string;
  mergeGlobalKeywords: boolean;
};

export function SeoPlaybookPanel() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [playbook, setPlaybook] = useState<SeoPlaybook>({
    siteName: "Schip & Ster",
    titleTemplate: "%s | Schip & Ster",
    globalKeywords: "",
    targetRankKeywords: "",
    descriptionCta: "",
    brandVoice: "",
    geoFocus: "",
    mergeGlobalKeywords: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ playbook: SeoPlaybook }>(ENDPOINTS.AI_SEO_PLAYBOOK);
      if (res.playbook) setPlaybook(res.playbook);
    } catch {
      toast.error(t("cms_seo.playbook_toast_load_error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put(ENDPOINTS.AI_SEO_PLAYBOOK, playbook);
      toast.success(t("cms_seo.playbook_toast_save_success"));
    } catch (err: any) {
      toast.error(err?.message || t("cms_seo.playbook_toast_save_error"));
    } finally {
      setSaving(false);
    }
  };

  const syncAll = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.post<{ updated: number; total: number }>(ENDPOINTS.AI_SEO_PLAYBOOK_SYNC);
      toast.success(t("cms_seo.playbook_toast_sync_success", { updated: res.updated, total: res.total }));
    } catch (err: any) {
      toast.error(err?.message || t("cms_seo.playbook_toast_sync_error"));
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-5 w-5 animate-spin" /> {t("cms_seo.playbook_loading")}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription>{t("cms_seo.playbook_alert")}</AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>{t("cms_seo.playbook_title")}</CardTitle>
          <CardDescription>{t("cms_seo.playbook_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("cms_seo.playbook_site_name")}</Label>
              <Input className="mt-1" value={playbook.siteName} onChange={(e) => setPlaybook({ ...playbook, siteName: e.target.value })} />
            </div>
            <div>
              <Label>{t("cms_seo.playbook_title_template")}</Label>
              <Input className="mt-1" value={playbook.titleTemplate} onChange={(e) => setPlaybook({ ...playbook, titleTemplate: e.target.value })} placeholder="%s | Schip & Ster" />
            </div>
          </div>
          <div>
            <Label>{t("cms_seo.playbook_target_keywords")}</Label>
            <p className="text-xs text-muted-foreground mb-1">{t("cms_seo.playbook_target_keywords_hint")}</p>
            <Textarea
              className="mt-1"
              rows={2}
              value={playbook.targetRankKeywords}
              onChange={(e) => setPlaybook({ ...playbook, targetRankKeywords: e.target.value })}
              placeholder="schip & ster, schipenster, LED verlichting kopen, hanglamp woonkamer"
            />
          </div>
          <div>
            <Label>{t("cms_seo.playbook_global_keywords")}</Label>
            <Input className="mt-1" value={playbook.globalKeywords} onChange={(e) => setPlaybook({ ...playbook, globalKeywords: e.target.value })} />
          </div>
          <div>
            <Label>{t("cms_seo.playbook_description_cta")}</Label>
            <Input className="mt-1" value={playbook.descriptionCta} onChange={(e) => setPlaybook({ ...playbook, descriptionCta: e.target.value })} />
          </div>
          <div>
            <Label>{t("cms_seo.playbook_brand_voice")}</Label>
            <Textarea className="mt-1" rows={2} value={playbook.brandVoice} onChange={(e) => setPlaybook({ ...playbook, brandVoice: e.target.value })} />
          </div>
          <div>
            <Label>{t("cms_seo.playbook_geo_focus")}</Label>
            <Textarea className="mt-1" rows={2} value={playbook.geoFocus} onChange={(e) => setPlaybook({ ...playbook, geoFocus: e.target.value })} placeholder="Netherlands, Dutch + English, AI search visibility, FAQ answers" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={playbook.mergeGlobalKeywords} onCheckedChange={(v) => setPlaybook({ ...playbook, mergeGlobalKeywords: v })} />
            <Label>{t("cms_seo.playbook_merge_keywords")}</Label>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("cms_seo.playbook_save")}
            </Button>
            <Button type="button" variant="secondary" disabled={syncing} onClick={syncAll} className="gap-2">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t("cms_seo.playbook_sync_all")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
