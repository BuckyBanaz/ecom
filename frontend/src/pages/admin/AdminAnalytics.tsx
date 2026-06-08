import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Info, BarChart3, LineChart as LineChartIcon, Activity, Users, MousePointerClick, CreditCard, TrendingUp, MonitorSmartphone, Map, Globe, Settings } from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import apiClient from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";
import { toast } from "sonner";

// Mock Data for Google Analytics (Traffic)
const gaData = [
  { date: "1 Jun", pageViews: 1200, visitors: 800 },
  { date: "2 Jun", pageViews: 1400, visitors: 950 },
  { date: "3 Jun", pageViews: 1100, visitors: 700 },
  { date: "4 Jun", pageViews: 1800, visitors: 1200 },
  { date: "5 Jun", pageViews: 2200, visitors: 1500 },
  { date: "6 Jun", pageViews: 1900, visitors: 1300 },
  { date: "7 Jun", pageViews: 2400, visitors: 1700 },
];

// Mock Data for Meta Pixel (Conversions)
const metaData = [
  { date: "1 Jun", viewContent: 400, addToCart: 80, purchase: 12 },
  { date: "2 Jun", viewContent: 450, addToCart: 95, purchase: 15 },
  { date: "3 Jun", viewContent: 350, addToCart: 70, purchase: 10 },
  { date: "4 Jun", viewContent: 600, addToCart: 120, purchase: 22 },
  { date: "5 Jun", viewContent: 750, addToCart: 150, purchase: 28 },
  { date: "6 Jun", viewContent: 650, addToCart: 130, purchase: 25 },
  { date: "7 Jun", viewContent: 800, addToCart: 170, purchase: 32 },
];

// Mock Data for TikTok Pixel (Ad Performance)
const tiktokData = [
  { date: "1 Jun", impressions: 5000, clicks: 150 },
  { date: "2 Jun", impressions: 5500, clicks: 180 },
  { date: "3 Jun", impressions: 4200, clicks: 120 },
  { date: "4 Jun", impressions: 7000, clicks: 250 },
  { date: "5 Jun", impressions: 8500, clicks: 320 },
  { date: "6 Jun", impressions: 7800, clicks: 290 },
  { date: "7 Jun", impressions: 9500, clicks: 380 },
];

// Mock Data for Traffic Sources
const sourceData = [
  { name: 'Organic Search', value: 4500, color: '#10b981' },
  { name: 'Direct', value: 2100, color: '#3b82f6' },
  { name: 'Social Media', value: 1800, color: '#f43f5e' },
  { name: 'Referral', value: 900, color: '#f59e0b' },
  { name: 'Email', value: 500, color: '#8b5cf6' },
];

// Mock Data for Device Breakdown
const deviceData = [
  { name: 'Mobile', value: 65, color: '#6366f1' },
  { name: 'Desktop', value: 30, color: '#14b8a6' },
  { name: 'Tablet', value: 5, color: '#f97316' },
];

// Mock Data for Top Pages
const topPages = [
  { path: '/', views: '45,210', bounceRate: '32%' },
  { path: '/category/deals', views: '18,500', bounceRate: '41%' },
  { path: '/product/smart-lamp', views: '12,300', bounceRate: '28%' },
  { path: '/checkout', views: '8,150', bounceRate: '15%' },
  { path: '/blogs/lighting-tips', views: '5,420', bounceRate: '65%' },
];

const AdminAnalytics = () => {
  const [ga4DataLive, setGa4DataLive] = useState<any>({ traffic: [], sources: [], devices: [], topPages: [] });
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // Dynamic Totals
  const totalViews = isConnected ? ga4DataLive.traffic?.reduce((acc: any, curr: any) => acc + (curr.pageViews || 0), 0) : 11050;
  const totalVisitors = isConnected ? ga4DataLive.traffic?.reduce((acc: any, curr: any) => acc + (curr.visitors || 0), 0) : 7450;
  const [keys, setKeys] = useState({
    ga4PropertyId: "",
    ga4ClientEmail: "",
    ga4PrivateKey: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch both data and config in parallel
      const [dataRes, configRes] = await Promise.all([
        apiClient.get<{ ga4Data: any[] | null }>(ENDPOINTS.ADMIN_ANALYTICS_DATA).catch(() => null),
        apiClient.get<{ data: any }>(ENDPOINTS.ADMIN_SEO_CONFIG).catch(() => null)
      ]);

      if (configRes && configRes.data) {
        setKeys({
          ga4PropertyId: configRes.data.ga4PropertyId || "",
          ga4ClientEmail: configRes.data.ga4ClientEmail || "",
          ga4PrivateKey: configRes.data.ga4PrivateKey || ""
        });
      }

      // If backend returns an object with traffic array, it means connection is successful
      if (dataRes && dataRes.ga4Data && dataRes.ga4Data.traffic && Array.isArray(dataRes.ga4Data.traffic)) {
        setGa4DataLive(dataRes.ga4Data);
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      console.error(err);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const saveKeys = async () => {
    setSaving(true);
    try {
      await apiClient.put(ENDPOINTS.ADMIN_SEO_CONFIG, keys);
      toast.success("API Keys saved successfully");
      setShowConfig(false);
      fetchData(); // Refetch live data
    } catch (err: any) {
      toast.error(err.message || "Failed to save keys");
    } finally {
      setSaving(false);
    }
  };

  const activeGaData = isConnected ? ga4DataLive.traffic : gaData;
  const activeSourceData = isConnected && ga4DataLive.sources?.length > 0 ? ga4DataLive.sources : sourceData;
  const activeDeviceData = isConnected && ga4DataLive.devices?.length > 0 ? ga4DataLive.devices : deviceData;
  const activeTopPages = isConnected && ga4DataLive.topPages?.length > 0 ? ga4DataLive.topPages : topPages;
  const isDummy = !isConnected;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Website Analytics</h1>
          <p className="text-muted-foreground">Monitor your global tracking performance across all platforms.</p>
        </div>
        <Button onClick={() => setShowConfig(true)} variant="outline" className="gap-2">
          <Settings className="h-4 w-4" /> Configure API Keys
        </Button>
      </div>

      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>API Configuration</DialogTitle>
            <DialogDescription>
              Connect your Google Cloud Service Account to enable real-time GA4 tracking in the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>GA4 Property ID</Label>
              <Input 
                placeholder="e.g. 351234567" 
                value={keys.ga4PropertyId}
                onChange={(e) => setKeys({...keys, ga4PropertyId: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>GA4 Client Email (Service Account)</Label>
              <Input 
                placeholder="analytics-proxy@your-project.iam.gserviceaccount.com" 
                value={keys.ga4ClientEmail}
                onChange={(e) => setKeys({...keys, ga4ClientEmail: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>GA4 Private Key</Label>
              <Textarea 
                placeholder="-----BEGIN PRIVATE KEY-----\n..." 
                className="font-mono text-xs h-32"
                value={keys.ga4PrivateKey}
                onChange={(e) => setKeys({...keys, ga4PrivateKey: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfig(false)}>Cancel</Button>
            <Button onClick={saveKeys} disabled={saving}>{saving ? "Saving..." : "Save Configuration"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isDummy && !loading && (
        <Alert variant="default" className="bg-blue-50/50 text-blue-800 border-blue-200">
          <Info className="h-4 w-4 stroke-blue-600" />
          <AlertTitle>API Connection Required</AlertTitle>
          <AlertDescription>
            This chart currently displays structural dummy data. To view live reports inside this dashboard, you need to configure the OAuth Service Account for the Google Analytics Data API. Your live website tracking is currently sending data to the cloud dashboard.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? "Last 7 days" : <><span className="text-green-500 inline-flex items-center"><TrendingUp className="mr-1 h-3 w-3"/>+12.5%</span> from last week</>}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVisitors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? "Last 7 days" : <><span className="text-green-500 inline-flex items-center"><TrendingUp className="mr-1 h-3 w-3"/>+8.2%</span> from last week</>}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Google Analytics 4 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-indigo-500" />
            <CardTitle>Google Analytics (Traffic)</CardTitle>
          </div>
          <CardDescription>Daily Page Views vs Unique Visitors over the last 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeGaData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pageViews" name="Page Views" stroke="#6366f1" strokeWidth={2} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="visitors" name="Unique Visitors" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-emerald-500" />
              <CardTitle>Traffic Sources</CardTitle>
            </div>
            <CardDescription>Where your visitors are coming from.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {activeSourceData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5 text-indigo-500" />
              <CardTitle>Device Breakdown</CardTitle>
            </div>
            <CardDescription>Desktop vs Mobile user sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeDeviceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {activeDeviceData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Pages */}
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
              {activeTopPages.map((page: any, i: number) => (
                <div key={i} className="grid grid-cols-12 text-sm items-center py-2 border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <div className="col-span-6 font-medium truncate pr-2 text-primary">{page.path}</div>
                  <div className="col-span-3 text-right font-semibold">{page.views}</div>
                  <div className="col-span-3 text-right text-muted-foreground">{page.bounceRate}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
