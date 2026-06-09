import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { emailTemplateRepository } from "@/client/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Mail, Loader2, X, LayoutTemplate, MessageSquare, Phone, Bell } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

const TEMPLATE_PARAMETERS: Record<string, { param: string; desc: string }[]> = {
  welcome_mail: [
    { param: "{{name}}", desc: "Customer name" },
    { param: "{{login_url}}", desc: "Login page url" },
  ],
  email_verification: [
    { param: "{{name}}", desc: "Customer name" },
    { param: "{{otp}}", desc: "Verification OTP code" },
    { param: "{{verification_link}}", desc: "Direct verification link" },
  ],
  forgot_password: [
    { param: "{{name}}", desc: "Customer name" },
    { param: "{{otp}}", desc: "Password reset OTP code" },
  ],
  reset_password: [
    { param: "{{name}}", desc: "Customer name" },
  ],
  change_password: [
    { param: "{{name}}", desc: "Customer name" },
  ],
  order_status_update: [
    { param: "{{name}}", desc: "Customer name" },
    { param: "{{order_id}}", desc: "Order ID" },
    { param: "{{status}}", desc: "New order status" },
    { param: "{{order_url}}", desc: "Dashboard order URL" },
  ],
  order_confirmed: [
    { param: "{{name}}", desc: "Customer name" },
    { param: "{{order_id}}", desc: "Order ID" },
    { param: "{{order_items}}", desc: "HTML table of items" },
    { param: "{{subtotal}}", desc: "Order subtotal" },
    { param: "{{shipping}}", desc: "Shipping cost" },
    { param: "{{total}}", desc: "Grand total" },
    { param: "{{invoice_url}}", desc: "Invoice download URL" },
    { param: "{{payment_summary}}", desc: "Payment method and status" },
  ],
  payment_failed: [
    { param: "{{name}}", desc: "Customer name" },
    { param: "{{order_id}}", desc: "Order ID" },
    { param: "{{total}}", desc: "Grand total" },
    { param: "{{payment_method}}", desc: "Payment gateway type" },
    { param: "{{retry_url}}", desc: "Payment retry checkout URL" },
  ],
  order_shipped: [
    { param: "{{name}}", desc: "Customer name" },
    { param: "{{order_id}}", desc: "Order ID" },
    { param: "{{carrier}}", desc: "Shipping carrier" },
    { param: "{{tracking_number}}", desc: "Tracking ID" },
    { param: "{{tracking_url}}", desc: "Tracking shipment URL" },
  ],
  order_delivered: [
    { param: "{{name}}", desc: "Customer name" },
    { param: "{{order_id}}", desc: "Order ID" },
    { param: "{{review_url}}", desc: "Order review URL page" },
  ],
};

export default function AdminEmailTemplates() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"list" | "edit">("list");
  const [formData, setFormData] = useState({ id: "", name: "", subject: "", body: "", smsBody: "", whatsappBody: "", channels: [] as string[] });
  
  const [channelsConfig, setChannelsConfig] = useState<any>({
    global: { email: true, whatsapp: false, sms: false, site_notification: false },
    templates: {}
  });

  const getPreviewHtml = (bodyContent: string) => {
    const globalLayout = templates.find(t => t.name === "global_layout")?.body || "<div>{{content}}</div>";
    return globalLayout.replace("{{content}}", bodyContent || "<p style='color:#888; font-style:italic;'>Email content will appear here...</p>");
  };

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await emailTemplateRepository.getAll();
      if (res.success) {
        setTemplates(res.data);
      }
    } catch (error) {
      toast.error("Failed to fetch templates");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChannelsConfig = async () => {
    try {
      const res = await emailTemplateRepository.getChannelsConfig();
      if (res.success && res.data) {
        setChannelsConfig(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch notification channels configuration:", error);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchChannelsConfig();
  }, []);

  const handleOpenEditPage = (template: any = null) => {
    if (template) {
      const templateChannels = channelsConfig.templates[template.name] || ["email"];
      setFormData({ 
        id: template.id, 
        name: template.name, 
        subject: template.subject, 
        body: template.body,
        smsBody: template.smsBody || "",
        whatsappBody: template.whatsappBody || "",
        channels: templateChannels
      });
    } else {
      setFormData({ id: "", name: "", subject: "", body: "", smsBody: "", whatsappBody: "", channels: ["email"] });
    }
    setView("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await emailTemplateRepository.update(formData.id, {
          id: formData.id,
          name: formData.name,
          subject: formData.subject,
          body: formData.body,
          smsBody: formData.smsBody,
          whatsappBody: formData.whatsappBody
        });
        toast.success("Template updated");
      } else {
        await emailTemplateRepository.create({
          name: formData.name,
          subject: formData.subject,
          body: formData.body,
          smsBody: formData.smsBody,
          whatsappBody: formData.whatsappBody
        });
        toast.success("Template created");
      }

      // Update channels config for this template name
      const newChannelsConfig = {
        ...channelsConfig,
        templates: {
          ...channelsConfig.templates,
          [formData.name]: formData.channels
        }
      };

      await emailTemplateRepository.updateChannelsConfig(newChannelsConfig);
      setChannelsConfig(newChannelsConfig);

      setView("list");
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await emailTemplateRepository.delete(id);
      toast.success("Template deleted");
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  if (view === "edit") {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div className="space-y-1">
            <button 
              onClick={() => setView("list")} 
              className="text-sm text-primary hover:underline flex items-center gap-1.5 font-semibold mb-1"
            >
              ← Back to Templates
            </button>
            <h1 className="text-3xl font-bold">{formData.id ? `Edit Template: ${formData.name}` : "New Template"}</h1>
            <p className="text-muted-foreground text-sm">Configure channels, copy placeholders, and edit the layout body.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setView("list")} className="rounded-full">Cancel</Button>
            <Button onClick={handleSave} className="rounded-full">Save Template</Button>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid lg:grid-cols-[1fr_440px] gap-8 items-start">
          {/* Editor Column */}
          <div className="space-y-6 min-w-0">
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <div>
                <Label className="font-semibold text-sm">Template Name (Unique Code)</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. order_confirmation" required className="mt-1.5" disabled={!!formData.id} />
                <p className="text-xs text-muted-foreground mt-1">Used internally by the system to trigger this specific notification.</p>
              </div>
              
              <div>
                <Label className="font-semibold text-sm">Subject Line</Label>
                <Input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="e.g. Your order confirmation" required className="mt-1.5" />
              </div>
            </div>

            {/* Notification Channels */}
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <div>
                <Label className="text-base font-bold">Trigger Channels</Label>
                <p className="text-xs text-muted-foreground">Select which communication channels this template will be sent on.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: "email", label: "Email", icon: Mail },
                  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
                  { key: "sms", label: "SMS", icon: Phone },
                  { key: "site_notification", label: "Site Notification", icon: Bell }
                ].map((ch) => {
                  const isGloballyEnabled = channelsConfig.global[ch.key] ?? false;
                  const isChecked = formData.channels?.includes(ch.key) ?? false;
                  return (
                    <label key={ch.key} className={`flex items-center gap-2.5 p-3 rounded-xl border bg-card cursor-pointer hover:bg-muted/30 transition ${
                      isChecked ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-muted'
                    }`}>
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const newChannels = e.target.checked 
                            ? [...(formData.channels || []), ch.key]
                            : (formData.channels || []).filter((c: string) => c !== ch.key);
                          setFormData({ ...formData, channels: newChannels });
                        }}
                        className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          <ch.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {ch.label}
                        </span>
                        {!isGloballyEnabled && (
                          <span className="text-[9px] text-yellow-600 font-medium">Globally Off</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Placeholders Card */}
            {TEMPLATE_PARAMETERS[formData.name] && (
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
                <div>
                  <Label className="text-base font-bold">Available Parameters</Label>
                  <p className="text-xs text-muted-foreground">Click on any parameter below to copy it to your clipboard for use in the template editor.</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {TEMPLATE_PARAMETERS[formData.name].map((p) => (
                    <button
                      key={p.param}
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(p.param);
                        toast.success(`Copied ${p.param} to clipboard!`);
                      }}
                      className="text-xs font-mono px-3 py-1.5 bg-muted hover:bg-muted/80 border rounded-lg font-semibold text-primary transition flex items-center gap-2 shadow-xs"
                      title={p.desc}
                    >
                      <span>{p.param}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">({p.desc})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Body Editors */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <Tabs defaultValue="email" className="w-full">
                <div className="border-b bg-muted/20 px-4 py-2">
                  <TabsList>
                    <TabsTrigger value="email" className="flex gap-2"><Mail className="w-4 h-4"/> Email Layout</TabsTrigger>
                    {formData.channels.includes("sms") && <TabsTrigger value="sms" className="flex gap-2"><Phone className="w-4 h-4"/> SMS Text</TabsTrigger>}
                    {formData.channels.includes("whatsapp") && <TabsTrigger value="whatsapp" className="flex gap-2"><MessageSquare className="w-4 h-4"/> WhatsApp Text</TabsTrigger>}
                  </TabsList>
                </div>
                
                <TabsContent value="email" className="p-6 mt-0">
                  <Label className="text-base font-bold mb-4 block">Email Message Body</Label>
                  <div className="min-h-[400px]">
                    <RichTextEditor 
                      value={formData.body} 
                      onChange={val => setFormData({...formData, body: val})} 
                      placeholder="Start writing the email content..." 
                    />
                  </div>
                </TabsContent>

                <TabsContent value="sms" className="p-6 mt-0 space-y-4">
                  <div>
                    <Label className="text-base font-bold">SMS Text Body</Label>
                    <p className="text-xs text-muted-foreground mt-1">Keep it concise. 1 segment is ~160 characters.</p>
                  </div>
                  <Textarea 
                    value={formData.smsBody} 
                    onChange={e => setFormData({...formData, smsBody: e.target.value})} 
                    placeholder="E.g. Hi {{name}}, your order {{order_id}} is confirmed." 
                    className="min-h-[150px] font-mono text-sm"
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {formData.smsBody?.length || 0} characters
                  </div>
                </TabsContent>

                <TabsContent value="whatsapp" className="p-6 mt-0 space-y-4">
                  <div>
                    <Label className="text-base font-bold">WhatsApp Text Body</Label>
                    <p className="text-xs text-muted-foreground mt-1">You can use *bold* and _italic_ formatting.</p>
                  </div>
                  <Textarea 
                    value={formData.whatsappBody} 
                    onChange={e => setFormData({...formData, whatsappBody: e.target.value})} 
                    placeholder="E.g. Hi {{name}},\nYour order *{{order_id}}* is confirmed!" 
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {formData.whatsappBody?.length || 0} characters
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Sticky Preview Column */}
          <div className="flex flex-col h-[calc(100vh-220px)] sticky top-6 border rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="bg-gray-100 px-4 py-3 border-b text-sm font-semibold text-gray-700 flex items-center gap-2 shrink-0">
              <Mail className="w-4 h-4 text-gray-500" /> Live Preview (Email Layout)
            </div>
            <iframe 
              srcDoc={getPreviewHtml(formData.body)} 
              className="w-full flex-1 border-0" 
              title="Template Preview"
            />
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Message & Notification CMS</h1>
          <p className="text-muted-foreground">Manage automated notification templates and delivery channels</p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="templates">Message Templates</TabsTrigger>
          <TabsTrigger value="channels">Channel Configurations</TabsTrigger>
          <TabsTrigger value="global">Global Layout</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.filter(t => t.name !== "global_layout").map((template) => (
                <div key={template.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 font-semibold text-lg">
                        <Mail className="h-5 w-5 text-primary" />
                        {template.name}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenEditPage(template)} className="text-muted-foreground hover:text-primary"><Edit className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Subject</p>
                      <p className="font-medium truncate">{template.subject}</p>
                    </div>
                    <div className="pt-2 border-t text-xs text-muted-foreground truncate">
                      {template.body.replace(/<[^>]*>/g, '').substring(0, 80)}...
                    </div>
                  </div>
                  
                  {/* Channels list */}
                  <div className="pt-3 border-t mt-auto">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-1">Active Channels</p>
                    <div className="flex flex-wrap gap-1">
                      {["email", "whatsapp", "sms", "site_notification"].map((ch) => {
                        const isGloballyEnabled = channelsConfig.global[ch] ?? false;
                        const isTemplateEnabled = (channelsConfig.templates[template.name] || ["email"]).includes(ch);
                        if (!isTemplateEnabled) return null;
                        
                        return (
                          <span key={ch} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isGloballyEnabled ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-yellow-100 text-yellow-800 border border-yellow-200 line-through opacity-70'
                          }`} title={isGloballyEnabled ? `${ch} is active` : `${ch} is active on template, but disabled globally`}>
                            {ch.replace("_", " ")}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {templates.filter(t => t.name !== "global_layout").length === 0 && (
                <div className="col-span-full py-12 text-center border rounded-xl border-dashed">
                  <p className="text-muted-foreground">No message templates found.</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm max-w-4xl space-y-6">
            <div>
              <h2 className="text-xl font-bold">Global Notification Channels</h2>
              <p className="text-sm text-muted-foreground">Configure and toggle notification channels globally. If a channel is disabled here, no messages will be sent through it.</p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {[
                { key: "email", label: "Email", icon: Mail, desc: "SMTP service" },
                { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, desc: "WhatsApp Business API" },
                { key: "sms", label: "SMS / Phone", icon: Phone, desc: "Twilio / SMS Gateways" },
                { key: "site_notification", label: "Site Notification", icon: Bell, desc: "In-app dashboard alerts" }
              ].map((ch) => {
                const isEnabled = channelsConfig.global[ch.key] ?? false;
                return (
                  <div key={ch.key} className="flex flex-col justify-between p-4 rounded-xl border bg-background space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <ch.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{ch.label}</p>
                        <p className="text-[10px] text-muted-foreground">{ch.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2.5 border-t">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {isEnabled ? "Active" : "Disabled"}
                      </span>
                      <input 
                        type="checkbox" 
                        checked={isEnabled} 
                        onChange={async (e) => {
                          const newConfig = {
                            ...channelsConfig,
                            global: {
                              ...channelsConfig.global,
                              [ch.key]: e.target.checked
                            }
                          };
                          try {
                            await emailTemplateRepository.updateChannelsConfig(newConfig);
                            setChannelsConfig(newConfig);
                            toast.success(`${ch.label} channel ${e.target.checked ? 'enabled' : 'disabled'} globally`);
                          } catch {
                            toast.error("Failed to update channel status");
                          }
                        }}
                        className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="global">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="rounded-xl border bg-card p-6 shadow-sm max-w-none">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-full"><LayoutTemplate className="h-6 w-6 text-primary" /></div>
                <div>
                  <h2 className="text-xl font-bold">Global Email Layout</h2>
                  <p className="text-sm text-muted-foreground">This wrapper is applied to all outgoing emails. Use <code>{`{{content}}`}</code> to inject the specific message body.</p>
                </div>
              </div>
              
              {templates.find(t => t.name === "global_layout") ? (() => {
                const globalLayout = templates.find(t => t.name === "global_layout");
                return (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await emailTemplateRepository.update(globalLayout.id, globalLayout);
                      toast.success("Global layout saved");
                      fetchTemplates();
                    } catch {
                      toast.error("Failed to save layout");
                    }
                  }} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label>HTML Wrapper Code</Label>
                        <div className="min-h-[400px] mt-1.5">
                          <RichTextEditor 
                            value={globalLayout.body}
                            onChange={(val) => {
                              const newTemplates = [...templates];
                              const idx = newTemplates.findIndex(t => t.name === "global_layout");
                              newTemplates[idx].body = val;
                              setTemplates(newTemplates);
                            }}
                            placeholder="Write the global HTML layout here..."
                          />
                        </div>
                      </div>
                      <div className="flex flex-col h-full">
                        <Label className="mb-1">Live Preview</Label>
                        <div className="flex-1 border rounded-lg overflow-hidden bg-white min-h-[500px]">
                          <iframe 
                            srcDoc={globalLayout.body.replace("{{content}}", "<h1>Hello User,</h1><p>This is a sample content block injected into your global layout.</p>")} 
                            className="w-full h-full border-0" 
                            title="Global Layout Preview"
                          />
                        </div>
                      </div>
                    </div>
                    <Button type="submit" className="rounded-full">Save Global Layout</Button>
                  </form>
                );
              })() : (
                <div className="py-8 text-center border rounded-xl border-dashed">
                  <p className="text-muted-foreground mb-4">No global layout found.</p>
                  <Button onClick={() => handleOpenEditPage({ id: "", name: "global_layout", subject: "Global Layout", body: "<div>{{content}}</div>" })} className="rounded-full">Create Global Layout</Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
