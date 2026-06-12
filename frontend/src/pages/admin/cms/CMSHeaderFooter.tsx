import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Save, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { IconPicker } from "@/components/admin/IconPicker";
import { cmsHeaderFooterRepository } from "@/client/apiClient";

const HEADER_FOOTER_KEY = "header_footer_data";


type TopItem = { icon: string; text: string };

type HeaderFooterConfig = {
  topLeft: TopItem[];
  topRight: { label: string; href: string }[];
  footerAbout: { brandText: string; description: string };
  footerSocial: { icon: string; label: string; href: string }[];
  footerColumns: { title: string; links: { label: string; href: string }[] }[];
  footerBottom: TopItem[];
};



const defaultConfig: HeaderFooterConfig = {
  topLeft: [
    { icon: "star", text: "15,000+ reviews" },
    { icon: "truck", text: "Ordered before 22:00, delivered next day" },
    { icon: "calendar", text: "30-day returns" },
  ],
  topRight: [
    { label: "Business", href: "/help" },
    { label: "Customer service", href: "/help" },
  ],
  footerAbout: {
    brandText: "Schip & ster",
    description: "Schip & ster — light up your moment. We carry over 10,000 lighting products with same-day shipping and 30-day returns.",
  },
  footerSocial: [
    { icon: "facebook", label: "Facebook", href: "#" },
    { icon: "instagram", label: "Instagram", href: "#" },
    { icon: "youtube", label: "Youtube", href: "#" },
  ],
  footerColumns: [
    {
      title: "Customer service",
      links: [
        { label: "Contact", href: "/help" },
        { label: "Shipping & delivery", href: "/help" },
        { label: "Returns", href: "/help" },
        { label: "Payment methods", href: "/help" },
        { label: "Warranty", href: "/help" },
        { label: "FAQ", href: "/help" },
      ],
    },
    {
      title: "Shop",
      links: [
        { label: "Indoor lighting", href: "/relief/interior-lighting" },
        { label: "Outdoor lighting", href: "/relief/outdoor-lighting" },
        { label: "Light bulbs", href: "/relief/light-sources" },
        { label: "Smart home", href: "/category/smart-bulbs" },
        { label: "Business lighting", href: "/category/office-lighting" },
        { label: "Deals", href: "/deals" },
      ],
    },
    {
      title: "About Schip & ster",
      links: [
        { label: "Our story", href: "/help" },
        { label: "Showroom", href: "/help" },
        { label: "Sustainability", href: "/help" },
        { label: "Careers", href: "/help" },
        { label: "Press", href: "/help" },
        { label: "Blog", href: "/admin/cms/blogs" },
      ],
    },
  ],
  footerBottom: [
    { icon: "truck", text: "Free shipping over €75" },
    { icon: "shield", text: "Secure checkout" },
    { icon: "credit-card", text: "iDEAL · Card · PayPal" },
  ],
};

const CMSHeaderFooter = () => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<HeaderFooterConfig>(defaultConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        const result = await cmsHeaderFooterRepository.get();
        if (result.success && result.data) {
          const parsed = result.data;
          const legacySocial = parsed.footerSocial && !Array.isArray(parsed.footerSocial)
            ? [
                { icon: "facebook", label: "Facebook", href: parsed.footerSocial.facebook || "#" },
                { icon: "instagram", label: "Instagram", href: parsed.footerSocial.instagram || "#" },
                { icon: "youtube", label: "Youtube", href: parsed.footerSocial.youtube || "#" },
              ]
            : parsed.footerSocial;
          setConfig({
            ...defaultConfig,
            ...parsed,
            footerSocial: legacySocial || defaultConfig.footerSocial,
          });
          // Also save to localStorage for fallback
          localStorage.setItem(HEADER_FOOTER_KEY, JSON.stringify({
            ...defaultConfig,
            ...parsed,
            footerSocial: legacySocial || defaultConfig.footerSocial,
          }));
        } else {
          // Fallback to localStorage if API fails
          const savedConfig = localStorage.getItem(HEADER_FOOTER_KEY);
          if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            const legacySocial = parsed.footerSocial && !Array.isArray(parsed.footerSocial)
              ? [
                  { icon: "facebook", label: "Facebook", href: parsed.footerSocial.facebook || "#" },
                  { icon: "instagram", label: "Instagram", href: parsed.footerSocial.instagram || "#" },
                  { icon: "youtube", label: "Youtube", href: parsed.footerSocial.youtube || "#" },
                ]
              : parsed.footerSocial;
            setConfig({
              ...defaultConfig,
              ...parsed,
              footerSocial: legacySocial || defaultConfig.footerSocial,
            });
          }
        }
      } catch (error) {
        console.error("Error loading header footer config:", error);
        // Fallback to localStorage
        const savedConfig = localStorage.getItem(HEADER_FOOTER_KEY);
        if (savedConfig) {
          try {
            const parsed = JSON.parse(savedConfig);
            const legacySocial = parsed.footerSocial && !Array.isArray(parsed.footerSocial)
              ? [
                  { icon: "facebook", label: "Facebook", href: parsed.footerSocial.facebook || "#" },
                  { icon: "instagram", label: "Instagram", href: parsed.footerSocial.instagram || "#" },
                  { icon: "youtube", label: "Youtube", href: parsed.footerSocial.youtube || "#" },
                ]
              : parsed.footerSocial;
            setConfig({
              ...defaultConfig,
              ...parsed,
              footerSocial: legacySocial || defaultConfig.footerSocial,
            });
          } catch {
            setConfig(defaultConfig);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await cmsHeaderFooterRepository.update(config);
      if (result.success) {
        // Also save to localStorage
        localStorage.setItem(HEADER_FOOTER_KEY, JSON.stringify(config));
        toast.success("Header and footer saved");
      } else {
        toast.error("Failed to save header and footer");
      }
    } catch (error) {
      console.error("Error saving header footer config:", error);
      // Still save to localStorage as fallback
      localStorage.setItem(HEADER_FOOTER_KEY, JSON.stringify(config));
      toast.success("Header and footer saved (local)");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Header & Footer</h1>
          <p className="text-muted-foreground">Configure header top bar and footer layout.</p>
        </div>
        <Button type="submit" className="gap-2 shrink-0"><Save className="h-4 w-4" /> Save changes</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Header Top Bar</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Left items (icon + text)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setConfig({
                  ...config,
                  topLeft: [...config.topLeft, { icon: "star", text: "" }]
                })}
              >
                <Plus className="h-4 w-4" /> Add item
              </Button>
            </div>
            {config.topLeft.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:grid sm:grid-cols-[160px_1fr_auto] gap-2 sm:gap-3 items-start sm:items-center p-3 sm:p-0 border rounded-md sm:border-0">
                <IconPicker
                  value={item.icon}
                  onChange={(val) => {
                    const next = [...config.topLeft];
                    next[idx].icon = val;
                    setConfig({ ...config, topLeft: next });
                  }}
                />
                <Input
                  value={item.text}
                  onChange={(e) => {
                    const next = [...config.topLeft];
                    next[idx].text = e.target.value;
                    setConfig({ ...config, topLeft: next });
                  }}
                  placeholder="Text"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setConfig({ ...config, topLeft: config.topLeft.filter((_, i) => i !== idx) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Right links</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setConfig({
                  ...config,
                  topRight: [...config.topRight, { label: "", href: "" }]
                })}
              >
                <Plus className="h-4 w-4" /> Add link
              </Button>
            </div>
            {config.topRight.map((link, idx) => (
              <div key={idx} className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_auto] gap-2 sm:gap-3 items-start sm:items-center p-3 sm:p-0 border rounded-md sm:border-0">
                <Input
                  value={link.label}
                  onChange={(e) => {
                    const next = [...config.topRight];
                    next[idx].label = e.target.value;
                    setConfig({ ...config, topRight: next });
                  }}
                  placeholder="Label"
                />
                <Input
                  value={link.href}
                  onChange={(e) => {
                    const next = [...config.topRight];
                    next[idx].href = e.target.value;
                    setConfig({ ...config, topRight: next });
                  }}
                  placeholder="/help"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setConfig({ ...config, topRight: config.topRight.filter((_, i) => i !== idx) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Footer Content</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>About text</Label>
            <Input
              value={config.footerAbout.brandText}
              onChange={(e) => setConfig({ ...config, footerAbout: { ...config.footerAbout, brandText: e.target.value } })}
              placeholder="Brand"
            />
            <Textarea
              value={config.footerAbout.description}
              onChange={(e) => setConfig({ ...config, footerAbout: { ...config.footerAbout, description: e.target.value } })}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Social links</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setConfig({
                  ...config,
                  footerSocial: [...config.footerSocial, { icon: "facebook", label: "", href: "" }]
                })}
              >
                <Plus className="h-4 w-4" /> Add social
              </Button>
            </div>
            {config.footerSocial.map((link, idx) => (
              <div key={idx} className="flex flex-col sm:grid sm:grid-cols-[160px_1fr_1fr_auto] gap-2 sm:gap-3 items-start sm:items-center p-3 sm:p-0 border rounded-md sm:border-0">
                <IconPicker
                  value={link.icon}
                  onChange={(val) => {
                    const next = [...config.footerSocial];
                    next[idx].icon = val;
                    setConfig({ ...config, footerSocial: next });
                  }}
                  buttonLabel={link.icon ? undefined : "Pick icon"}
                />
                <Input
                  value={link.label}
                  onChange={(e) => {
                    const next = [...config.footerSocial];
                    next[idx].label = e.target.value;
                    setConfig({ ...config, footerSocial: next });
                  }}
                  placeholder="Name"
                />
                <Input
                  value={link.href}
                  onChange={(e) => {
                    const next = [...config.footerSocial];
                    next[idx].href = e.target.value;
                    setConfig({ ...config, footerSocial: next });
                  }}
                  placeholder="https://..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setConfig({ ...config, footerSocial: config.footerSocial.filter((_, i) => i !== idx) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Footer columns</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setConfig({
                  ...config,
                  footerColumns: [...config.footerColumns, { title: "", links: [] }]
                })}
              >
                <Plus className="h-4 w-4" /> Add column
              </Button>
            </div>
            {config.footerColumns.map((col, cIdx) => (
              <div key={cIdx} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    value={col.title}
                    onChange={(e) => {
                      const next = [...config.footerColumns];
                      next[cIdx].title = e.target.value;
                      setConfig({ ...config, footerColumns: next });
                    }}
                    placeholder="Column title"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setConfig({ ...config, footerColumns: config.footerColumns.filter((_, i) => i !== cIdx) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {col.links.map((link, lIdx) => (
                    <div key={lIdx} className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_auto] gap-2 sm:gap-3 items-start sm:items-center p-3 sm:p-0 border rounded-md sm:border-0">
                      <Input
                        value={link.label}
                        onChange={(e) => {
                          const next = [...config.footerColumns];
                          next[cIdx].links[lIdx].label = e.target.value;
                          setConfig({ ...config, footerColumns: next });
                        }}
                        placeholder="Label"
                      />
                      <Input
                        value={link.href}
                        onChange={(e) => {
                          const next = [...config.footerColumns];
                          next[cIdx].links[lIdx].href = e.target.value;
                          setConfig({ ...config, footerColumns: next });
                        }}
                        placeholder="/help"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          const next = [...config.footerColumns];
                          next[cIdx].links = next[cIdx].links.filter((_, i) => i !== lIdx);
                          setConfig({ ...config, footerColumns: next });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      const next = [...config.footerColumns];
                      next[cIdx].links.push({ label: "", href: "" });
                      setConfig({ ...config, footerColumns: next });
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add link
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Footer badges</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setConfig({
                  ...config,
                  footerBottom: [...config.footerBottom, { icon: "star", text: "" }]
                })}
              >
                <Plus className="h-4 w-4" /> Add badge
              </Button>
            </div>
            {config.footerBottom.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:grid sm:grid-cols-[160px_1fr_auto] gap-2 sm:gap-3 items-start sm:items-center p-3 sm:p-0 border rounded-md sm:border-0">
                <IconPicker
                  value={item.icon}
                  onChange={(val) => {
                    const next = [...config.footerBottom];
                    next[idx].icon = val;
                    setConfig({ ...config, footerBottom: next });
                  }}
                />
                <Input
                  value={item.text}
                  onChange={(e) => {
                    const next = [...config.footerBottom];
                    next[idx].text = e.target.value;
                    setConfig({ ...config, footerBottom: next });
                  }}
                  placeholder="Badge text"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setConfig({ ...config, footerBottom: config.footerBottom.filter((_, i) => i !== idx) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default CMSHeaderFooter;
