import { useState, useEffect } from "react";
import { emailTemplateRepository } from "@/client/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Mail, Loader2, X, LayoutTemplate } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminEmailTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: "", name: "", subject: "", body: "" });

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

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleOpenModal = (template: any = null) => {
    if (template) {
      setFormData({ id: template.id, name: template.name, subject: template.subject, body: template.body });
    } else {
      setFormData({ id: "", name: "", subject: "", body: "" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await emailTemplateRepository.update(formData.id, formData);
        toast.success("Template updated");
      } else {
        await emailTemplateRepository.create(formData);
        toast.success("Template created");
      }
      setIsModalOpen(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground">Manage automated email contents</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="rounded-full gap-2">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="templates">Message Templates</TabsTrigger>
          <TabsTrigger value="global">Global Layout</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.filter(t => t.name !== "global_layout").map((template) => (
                <div key={template.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 font-semibold text-lg">
                      <Mail className="h-5 w-5 text-primary" />
                      {template.name}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenModal(template)} className="text-muted-foreground hover:text-primary"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(template.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subject</p>
                    <p className="font-medium truncate">{template.subject}</p>
                  </div>
                  <div className="pt-2 border-t text-xs text-muted-foreground truncate">
                    {template.body.substring(0, 80)}...
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

        <TabsContent value="global">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="rounded-xl border bg-card p-6 shadow-sm max-w-4xl">
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
                        <Textarea 
                          rows={25} 
                          className="mt-1 font-mono text-sm leading-relaxed w-full" 
                          value={globalLayout.body}
                          onChange={(e) => {
                            const newTemplates = [...templates];
                            const idx = newTemplates.findIndex(t => t.name === "global_layout");
                            newTemplates[idx].body = e.target.value;
                            setTemplates(newTemplates);
                          }}
                        />
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
                  <Button onClick={() => handleOpenModal({ id: "", name: "global_layout", subject: "Global Layout", body: "<div>{{content}}</div>" })} className="rounded-full">Create Global Layout</Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-background p-6 shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{formData.id ? "Edit Template" : "New Template"}</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
              <div className="grid md:grid-cols-2 gap-6 flex-1 overflow-y-auto mb-4 p-1">
                {/* Editor Column */}
                <div className="space-y-4">
                  <div>
                    <Label>Template Name (Unique Code)</Label>
                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. order_confirmation" required className="mt-1" disabled={!!formData.id} />
                    <p className="text-xs text-muted-foreground mt-1">Used internally to trigger this specific email.</p>
                  </div>
                  <div>
                    <Label>Email Subject</Label>
                    <Input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="e.g. Your Lampgigant order has been received" required className="mt-1" />
                  </div>
                  <div className="flex flex-col h-[400px]">
                    <Label className="mb-1">Email Body (HTML allowed)</Label>
                    <Textarea value={formData.body} onChange={e => setFormData({...formData, body: e.target.value})} className="flex-1 mt-1 font-mono text-sm resize-none" placeholder="Hello {name}," required />
                  </div>
                </div>

                {/* Preview Column */}
                <div className="flex flex-col h-full hidden md:flex border rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="bg-gray-100 px-4 py-2 border-b text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Live Preview
                  </div>
                  <iframe 
                    srcDoc={getPreviewHtml(formData.body)} 
                    className="w-full flex-1 border-0" 
                    title="Template Preview"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-full">Cancel</Button>
                <Button type="submit" className="rounded-full">Save Template</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
