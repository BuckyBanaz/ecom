import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Info, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ENDPOINTS } from "@/utils/endpoints";
import apiClient from "@/client/apiClient";
import { SeoPlaybookPanel } from "@/components/admin/seo/SeoPlaybookPanel";
import { SeoAuditPanel } from "@/components/admin/seo/SeoAuditPanel";
import { SeoAutopilotPanel } from "@/components/admin/seo/SeoAutopilotPanel";

const CMSSeo = () => {
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
  const [robots, setRobots] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [robotsRes, configRes] = await Promise.all([
          apiClient.get<{ robots: string }>(ENDPOINTS.SEO_ROBOTS),
          apiClient.get<{ data: any }>(ENDPOINTS.ADMIN_SEO_CONFIG),
        ]);
        if (robotsRes.robots) setRobots(robotsRes.robots);
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
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load SEO configuration");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const saveSiteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all([
        apiClient.put(ENDPOINTS.SEO_ROBOTS, { robots }),
        apiClient.put(ENDPOINTS.ADMIN_SEO_CONFIG, { ...global, ...analytics }),
      ]);
      toast.success("Site settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
  };

  const generateSitemap = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post<{ message: string }>(ENDPOINTS.SEO_SITEMAP, {});
      toast.success(res.message || "sitemap.xml generated");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate sitemap");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground text-sm">Loading SEO…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          SEO & AI Expert
        </h1>
        <p className="text-muted-foreground mt-1">
          Global playbook, page audit, autopilot, analytics, and technical SEO — all in one place.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Homepage meta → <Link to="/admin/cms/homepage" className="font-semibold text-primary underline">CMS → Homepage</Link>.
          After changing site-wide static meta, rebuild & redeploy the frontend for Google.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="playbook" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="playbook">Playbook & Keywords</TabsTrigger>
          <TabsTrigger value="audit">Page Audit</TabsTrigger>
          <TabsTrigger value="autopilot">Autopilot</TabsTrigger>
          <TabsTrigger value="site">Site & Analytics</TabsTrigger>
          <TabsTrigger value="technical">Sitemap & Robots</TabsTrigger>
        </TabsList>

        <TabsContent value="playbook" className="mt-0"><SeoPlaybookPanel /></TabsContent>
        <TabsContent value="audit" className="mt-0"><SeoAuditPanel /></TabsContent>
        <TabsContent value="autopilot" className="mt-0"><SeoAutopilotPanel /></TabsContent>

        <TabsContent value="site" className="mt-0">
          <form onSubmit={saveSiteConfig} className="space-y-4">
            <div className="flex justify-end">
              <Button type="submit" className="gap-2"><Save className="h-4 w-4" /> Save site settings</Button>
            </div>
            <Card>
              <CardHeader><CardTitle>Global meta (fallback)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Site name</Label><Input value={global.siteName} onChange={(e) => setGlobal({ ...global, siteName: e.target.value })} className="mt-1" /></div>
                  <div><Label>Title template</Label><Input value={global.titleTemplate} onChange={(e) => setGlobal({ ...global, titleTemplate: e.target.value })} className="mt-1" /></div>
                </div>
                <div><Label>Default title</Label><Input value={global.defaultTitle} onChange={(e) => setGlobal({ ...global, defaultTitle: e.target.value })} className="mt-1" /></div>
                <div><Label>Default description</Label><Textarea value={global.defaultDescription} onChange={(e) => setGlobal({ ...global, defaultDescription: e.target.value })} className="mt-1" rows={2} /></div>
                <div><Label>Default keywords</Label><Input value={global.defaultKeywords} onChange={(e) => setGlobal({ ...global, defaultKeywords: e.target.value })} className="mt-1" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Canonical URL</Label><Input value={global.canonical} onChange={(e) => setGlobal({ ...global, canonical: e.target.value })} className="mt-1" /></div>
                  <div><Label>Twitter handle</Label><Input value={global.twitterHandle} onChange={(e) => setGlobal({ ...global, twitterHandle: e.target.value })} className="mt-1" /></div>
                </div>
                <div><Label>Default OG image URL</Label><Input value={global.ogImage} onChange={(e) => setGlobal({ ...global, ogImage: e.target.value })} className="mt-1" /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={global.indexable} onCheckedChange={(v) => setGlobal({ ...global, indexable: v })} />
                  <Label>Allow search engines to index</Label>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Analytics & tracking</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>GA4 ID</Label><Input value={analytics.ga4} onChange={(e) => setAnalytics({ ...analytics, ga4: e.target.value })} className="mt-1" /></div>
                <div><Label>GTM ID</Label><Input value={analytics.gtm} onChange={(e) => setAnalytics({ ...analytics, gtm: e.target.value })} className="mt-1" /></div>
                <div><Label>Meta Pixel</Label><Input value={analytics.metaPixel} onChange={(e) => setAnalytics({ ...analytics, metaPixel: e.target.value })} className="mt-1" /></div>
                <div><Label>TikTok Pixel</Label><Input value={analytics.tiktokPixel} onChange={(e) => setAnalytics({ ...analytics, tiktokPixel: e.target.value })} className="mt-1" /></div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="technical" className="mt-0">
          <form onSubmit={saveSiteConfig}>
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><CardTitle>Sitemap & robots.txt</CardTitle><CardDescription>Regenerate after adding products or pages.</CardDescription></div>
                <Button type="button" variant="outline" onClick={generateSitemap} disabled={generating}>{generating ? "Generating…" : "Generate sitemap.xml"}</Button>
              </CardHeader>
              <CardContent>
                <Label className="mb-2 block">robots.txt</Label>
                <Textarea value={robots} onChange={(e) => setRobots(e.target.value)} className="font-mono text-sm min-h-[160px]" />
                <Button type="submit" className="mt-4 gap-2"><Save className="h-4 w-4" /> Save robots.txt</Button>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CMSSeo;
