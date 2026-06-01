import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconPicker } from "@/components/admin/IconPicker";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { cmsFeaturesRepository } from "@/client/apiClient";

const AdminSettings = () => {
  const [tab, setTab] = useState("features");
  
  const [featureItems, setFeatureItems] = useState([
    { id: 1, icon: "truck-fast", title: "Fast delivery", description: "Order before 22:00, delivered next day" },
    { id: 2, icon: "arrow-rotate-left", title: "30-day returns", description: "Not happy? Send it back for free" },
    { id: 3, icon: "shield-check", title: "2-year warranty", description: "Quality you can trust" },
    { id: 4, icon: "headset", title: "Expert support", description: "7 days a week" },
  ]);

  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const res = await cmsFeaturesRepository.get();
        if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setFeatureItems(res.data);
        }
      } catch (error) {
        console.error("Error fetching features:", error);
      } finally {
        setIsLoadingFeatures(false);
      }
    };
    fetchFeatures();
  }, []);

  const handleSaveFeatures = async () => {
    try {
      const res = await cmsFeaturesRepository.update(featureItems);
      if (res.success) {
        toast.success("Features settings saved successfully");
      } else {
        toast.error("Failed to save features settings");
      }
    } catch (error) {
      toast.error("An error occurred while saving features");
    }
  };

  const handleSave = (section: string) => (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`${section} settings saved (demo)`);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="text-muted-foreground">Only accessible by Superadmin</p>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="smtp">SMTP / Email</TabsTrigger>
          <TabsTrigger value="auth">Login & Auth</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <form onSubmit={handleSave("General")} className="max-w-xl space-y-4 rounded-xl border bg-card p-6">
            <div><Label>Store Name</Label><Input defaultValue="LAMPGIGANT" className="mt-1" /></div>
            <div><Label>Store URL</Label><Input defaultValue="https://lampgigant.nl" className="mt-1" /></div>
            <div><Label>Support Email</Label><Input defaultValue="support@lampgigant.nl" className="mt-1" /></div>
            <div><Label>Currency</Label>
              <Select defaultValue="EUR"><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EUR">EUR (€)</SelectItem><SelectItem value="USD">USD ($)</SelectItem><SelectItem value="GBP">GBP (£)</SelectItem></SelectContent></Select>
            </div>
            <div className="flex items-center gap-2"><Switch defaultChecked /><Label>Maintenance Mode</Label></div>
            <Button type="submit" className="rounded-full">Save Changes</Button>
          </form>
        </TabsContent>

        <TabsContent value="features">
          <div className="max-w-4xl space-y-4 rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Features Items</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFeatureItems([...featureItems, { id: Date.now(), icon: "star", title: "", description: "" }])}
                className="gap-2"
              >
                <Plus size={16} /> Add Item
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_2fr_3fr_auto] gap-4 mb-2 text-sm font-medium text-muted-foreground">
                <div>Icon</div>
                <div>Title</div>
                <div>Description</div>
                <div className="w-8"></div>
              </div>
              
              {featureItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-[1fr_2fr_3fr_auto] gap-4 items-start">
                  <IconPicker 
                    value={item.icon} 
                    onChange={(val) => {
                      const newItems = [...featureItems];
                      newItems[index].icon = val;
                      setFeatureItems(newItems);
                    }} 
                  />
                  <Input 
                    value={item.title} 
                    onChange={(e) => {
                      const newItems = [...featureItems];
                      newItems[index].title = e.target.value;
                      setFeatureItems(newItems);
                    }} 
                    placeholder="E.g. Fast delivery" 
                  />
                  <Input 
                    value={item.description} 
                    onChange={(e) => {
                      const newItems = [...featureItems];
                      newItems[index].description = e.target.value;
                      setFeatureItems(newItems);
                    }} 
                    placeholder="E.g. Order before 22:00..." 
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setFeatureItems(featureItems.filter(i => i.id !== item.id))}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t mt-6">
              <Button onClick={handleSaveFeatures} className="rounded-full">
                Save Features
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="smtp">
          <form onSubmit={handleSave("SMTP")} className="max-w-xl space-y-4 rounded-xl border bg-card p-6">
            <div><Label>SMTP Host</Label><Input defaultValue="smtp.gmail.com" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Port</Label><Input defaultValue="587" className="mt-1" /></div>
              <div><Label>Encryption</Label>
                <Select defaultValue="tls"><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tls">TLS</SelectItem><SelectItem value="ssl">SSL</SelectItem><SelectItem value="none">None</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div><Label>Username</Label><Input defaultValue="noreply@lampgigant.nl" className="mt-1" /></div>
            <div><Label>Password</Label><Input type="password" defaultValue="••••••••" className="mt-1" /></div>
            <div><Label>From Name</Label><Input defaultValue="LAMPGIGANT" className="mt-1" /></div>
            <div><Label>From Email</Label><Input defaultValue="noreply@lampgigant.nl" className="mt-1" /></div>
            <div className="flex items-center gap-2"><Switch defaultChecked /><Label>Enable Email Notifications</Label></div>
            <div className="flex gap-2">
              <Button type="submit" className="rounded-full">Save SMTP</Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => toast.success("Test email sent (demo)")}>Send Test Email</Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="auth">
          <form onSubmit={handleSave("Auth")} className="max-w-xl space-y-4 rounded-xl border bg-card p-6">
            <h3 className="font-semibold text-lg">Login Methods</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><p className="font-semibold">Email / Password</p><p className="text-xs text-muted-foreground">Standard email login</p></div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><p className="font-semibold">Phone (SMS OTP)</p><p className="text-xs text-muted-foreground">Login via SMS code</p></div>
                <Switch />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><p className="font-semibold">Google Sign-in</p><p className="text-xs text-muted-foreground">OAuth 2.0</p></div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><p className="font-semibold">Apple Sign-in</p><p className="text-xs text-muted-foreground">Sign in with Apple ID</p></div>
                <Switch />
              </div>
            </div>
            <h3 className="font-semibold text-lg mt-6">Phone / SMS Settings</h3>
            <div><Label>SMS Provider</Label>
              <Select defaultValue="twilio"><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="twilio">Twilio</SelectItem><SelectItem value="messagebird">MessageBird</SelectItem><SelectItem value="vonage">Vonage</SelectItem></SelectContent></Select>
            </div>
            <div><Label>Account SID / API Key</Label><Input className="mt-1" placeholder="Enter API key" /></div>
            <div><Label>Auth Token</Label><Input type="password" className="mt-1" placeholder="Enter auth token" /></div>
            <div><Label>Sender Phone Number</Label><Input className="mt-1" placeholder="+31612345678" /></div>
            <Button type="submit" className="rounded-full">Save Auth Settings</Button>
          </form>
        </TabsContent>

        <TabsContent value="payments">
          <form onSubmit={handleSave("Payment")} className="max-w-xl space-y-4 rounded-xl border bg-card p-6">
            <div className="space-y-3">
              {[
                { name: "iDEAL", desc: "Dutch bank transfer" },
                { name: "Credit Card", desc: "Visa, Mastercard, Amex" },
                { name: "PayPal", desc: "PayPal checkout" },
                { name: "Klarna", desc: "Buy now, pay later" },
                { name: "Bancontact", desc: "Belgian payments" },
              ].map((pm) => (
                <div key={pm.name} className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-semibold">{pm.name}</p><p className="text-xs text-muted-foreground">{pm.desc}</p></div>
                  <Switch defaultChecked={pm.name === "iDEAL" || pm.name === "Credit Card"} />
                </div>
              ))}
            </div>
            <div><Label>Stripe Secret Key</Label><Input type="password" className="mt-1" placeholder="sk_live_..." /></div>
            <div><Label>Stripe Publishable Key</Label><Input className="mt-1" placeholder="pk_live_..." /></div>
            <Button type="submit" className="rounded-full">Save Payment Settings</Button>
          </form>
        </TabsContent>

        <TabsContent value="shipping">
          <form onSubmit={handleSave("Shipping")} className="max-w-xl space-y-4 rounded-xl border bg-card p-6">
            <div><Label>Free Shipping Threshold (€)</Label><Input type="number" defaultValue="75" className="mt-1" /></div>
            <div><Label>Standard Shipping Fee (€)</Label><Input type="number" step="0.01" defaultValue="5.95" className="mt-1" /></div>
            <div><Label>Express Shipping Fee (€)</Label><Input type="number" step="0.01" defaultValue="9.95" className="mt-1" /></div>
            <div className="flex items-center gap-2"><Switch defaultChecked /><Label>Same-day delivery available</Label></div>
            <div><Label>Delivery Cutoff Time</Label><Input defaultValue="22:00" className="mt-1" /></div>
            <Button type="submit" className="rounded-full">Save Shipping Settings</Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;