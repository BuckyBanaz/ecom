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
import { Save, Info } from "lucide-react";
import { toast } from "sonner";
import { ENDPOINTS } from "@/utils/endpoints";
import apiClient from "@/client/apiClient";

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
          setAnalytics({
            ga4: d.ga4,
            gtm: d.gtm,
            metaPixel: d.metaPixel,
            tiktokPixel: d.tiktokPixel,
          });
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load SEO configuration");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all([
        apiClient.put(ENDPOINTS.SEO_ROBOTS, { robots }),
        apiClient.put(ENDPOINTS.ADMIN_SEO_CONFIG, { ...global, ...analytics }),
      ]);
      toast.success("Site SEO settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save SEO configuration");
    }
  };

  const generateSitemap = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post<{ message: string }>(ENDPOINTS.SEO_SITEMAP, {});
      toast.success(res.message || "sitemap.xml generated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate sitemap");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground text-sm">Loading SEO settings…</div>;
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Site SEO & Analytics</h1>
          <p className="text-muted-foreground">
            Whole-site defaults, tracking pixels, sitemap & robots — not the homepage landing page.
          </p>
        </div>
        <Button type="submit" className="gap-2 shrink-0">
          <Save className="h-4 w-4" /> Save
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Homepage</strong> title & description (what Google shows for <code className="text-xs bg-muted px-1 rounded">/</code>) → edit on{" "}
          <Link to="/admin/cms/homepage" className="font-semibold text-primary underline">
            CMS → Homepage
          </Link>
          . Product/blog SEO is on each item&apos;s edit screen.
        </AlertDescription>
      </Alert>

      <Alert variant="default" className="border-amber-500/50 bg-amber-500/5">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription>
          Google reads <strong>static HTML</strong>, not JavaScript. After saving site name, description, or OG image here,{" "}
          <strong>rebuild &amp; redeploy the frontend</strong> (Docker build picks up these values). Then use{" "}
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">
            Search Console
          </a>{" "}
          → URL Inspection → Request indexing. Favicon and snippet updates can take 1–4 weeks.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="site" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="site">Site defaults</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="technical">Sitemap & robots</TabsTrigger>
        </TabsList>

        <TabsContent value="site" className="space-y-4 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Global meta (fallback)</CardTitle>
              <CardDescription>
                Used on pages without their own SEO. Homepage uses its own fields on the Homepage screen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Site name</Label><Input value={global.siteName} onChange={(e) => setGlobal({ ...global, siteName: e.target.value })} className="mt-1" /></div>
                <div><Label>Title template</Label><Input value={global.titleTemplate} onChange={(e) => setGlobal({ ...global, titleTemplate: e.target.value })} className="mt-1" placeholder="%s | Schip & Ster" /></div>
              </div>
              <div><Label>Default title</Label><Input value={global.defaultTitle} onChange={(e) => setGlobal({ ...global, defaultTitle: e.target.value })} className="mt-1" /></div>
              <div><Label>Default description</Label><Textarea value={global.defaultDescription} onChange={(e) => setGlobal({ ...global, defaultDescription: e.target.value })} className="mt-1" rows={2} /></div>
              <div><Label>Default keywords</Label><Input value={global.defaultKeywords} onChange={(e) => setGlobal({ ...global, defaultKeywords: e.target.value })} className="mt-1" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Canonical URL</Label><Input value={global.canonical} onChange={(e) => setGlobal({ ...global, canonical: e.target.value })} className="mt-1" placeholder="https://schipenster.com" /></div>
                <div><Label>Twitter handle</Label><Input value={global.twitterHandle} onChange={(e) => setGlobal({ ...global, twitterHandle: e.target.value })} className="mt-1" /></div>
              </div>
              <div><Label>Default OG image URL</Label><Input value={global.ogImage} onChange={(e) => setGlobal({ ...global, ogImage: e.target.value })} className="mt-1" placeholder="https://schipenster.com/og-image.png" /></div>
              <div className="flex items-center gap-2">
                <Switch checked={global.indexable} onCheckedChange={(v) => setGlobal({ ...global, indexable: v })} />
                <Label>Allow search engines to index this site</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-0">
          <Card>
            <CardHeader><CardTitle>Analytics & tracking</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Google Analytics 4 ID</Label><Input value={analytics.ga4} onChange={(e) => setAnalytics({ ...analytics, ga4: e.target.value })} className="mt-1" placeholder="G-XXXXXXX" /></div>
                <div><Label>Google Tag Manager ID</Label><Input value={analytics.gtm} onChange={(e) => setAnalytics({ ...analytics, gtm: e.target.value })} className="mt-1" placeholder="GTM-XXXXX" /></div>
                <div><Label>Meta Pixel ID</Label><Input value={analytics.metaPixel} onChange={(e) => setAnalytics({ ...analytics, metaPixel: e.target.value })} className="mt-1" /></div>
                <div><Label>TikTok Pixel ID</Label><Input value={analytics.tiktokPixel} onChange={(e) => setAnalytics({ ...analytics, tiktokPixel: e.target.value })} className="mt-1" /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Sitemap & robots.txt</CardTitle>
                <CardDescription>Regenerate sitemap after adding products or pages.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={generateSitemap} disabled={generating} className="shrink-0">
                {generating ? "Generating…" : "Generate sitemap.xml"}
              </Button>
            </CardHeader>
            <CardContent>
              <Label className="mb-2 block">robots.txt</Label>
              <p className="mb-2 text-xs text-muted-foreground">
                Comments must start with <code>#</code>. Example:{" "}
                <code># LLM context: https://schipenster.com/llms.txt</code> — not plain text (Lighthouse marks that invalid).
              </p>
              <Textarea value={robots} onChange={(e) => setRobots(e.target.value)} className="font-mono text-sm min-h-[160px]" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
};

export default CMSSeo;
