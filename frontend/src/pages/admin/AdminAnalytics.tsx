import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Info, LineChart as LineChartIcon, Activity, Users, MonitorSmartphone, Globe, Settings, Loader2 } from "lucide-react";
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import apiClient from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";
import { toast } from "sonner";
import { useAdmin } from "@/context/AdminContext";

type Ga4DashboardData = {
  traffic: Array<{ date: string; pageViews: number; visitors: number }>;
  sources: Array<{ name: string; value: number; color: string }>;
  devices: Array<{ name: string; value: number; color: string }>;
  topPages: Array<{ path: string; views: string; bounceRate: string }>;
};

const EMPTY_GA4: Ga4DashboardData = {
  traffic: [],
  sources: [],
  devices: [],
  topPages: [],
};

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-[420px] rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[320px] rounded-xl" />
        <Skeleton className="h-[320px] rounded-xl" />
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
    </div>
  );
}

const AdminAnalytics = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAdmin();
  const [ga4DataLive, setGa4DataLive] = useState<Ga4DashboardData>(EMPTY_GA4);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [keys, setKeys] = useState({
    ga4PropertyId: "",
    ga4ClientEmail: "",
    ga4PrivateKey: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dataRes, configRes] = await Promise.all([
        apiClient.get<{ ga4Data: Ga4DashboardData | null }>(ENDPOINTS.ADMIN_ANALYTICS_DATA).catch(() => null),
        apiClient.get<{ data: Record<string, string> }>(ENDPOINTS.ADMIN_SEO_CONFIG).catch(() => null),
      ]);

      if (configRes?.data) {
        setKeys({
          ga4PropertyId: configRes.data.ga4PropertyId || "",
          ga4ClientEmail: configRes.data.ga4ClientEmail || "",
          ga4PrivateKey: configRes.data.ga4PrivateKey || "",
        });
      }

      if (dataRes?.ga4Data?.traffic && Array.isArray(dataRes.ga4Data.traffic)) {
        setGa4DataLive(dataRes.ga4Data);
        setIsConnected(true);
      } else {
        setGa4DataLive(EMPTY_GA4);
        setIsConnected(false);
      }
    } catch (err) {
      console.error(err);
      setGa4DataLive(EMPTY_GA4);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const saveKeys = async () => {
    setSaving(true);
    try {
      await apiClient.put(ENDPOINTS.ADMIN_SEO_CONFIG, keys);
      toast.success("GA4 API configuration saved");
      setShowConfig(false);
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save keys");
    } finally {
      setSaving(false);
    }
  };

  const totalViews = isConnected
    ? ga4DataLive.traffic.reduce((acc, curr) => acc + (curr.pageViews || 0), 0)
    : null;
  const totalVisitors = isConnected
    ? ga4DataLive.traffic.reduce((acc, curr) => acc + (curr.visitors || 0), 0)
    : null;

  if (!hasPermission("analytics")) {
    return <p className="text-center py-12 text-muted-foreground">{t("admin_product_form.no_permission")}</p>;
  }

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Website Analytics</h1>
          <p className="text-muted-foreground">
            GA4 reporting inside admin. Storefront tags (Meta, TikTok, etc.) are managed via GTM in CMS → SEO.
          </p>
        </div>
        <Button onClick={() => setShowConfig(true)} variant="outline" className="gap-2">
          <Settings className="h-4 w-4" /> Configure GA4 API
        </Button>
      </div>

      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>GA4 Data API Configuration</DialogTitle>
            <DialogDescription>
              Connect a Google Cloud service account to pull live GA4 metrics into this dashboard. This is separate from your GTM container on the storefront.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>GA4 Property ID</Label>
              <Input
                placeholder="e.g. 351234567"
                value={keys.ga4PropertyId}
                onChange={(e) => setKeys({ ...keys, ga4PropertyId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>GA4 Client Email (Service Account)</Label>
              <Input
                placeholder="analytics-proxy@your-project.iam.gserviceaccount.com"
                value={keys.ga4ClientEmail}
                onChange={(e) => setKeys({ ...keys, ga4ClientEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>GA4 Private Key</Label>
              <Textarea
                placeholder="-----BEGIN PRIVATE KEY-----\n..."
                className="font-mono text-xs h-32"
                value={keys.ga4PrivateKey}
                onChange={(e) => setKeys({ ...keys, ga4PrivateKey: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfig(false)}>Cancel</Button>
            <Button onClick={saveKeys} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isConnected && (
        <Alert variant="default" className="bg-blue-50/50 text-blue-800 border-blue-200">
          <Info className="h-4 w-4 stroke-blue-600" />
          <AlertTitle>GA4 API not connected</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Configure the GA4 Data API service account above to see live traffic here. Your storefront can still send events through GTM — that does not automatically populate this admin chart.
            </p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowConfig(true)}>
              Configure GA4 API
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalViews != null ? totalViews.toLocaleString() : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? "Last 7 days" : "Connect GA4 API to view"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalVisitors != null ? totalVisitors.toLocaleString() : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? "Last 7 days" : "Connect GA4 API to view"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-indigo-500" />
            <CardTitle>Google Analytics (Traffic)</CardTitle>
          </div>
          <CardDescription>Daily page views vs unique visitors over the last 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full flex items-center justify-center">
            {ga4DataLive.traffic.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ga4DataLive.traffic} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="pageViews" name="Page Views" stroke="#6366f1" strokeWidth={2} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="visitors" name="Unique Visitors" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center space-y-2 px-4">
                <p className="text-sm text-muted-foreground">No GA4 traffic data yet.</p>
                <p className="text-xs text-muted-foreground/80">
                  Connect the GA4 Data API, or verify your GTM container fires GA4 on the live storefront.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-emerald-500" />
              <CardTitle>Traffic Sources</CardTitle>
            </div>
            <CardDescription>Where your visitors are coming from.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full flex items-center justify-center">
              {ga4DataLive.sources.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ga4DataLive.sources}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {ga4DataLive.sources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No traffic source data yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5 text-indigo-500" />
              <CardTitle>Device Breakdown</CardTitle>
            </div>
            <CardDescription>Desktop vs mobile user sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full flex items-center justify-center">
              {ga4DataLive.devices.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ga4DataLive.devices}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {ga4DataLive.devices.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No device data yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-rose-500" />
              <CardTitle>Top Pages</CardTitle>
            </div>
            <CardDescription>Most viewed pages on your store.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-12 text-sm font-medium text-muted-foreground pb-2 border-b">
                <div className="col-span-6">Page Path</div>
                <div className="col-span-3 text-right">Views</div>
                <div className="col-span-3 text-right">Bounce</div>
              </div>
              {ga4DataLive.topPages.length > 0 ? (
                ga4DataLive.topPages.map((page, i) => (
                  <div key={i} className="grid grid-cols-12 text-sm items-center py-2 border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="col-span-6 font-medium truncate pr-2 text-primary">{page.path}</div>
                    <div className="col-span-3 text-right font-semibold">{page.views}</div>
                    <div className="col-span-3 text-right text-muted-foreground">{page.bounceRate}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No page views recorded yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
