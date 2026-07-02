import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Info, Sparkles, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { ENDPOINTS } from "@/utils/endpoints";
import apiClient from "@/client/apiClient";
import { SeoPlaybookPanel } from "@/components/admin/seo/SeoPlaybookPanel";
import { SeoAuditPanel } from "@/components/admin/seo/SeoAuditPanel";
import { SeoAutopilotPanel } from "@/components/admin/seo/SeoAutopilotPanel";
import { SeoGscPanel } from "@/components/admin/seo/SeoGscPanel";

const CMSSeo = () => {
  const { t } = useTranslation();
  const [global, setGlobal] = useState({
    siteName: "",
    titleTemplate: "",
    defaultTitle: "",
    defaultDescription: "",
    defaultKeywords: "",
    ogImage: "",
    canonical: "",
    twitterHandle: "",
    indexable: true,
  });
  const [analytics, setAnalytics] = useState({ ga4: "", gtm: "", metaPixel: "", tiktokPixel: "" });
  const [apiKeys, setApiKeys] = useState({ ga4PropertyId: "", ga4ClientEmail: "", ga4PrivateKey: "", gscSiteUrl: "" });
  const [robots, setRobots] = useState("");
  const [llms, setLlms] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingRobots, setGeneratingRobots] = useState(false);
  const [generatingLlms, setGeneratingLlms] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [robotsRes, llmsRes, configRes] = await Promise.all([
          apiClient.get<{ robots: string }>(ENDPOINTS.SEO_ROBOTS),
          apiClient.get<{ llms: string }>(ENDPOINTS.SEO_LLMS),
          apiClient.get<{ data: any }>(ENDPOINTS.ADMIN_SEO_CONFIG),
        ]);
        if (robotsRes.robots) setRobots(robotsRes.robots);
        if (llmsRes.llms) setLlms(llmsRes.llms);
        if (configRes.data) {
          const d = configRes.data;
          setGlobal({
            siteName: d.siteName,
            titleTemplate: d.titleTemplate,
            defaultTitle: d.defaultTitle,
            defaultDescription: d.defaultDescription,
            defaultKeywords: d.defaultKeywords,
            canonical: d.canonical,
            twitterHandle: d.twitterHandle,
            ogImage: d.ogImage,
            indexable: d.indexable,
          });
          setAnalytics({ ga4: d.ga4, gtm: d.gtm, metaPixel: d.metaPixel, tiktokPixel: d.tiktokPixel });
          setApiKeys({
            ga4PropertyId: d.ga4PropertyId || "",
            ga4ClientEmail: d.ga4ClientEmail || "",
            ga4PrivateKey: "",
            gscSiteUrl: d.gscSiteUrl || "",
          });
        }
      } catch (err: any) {
        toast.error(err.message || t("cms_seo.toast_load_error"));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [t]);

  const saveSiteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(ENDPOINTS.ADMIN_SEO_CONFIG, { ...global, ...analytics, ...apiKeys });
      toast.success(t("cms_seo.toast_save_success"));
    } catch (err: any) {
      toast.error(err.message || t("cms_seo.toast_save_error"));
    }
  };

  const saveTechnicalFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all([
        apiClient.put(ENDPOINTS.SEO_ROBOTS, { robots }),
        apiClient.put(ENDPOINTS.SEO_LLMS, { llms }),
      ]);
      toast.success(t("cms_seo.toast_technical_save_success"));
    } catch (err: any) {
      toast.error(err.message || t("cms_seo.toast_save_error"));
    }
  };

  const generateSitemap = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post<{ message: string }>(ENDPOINTS.SEO_SITEMAP, {});
      toast.success(res.message || t("cms_seo.toast_sitemap_success"));
    } catch (err: any) {
      toast.error(err.message || t("cms_seo.toast_sitemap_error"));
    } finally {
      setGenerating(false);
    }
  };

  const generateRobotsWithAi = async (save = false) => {
    setGeneratingRobots(true);
    try {
      const res = await apiClient.post<{ robots: string; saved?: boolean }>(ENDPOINTS.AI_SEO_GENERATE_ROBOTS, {
        existingContent: robots,
        canonicalUrl: global.canonical || undefined,
        save,
      });
      setRobots(res.robots);
      toast.success(save ? t("cms_seo.toast_robots_ai_saved") : t("cms_seo.toast_robots_ai_done"));
    } catch (err: any) {
      toast.error(err.message || t("cms_seo.toast_robots_ai_error"));
    } finally {
      setGeneratingRobots(false);
    }
  };

  const generateLlmsWithAi = async (save = false) => {
    setGeneratingLlms(true);
    try {
      const res = await apiClient.post<{ llms: string; saved?: boolean }>(ENDPOINTS.AI_SEO_GENERATE_LLMS, {
        existingContent: llms,
        canonicalUrl: global.canonical || undefined,
        save,
      });
      setLlms(res.llms);
      toast.success(save ? t("cms_seo.toast_llms_ai_saved") : t("cms_seo.toast_llms_ai_done"));
    } catch (err: any) {
      toast.error(err.message || t("cms_seo.toast_llms_ai_error"));
    } finally {
      setGeneratingLlms(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground text-sm">{t("cms_seo.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          {t("cms_seo.page_title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("cms_seo.page_subtitle")}</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t("cms_seo.alert_before")}
          <Link to="/admin/cms/homepage" className="font-semibold text-primary underline">
            {t("cms_seo.alert_homepage_link")}
          </Link>
          {t("cms_seo.alert_after")}
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="playbook" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="playbook">{t("cms_seo.tab_playbook")}</TabsTrigger>
          <TabsTrigger value="audit">{t("cms_seo.tab_audit")}</TabsTrigger>
          <TabsTrigger value="autopilot">{t("cms_seo.tab_autopilot")}</TabsTrigger>
          <TabsTrigger value="gsc">{t("cms_seo.tab_gsc")}</TabsTrigger>
          <TabsTrigger value="site">{t("cms_seo.tab_site")}</TabsTrigger>
          <TabsTrigger value="technical">{t("cms_seo.tab_technical")}</TabsTrigger>
        </TabsList>

        <TabsContent value="playbook" className="mt-0"><SeoPlaybookPanel /></TabsContent>
        <TabsContent value="audit" className="mt-0"><SeoAuditPanel /></TabsContent>
        <TabsContent value="autopilot" className="mt-0"><SeoAutopilotPanel /></TabsContent>
        <TabsContent value="gsc" className="mt-0"><SeoGscPanel /></TabsContent>

        <TabsContent value="site" className="mt-0">
          <form onSubmit={saveSiteConfig} className="space-y-4">
            <div className="flex justify-end">
              <Button type="submit" className="gap-2"><Save className="h-4 w-4" /> {t("cms_seo.site_save")}</Button>
            </div>
            <Card>
              <CardHeader><CardTitle>{t("cms_seo.site_global_meta")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>{t("cms_seo.site_site_name")}</Label><Input value={global.siteName} onChange={(e) => setGlobal({ ...global, siteName: e.target.value })} className="mt-1" /></div>
                  <div><Label>{t("cms_seo.site_title_template")}</Label><Input value={global.titleTemplate} onChange={(e) => setGlobal({ ...global, titleTemplate: e.target.value })} className="mt-1" /></div>
                </div>
                <div><Label>{t("cms_seo.site_default_title")}</Label><Input value={global.defaultTitle} onChange={(e) => setGlobal({ ...global, defaultTitle: e.target.value })} className="mt-1" /></div>
                <div><Label>{t("cms_seo.site_default_description")}</Label><Textarea value={global.defaultDescription} onChange={(e) => setGlobal({ ...global, defaultDescription: e.target.value })} className="mt-1" rows={2} /></div>
                <div><Label>{t("cms_seo.site_default_keywords")}</Label><Input value={global.defaultKeywords} onChange={(e) => setGlobal({ ...global, defaultKeywords: e.target.value })} className="mt-1" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>{t("cms_seo.site_canonical")}</Label><Input value={global.canonical} onChange={(e) => setGlobal({ ...global, canonical: e.target.value })} className="mt-1" /></div>
                  <div><Label>{t("cms_seo.site_twitter")}</Label><Input value={global.twitterHandle} onChange={(e) => setGlobal({ ...global, twitterHandle: e.target.value })} className="mt-1" /></div>
                </div>
                <div><Label>{t("cms_seo.site_og_image")}</Label><Input value={global.ogImage} onChange={(e) => setGlobal({ ...global, ogImage: e.target.value })} className="mt-1" /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={global.indexable} onCheckedChange={(v) => setGlobal({ ...global, indexable: v })} />
                  <Label>{t("cms_seo.site_indexable")}</Label>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("cms_seo.site_analytics_title")}</CardTitle>
                <CardDescription>{t("cms_seo.site_analytics_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>{t("cms_seo.site_ga4_id")}</Label><Input value={analytics.ga4} onChange={(e) => setAnalytics({ ...analytics, ga4: e.target.value })} className="mt-1" placeholder="G-XXXXXXXX" /></div>
                <div><Label>{t("cms_seo.site_gtm_id")}</Label><Input value={analytics.gtm} onChange={(e) => setAnalytics({ ...analytics, gtm: e.target.value })} className="mt-1" placeholder="GTM-XXXXXXX" /></div>
                <div><Label>{t("cms_seo.site_meta_pixel")}</Label><Input value={analytics.metaPixel} onChange={(e) => setAnalytics({ ...analytics, metaPixel: e.target.value })} className="mt-1" /></div>
                <div><Label>{t("cms_seo.site_tiktok_pixel")}</Label><Input value={analytics.tiktokPixel} onChange={(e) => setAnalytics({ ...analytics, tiktokPixel: e.target.value })} className="mt-1" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("cms_seo.site_credentials_title")}</CardTitle>
                <CardDescription>
                  {t("cms_seo.site_credentials_desc_before")}
                  <Link to="/admin/analytics" className="text-primary underline font-medium">{t("cms_seo.site_credentials_desc_link")}</Link>
                  {t("cms_seo.site_credentials_desc_after")}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>{t("cms_seo.site_gsc_url")}</Label><Input value={apiKeys.gscSiteUrl} onChange={(e) => setApiKeys({ ...apiKeys, gscSiteUrl: e.target.value })} className="mt-1" placeholder="https://yoursite.com/" /></div>
                <div><Label>{t("cms_seo.site_ga4_property")}</Label><Input value={apiKeys.ga4PropertyId} onChange={(e) => setApiKeys({ ...apiKeys, ga4PropertyId: e.target.value })} className="mt-1" /></div>
                <div className="sm:col-span-2"><Label>{t("cms_seo.site_service_email")}</Label><Input value={apiKeys.ga4ClientEmail} onChange={(e) => setApiKeys({ ...apiKeys, ga4ClientEmail: e.target.value })} className="mt-1" /></div>
                <div className="sm:col-span-2">
                  <Label>{t("cms_seo.site_service_key")}</Label>
                  <Textarea value={apiKeys.ga4PrivateKey} onChange={(e) => setApiKeys({ ...apiKeys, ga4PrivateKey: e.target.value })} className="mt-1 font-mono text-xs min-h-[100px]" placeholder={t("cms_seo.site_service_key_placeholder")} />
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="technical" className="mt-0 space-y-4">
          <form onSubmit={saveTechnicalFiles}>
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{t("cms_seo.technical_title")}</CardTitle>
                  <CardDescription>{t("cms_seo.technical_desc")}</CardDescription>
                </div>
                <Button type="button" variant="outline" onClick={generateSitemap} disabled={generating}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {generating ? t("cms_seo.technical_generating") : t("cms_seo.technical_generate")}
                </Button>
              </CardHeader>
            </Card>

            <Card className="mt-4">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">{t("cms_seo.technical_robots")}</CardTitle>
                  <CardDescription>{t("cms_seo.technical_robots_desc")}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button type="button" variant="secondary" size="sm" className="gap-1" disabled={generatingRobots} onClick={() => generateRobotsWithAi(false)}>
                    {generatingRobots ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    {t("cms_seo.technical_ai_generate")}
                  </Button>
                  <Button type="button" size="sm" className="gap-1" disabled={generatingRobots} onClick={() => generateRobotsWithAi(true)}>
                    {generatingRobots ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {t("cms_seo.technical_ai_generate_save")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea value={robots} onChange={(e) => setRobots(e.target.value)} className="font-mono text-sm min-h-[180px]" />
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">{t("cms_seo.technical_llms")}</CardTitle>
                  <CardDescription>{t("cms_seo.technical_llms_desc")}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button type="button" variant="secondary" size="sm" className="gap-1" disabled={generatingLlms} onClick={() => generateLlmsWithAi(false)}>
                    {generatingLlms ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    {t("cms_seo.technical_ai_generate")}
                  </Button>
                  <Button type="button" size="sm" className="gap-1" disabled={generatingLlms} onClick={() => generateLlmsWithAi(true)}>
                    {generatingLlms ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {t("cms_seo.technical_ai_generate_save")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea value={llms} onChange={(e) => setLlms(e.target.value)} className="font-mono text-sm min-h-[220px]" />
              </CardContent>
            </Card>

            <Button type="submit" className="mt-4 gap-2">
              <Save className="h-4 w-4" /> {t("cms_seo.technical_save_all")}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CMSSeo;
