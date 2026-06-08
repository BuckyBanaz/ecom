import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [robotsRes, configRes] = await Promise.all([
          apiClient.get<{ robots: string }>(ENDPOINTS.SEO_ROBOTS),
          apiClient.get<{ data: any }>(ENDPOINTS.ADMIN_SEO_CONFIG)
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
            indexable: d.indexable
          });
          setAnalytics({
            ga4: d.ga4,
            gtm: d.gtm,
            metaPixel: d.metaPixel,
            tiktokPixel: d.tiktokPixel
          });
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load SEO configuration");
      }
    };
    fetchData();
  }, []);

  const save = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    try {
      await Promise.all([
        apiClient.put(ENDPOINTS.SEO_ROBOTS, { robots }),
        apiClient.put(ENDPOINTS.ADMIN_SEO_CONFIG, { ...global, ...analytics })
      ]);
      toast.success("SEO settings saved successfully"); 
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

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SEO Settings</h1>
          <p className="text-muted-foreground">Meta tags, social sharing and analytics</p>
        </div>
        <Button type="submit" className="gap-2"><Save className="h-4 w-4" /> Save</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Global meta</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Site name</Label><Input value={global.siteName} onChange={(e) => setGlobal({ ...global, siteName: e.target.value })} className="mt-1" /></div>
            <div><Label>Title template</Label><Input value={global.titleTemplate} onChange={(e) => setGlobal({ ...global, titleTemplate: e.target.value })} className="mt-1" /></div>
          </div>
          <div><Label>Default title</Label><Input value={global.defaultTitle} onChange={(e) => setGlobal({ ...global, defaultTitle: e.target.value })} className="mt-1" /></div>
          <div><Label>Default description</Label><Textarea value={global.defaultDescription} onChange={(e) => setGlobal({ ...global, defaultDescription: e.target.value })} className="mt-1" rows={2} /></div>
          <div><Label>Default keywords</Label><Input value={global.defaultKeywords} onChange={(e) => setGlobal({ ...global, defaultKeywords: e.target.value })} className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Canonical URL</Label><Input value={global.canonical} onChange={(e) => setGlobal({ ...global, canonical: e.target.value })} className="mt-1" /></div>
            <div><Label>Twitter handle</Label><Input value={global.twitterHandle} onChange={(e) => setGlobal({ ...global, twitterHandle: e.target.value })} className="mt-1" /></div>
          </div>
          <div><Label>OG image URL</Label><Input value={global.ogImage} onChange={(e) => setGlobal({ ...global, ogImage: e.target.value })} className="mt-1" placeholder="https://..." /></div>
          <div className="flex items-center gap-2"><Switch checked={global.indexable} onCheckedChange={(v) => setGlobal({ ...global, indexable: v })} /><Label>Allow search engines to index this site</Label></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Analytics & tracking</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Google Analytics 4 ID</Label><Input value={analytics.ga4} onChange={(e) => setAnalytics({ ...analytics, ga4: e.target.value })} className="mt-1" placeholder="G-XXXXXXX" /></div>
            <div><Label>Google Tag Manager ID</Label><Input value={analytics.gtm} onChange={(e) => setAnalytics({ ...analytics, gtm: e.target.value })} className="mt-1" placeholder="GTM-XXXXX" /></div>
            <div><Label>Meta Pixel ID</Label><Input value={analytics.metaPixel} onChange={(e) => setAnalytics({ ...analytics, metaPixel: e.target.value })} className="mt-1" /></div>
            <div><Label>TikTok Pixel ID</Label><Input value={analytics.tiktokPixel} onChange={(e) => setAnalytics({ ...analytics, tiktokPixel: e.target.value })} className="mt-1" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sitemap & robots.txt</CardTitle>
          <Button type="button" variant="outline" onClick={generateSitemap} disabled={generating}>
            {generating ? "Generating..." : "Generate sitemap.xml"}
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea value={robots} onChange={(e) => setRobots(e.target.value)} className="font-mono text-sm min-h-[160px]" />
        </CardContent>
      </Card>
    </form>
  );
};

export default CMSSeo;