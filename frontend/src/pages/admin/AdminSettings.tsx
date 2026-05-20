import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AdminSettings = () => {
  const [tab, setTab] = useState("general");

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