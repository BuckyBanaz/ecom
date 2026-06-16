import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Save, Plus, Trash2, Mail, Check, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cmsProductPageRepository } from "@/client/apiClient";
import { SectionLoader } from "@/components/ui/PageLoader";
import { MediaLibraryDialog } from "@/components/admin/media/MediaLibraryDialog";
import { normalizeUploadedUrl, resolveImgUrl } from "@/utils/image";

interface ProductPageCmsData {
  quoteTitle: string;
  quoteButtonText: string;
  klarnaText: string;
  features: string[];
  questionTitle: string;
  questionSubtitle: string;
  questionButtonText: string;
  questionEmail: string;
  questionImage: string;
}

const DEFAULT_DATA: ProductPageCmsData = {
  quoteTitle: "Larger quantity required?",
  quoteButtonText: "Request a quote",
  klarnaText: "Buy now, pay later with Klarna",
  features: [
    "Gratis verzenden boven €100,- in NL",
    "Fysieke winkel",
    "Vandaag bestellen vandaag afhalen in de winkel",
    "Voor 15:00 besteld vandaag verzonden"
  ],
  questionTitle: "Do you have a question about this product?",
  questionSubtitle: "Our employee is happy to help you find the right product",
  questionButtonText: "Send mail",
  questionEmail: "info@schipenster.nl",
  questionImage: "/uploads/employee.png"
};

export default function CMSProductPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ProductPageCmsData>(DEFAULT_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [newFeature, setNewFeature] = useState("");
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await cmsProductPageRepository.get();
        if (response && response.success && response.data) {
          setData({
            ...DEFAULT_DATA,
            ...response.data
          });
        }
      } catch (e) {
        console.error("Error loading product page CMS data", e);
        toast.error("Failed to load product page CMS configuration. Using defaults.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    try {
      await cmsProductPageRepository.update(data);
      toast.success("Product page CMS configuration saved successfully!");
    } catch (e) {
      console.error("Failed to save product page config", e);
      toast.error("Failed to save configuration.");
    }
  };

  const handleFeatureChange = (index: number, val: string) => {
    const updated = [...data.features];
    updated[index] = val;
    setData({ ...data, features: updated });
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setData({
      ...data,
      features: [...data.features, newFeature.trim()]
    });
    setNewFeature("");
  };

  const removeFeature = (index: number) => {
    const updated = data.features.filter((_, i) => i !== index);
    setData({ ...data, features: updated });
  };

  if (isLoading) {
    return <SectionLoader />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Page CMS</h1>
          <p className="text-muted-foreground mt-1">Configure the dynamic info boxes, Klarna banner, and customer support blocks displayed on product details pages.</p>
        </div>
        <Button onClick={handleSave} className="gap-2 shadow-xs transition-all duration-200 shrink-0">
          <Save className="h-4 w-4" /> Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 1. Request a Quote Section */}
        <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardHeader className="border-b pb-4 mb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">Quote Request Block</CardTitle>
            <CardDescription className="text-xs">Configure the banner asking customers if they require a larger quantity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quoteTitle" className="text-xs font-bold text-foreground/80">Quote Header Title</Label>
                <Input
                  id="quoteTitle"
                  value={data.quoteTitle}
                  onChange={(e) => setData({ ...data, quoteTitle: e.target.value })}
                  placeholder="e.g. Larger quantity required?"
                  className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quoteButtonText" className="text-xs font-bold text-foreground/80">Button Label</Label>
                <Input
                  id="quoteButtonText"
                  value={data.quoteButtonText}
                  onChange={(e) => setData({ ...data, quoteButtonText: e.target.value })}
                  placeholder="e.g. Request a quote"
                  className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Payment Terms & Badges */}
        <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardHeader className="border-b pb-4 mb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">Klarna & Payments</CardTitle>
            <CardDescription className="text-xs">Configure the buy-now-pay-later promotional banner text.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="klarnaText" className="text-xs font-bold text-foreground/80">Klarna Banner Label</Label>
              <Input
                id="klarnaText"
                value={data.klarnaText}
                onChange={(e) => setData({ ...data, klarnaText: e.target.value })}
                placeholder="e.g. Buy now, pay later with Klarna"
                className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* 3. Bullet Points Features list */}
        <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardHeader className="border-b pb-4 mb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">Selling Proposition Features</CardTitle>
            <CardDescription className="text-xs">Add key highlights such as shipping rules, store locations, and shipping speeds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {data.features.map((feat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600 border border-green-500/20 shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                  <Input
                    value={feat}
                    onChange={(e) => handleFeatureChange(i, e.target.value)}
                    className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg flex-grow"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFeature(i)}
                    className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add new selling point feature (e.g. Free returns)..."
                className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg flex-grow"
                onKeyDown={(e) => e.key === "Enter" && addFeature()}
              />
              <Button type="button" onClick={addFeature} className="h-10 rounded-lg px-4 gap-1.5 font-bold">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 4. Support Representatives / Mail Block */}
        <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardHeader className="border-b pb-4 mb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">Support Representative Block</CardTitle>
            <CardDescription className="text-xs">Configure the contact box with employee image and email link details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="questionTitle" className="text-xs font-bold text-foreground/80">Card Title Header</Label>
                <Input
                  id="questionTitle"
                  value={data.questionTitle}
                  onChange={(e) => setData({ ...data, questionTitle: e.target.value })}
                  placeholder="e.g. Do you have a question about this product?"
                  className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="questionSubtitle" className="text-xs font-bold text-foreground/80">Subtitle Description</Label>
                <Input
                  id="questionSubtitle"
                  value={data.questionSubtitle}
                  onChange={(e) => setData({ ...data, questionSubtitle: e.target.value })}
                  placeholder="e.g. Our employee is happy to help you find the right product"
                  className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="questionButtonText" className="text-xs font-bold text-foreground/80">Mail Button Label</Label>
                <Input
                  id="questionButtonText"
                  value={data.questionButtonText}
                  onChange={(e) => setData({ ...data, questionButtonText: e.target.value })}
                  placeholder="e.g. Send mail"
                  className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="questionEmail" className="text-xs font-bold text-foreground/80">Destination Email</Label>
                <Input
                  id="questionEmail"
                  value={data.questionEmail}
                  onChange={(e) => setData({ ...data, questionEmail: e.target.value })}
                  placeholder="e.g. info@schipenster.nl"
                  type="email"
                  className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                />
              </div>
              <div className="space-y-1.5 col-span-1 md:col-span-1">
                <Label className="text-xs font-bold text-foreground/80">Representative Image</Label>
                <div className="mt-1 flex items-center gap-3">
                  {data.questionImage ? (
                    <img 
                      src={resolveImgUrl(data.questionImage)} 
                      alt="Representative Preview" 
                      className="h-10 w-10 rounded-lg object-contain bg-muted border border-border shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted border border-border border-dashed flex items-center justify-center text-muted-foreground shrink-0">
                      <HelpCircle className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1 flex gap-2">
                    <Input
                      id="questionImage"
                      value={data.questionImage}
                      onChange={(e) => setData({ ...data, questionImage: e.target.value })}
                      placeholder="e.g. /uploads/employee.png"
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg flex-grow"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsMediaLibraryOpen(true)}
                      className="h-10 text-xs gap-1.5 font-bold shrink-0 rounded-lg"
                    >
                      <Plus className="h-4 w-4" /> Browse
                    </Button>
                  </div>
                </div>
                <MediaLibraryDialog
                  open={isMediaLibraryOpen}
                  onOpenChange={setIsMediaLibraryOpen}
                  onSelect={(url) => {
                    setData({ ...data, questionImage: normalizeUploadedUrl(url) });
                    setIsMediaLibraryOpen(false);
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
