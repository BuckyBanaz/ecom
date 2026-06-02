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
import { cmsFeaturesRepository, adminSettingsRepository } from "@/client/apiClient";

const AdminSettings = () => {
  const [tab, setTab] = useState("features");
  
  const [featureItems, setFeatureItems] = useState([
    { id: 1, icon: "truck-fast", title: "Fast delivery", description: "Order before 22:00, delivered next day" },
    { id: 2, icon: "arrow-rotate-left", title: "30-day returns", description: "Not happy? Send it back for free" },
    { id: 3, icon: "shield-check", title: "2-year warranty", description: "Quality you can trust" },
    { id: 4, icon: "headset", title: "Expert support", description: "7 days a week" },
  ]);

  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);

  const [smtpSettings, setSmtpSettings] = useState({
    host: "",
    port: "",
    encryption: "tls",
    username: "",
    password: "",
    fromName: "",
    fromEmail: "",
    enabled: true,
  });
  const [isLoadingSmtp, setIsLoadingSmtp] = useState(true);

  const [paymentSettings, setPaymentSettings] = useState({
    ideal: true,
    card: true,
    paypal: false,
    klarna: false,
    bancontact: false,
    stripePublishableKey: "",
    stripeSecretKey: "",
  });
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

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
    const fetchSmtpSettings = async () => {
      try {
        const res = await adminSettingsRepository.getSmtpSettings();
        if (res.success && res.data) {
          setSmtpSettings(res.data);
        }
      } catch (error) {
        console.error("Error fetching SMTP settings:", error);
      } finally {
        setIsLoadingSmtp(false);
      }
    };
    const fetchPaymentSettings = async () => {
      try {
        const res = await adminSettingsRepository.getPaymentSettings();
        if (res.success && res.data) {
          setPaymentSettings(res.data);
        }
      } catch (error) {
        console.error("Error fetching payment settings:", error);
      } finally {
        setIsLoadingPayments(false);
      }
    };
    fetchFeatures();
    fetchSmtpSettings();
    fetchPaymentSettings();
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

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminSettingsRepository.updateSmtpSettings(smtpSettings);
      if (res.success) {
        toast.success("SMTP settings saved successfully");
      } else {
        toast.error("Failed to save SMTP settings");
      }
    } catch (error) {
      toast.error("An error occurred while saving SMTP settings");
    }
  };

  const handleSavePayments = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminSettingsRepository.updatePaymentSettings(paymentSettings);
      if (res.success) {
        toast.success("Payment settings saved successfully");
      } else {
        toast.error("Failed to save Payment settings");
      }
    } catch (error) {
      toast.error("An error occurred while saving Payment settings");
    }
  };

  const handleSendTestEmail = async () => {
    const testEmail = window.prompt("Enter email address to send test email to:");
    if (!testEmail) return;

    toast.promise(
      adminSettingsRepository.testSmtpSettings(testEmail),
      {
        loading: "Sending test email...",
        success: (res) => res.message || `Test email sent to ${testEmail}`,
        error: (err) => err?.message || "Failed to send test email",
      }
    );
  };

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
      <p className="text-muted-foreground text-sm">Only accessible by Superadmin</p>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        {/* Scrollable tabs on mobile */}
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex min-w-max w-full sm:w-auto flex-nowrap">
            <TabsTrigger value="general" className="text-xs sm:text-sm">General</TabsTrigger>
            <TabsTrigger value="features" className="text-xs sm:text-sm">Features</TabsTrigger>
            <TabsTrigger value="smtp" className="text-xs sm:text-sm">SMTP / Email</TabsTrigger>
            <TabsTrigger value="auth" className="text-xs sm:text-sm">Login & Auth</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs sm:text-sm">Payments</TabsTrigger>
            <TabsTrigger value="shipping" className="text-xs sm:text-sm">Shipping</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general">
          <form onSubmit={handleSave("General")} className="mt-4 w-full max-w-xl space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div><Label>Store Name</Label><Input defaultValue="SCHIP & STER" className="mt-1" /></div>
            <div><Label>Store URL</Label><Input defaultValue="https://schipandster.nl" className="mt-1" /></div>
            <div><Label>Support Email</Label><Input defaultValue="support@schipandster.nl" className="mt-1" /></div>
            <div><Label>Currency</Label>
              <Select defaultValue="EUR"><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EUR">EUR (€)</SelectItem><SelectItem value="USD">USD ($)</SelectItem><SelectItem value="GBP">GBP (£)</SelectItem></SelectContent></Select>
            </div>
            <div className="flex items-center gap-2"><Switch defaultChecked /><Label>Maintenance Mode</Label></div>
            <Button type="submit" className="rounded-full w-full sm:w-auto">Save Changes</Button>
          </form>
        </TabsContent>

        <TabsContent value="features">
          <div className="mt-4 w-full space-y-4 rounded-xl border bg-card p-4 sm:p-6">
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
              {/* Desktop header */}
              <div className="hidden sm:grid grid-cols-[1fr_2fr_3fr_auto] gap-4 mb-2 text-sm font-medium text-muted-foreground">
                <div>Icon</div>
                <div>Title</div>
                <div>Description</div>
                <div className="w-8"></div>
              </div>
              
              {featureItems.map((item, index) => (
                <div key={item.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:p-0 sm:border-0 sm:rounded-none sm:grid sm:grid-cols-[1fr_2fr_3fr_auto] sm:gap-4 sm:items-start">
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
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 self-end sm:self-auto"
                    onClick={() => setFeatureItems(featureItems.filter(i => i.id !== item.id))}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t mt-6">
              <Button onClick={handleSaveFeatures} className="rounded-full w-full sm:w-auto">
                Save Features
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="smtp">
          {isLoadingSmtp ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (
            <form onSubmit={handleSaveSmtp} className="mt-4 w-full max-w-xl space-y-4 rounded-xl border bg-card p-4 sm:p-6">
              <div><Label>SMTP Host</Label><Input value={smtpSettings.host} onChange={(e) => setSmtpSettings({...smtpSettings, host: e.target.value})} className="mt-1" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Port</Label><Input value={smtpSettings.port} onChange={(e) => setSmtpSettings({...smtpSettings, port: e.target.value})} className="mt-1" /></div>
                <div><Label>Encryption</Label>
                  <Select value={smtpSettings.encryption} onValueChange={(v) => setSmtpSettings({...smtpSettings, encryption: v})}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tls">TLS</SelectItem><SelectItem value="ssl">SSL</SelectItem><SelectItem value="none">None</SelectItem></SelectContent></Select>
                </div>
              </div>
              <div><Label>Username</Label><Input value={smtpSettings.username} onChange={(e) => setSmtpSettings({...smtpSettings, username: e.target.value})} className="mt-1" /></div>
              <div><Label>Password</Label><Input type="password" value={smtpSettings.password} onChange={(e) => setSmtpSettings({...smtpSettings, password: e.target.value})} className="mt-1" /></div>
              <div><Label>From Name</Label><Input value={smtpSettings.fromName} onChange={(e) => setSmtpSettings({...smtpSettings, fromName: e.target.value})} className="mt-1" /></div>
              <div><Label>From Email</Label><Input value={smtpSettings.fromEmail} onChange={(e) => setSmtpSettings({...smtpSettings, fromEmail: e.target.value})} className="mt-1" /></div>
              <div className="flex items-center gap-2"><Switch checked={smtpSettings.enabled} onCheckedChange={(checked) => setSmtpSettings({...smtpSettings, enabled: checked})} /><Label>Enable Email Notifications</Label></div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" className="rounded-full w-full sm:w-auto">Save SMTP</Button>
                <Button type="button" variant="outline" className="rounded-full w-full sm:w-auto" onClick={handleSendTestEmail}>Send Test Email</Button>
              </div>
            </form>
          )}
        </TabsContent>

        <TabsContent value="auth">
          <form onSubmit={handleSave("Auth")} className="mt-4 w-full max-w-xl space-y-4 rounded-xl border bg-card p-4 sm:p-6">
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
            <Button type="submit" className="rounded-full w-full sm:w-auto">Save Auth Settings</Button>
          </form>
        </TabsContent>

        <TabsContent value="payments">
          {isLoadingPayments ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (
            <form onSubmit={handleSavePayments} className="mt-4 w-full max-w-xl space-y-4 rounded-xl border bg-card p-4 sm:p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-semibold">iDEAL</p><p className="text-xs text-muted-foreground">Dutch bank transfer</p></div>
                  <Switch checked={paymentSettings.ideal} onCheckedChange={(c) => setPaymentSettings({...paymentSettings, ideal: c})} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-semibold">Credit Card</p><p className="text-xs text-muted-foreground">Visa, Mastercard, Amex</p></div>
                  <Switch checked={paymentSettings.card} onCheckedChange={(c) => setPaymentSettings({...paymentSettings, card: c})} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-semibold">PayPal</p><p className="text-xs text-muted-foreground">PayPal checkout</p></div>
                  <Switch checked={paymentSettings.paypal} onCheckedChange={(c) => setPaymentSettings({...paymentSettings, paypal: c})} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-semibold">Klarna</p><p className="text-xs text-muted-foreground">Buy now, pay later</p></div>
                  <Switch checked={paymentSettings.klarna} onCheckedChange={(c) => setPaymentSettings({...paymentSettings, klarna: c})} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-semibold">Bancontact</p><p className="text-xs text-muted-foreground">Belgian payments</p></div>
                  <Switch checked={paymentSettings.bancontact} onCheckedChange={(c) => setPaymentSettings({...paymentSettings, bancontact: c})} />
                </div>
              </div>
              <div>
                <Label>Stripe Secret Key</Label>
                <Input 
                  type="password" 
                  value={paymentSettings.stripeSecretKey} 
                  onChange={(e) => setPaymentSettings({...paymentSettings, stripeSecretKey: e.target.value})} 
                  className="mt-1" 
                  placeholder="sk_live_..." 
                />
              </div>
              <div>
                <Label>Stripe Publishable Key</Label>
                <Input 
                  value={paymentSettings.stripePublishableKey} 
                  onChange={(e) => setPaymentSettings({...paymentSettings, stripePublishableKey: e.target.value})} 
                  className="mt-1" 
                  placeholder="pk_live_..." 
                />
              </div>
              <Button type="submit" className="rounded-full w-full sm:w-auto">Save Payment Settings</Button>
            </form>
          )}
        </TabsContent>

        <TabsContent value="shipping">
          <form onSubmit={handleSave("Shipping")} className="mt-4 w-full max-w-xl space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div><Label>Free Shipping Threshold (€)</Label><Input type="number" defaultValue="75" className="mt-1" /></div>
            <div><Label>Standard Shipping Fee (€)</Label><Input type="number" step="0.01" defaultValue="5.95" className="mt-1" /></div>
            <div><Label>Express Shipping Fee (€)</Label><Input type="number" step="0.01" defaultValue="9.95" className="mt-1" /></div>
            <div className="flex items-center gap-2"><Switch defaultChecked /><Label>Same-day delivery available</Label></div>
            <div><Label>Delivery Cutoff Time</Label><Input defaultValue="22:00" className="mt-1" /></div>
            <Button type="submit" className="rounded-full w-full sm:w-auto">Save Shipping Settings</Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;