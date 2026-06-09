import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const FAQ_KEY = "faq_data";

type FaqItem = { q: string; a: string; published: boolean };

const defaultFaqs: FaqItem[] = [
  { q: "When will my order be delivered?", a: "Orders placed before 22:00 on weekdays are shipped the same day and delivered next day in NL/BE.", published: true },
  { q: "What is your return policy?", a: "You have 30 days to return an item for a full refund. Items must be unused.", published: true },
  { q: "Do you offer a warranty?", a: "All our lamps come with a 2-year warranty against manufacturing defects.", published: true },
];

const CMSFaqs = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>(defaultFaqs);

  useEffect(() => {
    const saved = localStorage.getItem(FAQ_KEY);
    if (saved) {
      try { setFaqs(JSON.parse(saved)); } catch { setFaqs(defaultFaqs); }
    }
  }, []);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(FAQ_KEY, JSON.stringify(faqs));
    toast.success("FAQs saved");
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">FAQs</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-muted-foreground">Manage the questions shown on the customer service page.</p>
            <a href={(import.meta.env.VITE_APP_URL || "https://yourshop.com").replace(/\/$/, '') + "/faqs"} target="_blank" rel="noreferrer" className="text-xs bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary px-2 py-1 rounded-md transition-colors border flex items-center gap-1">
              Live URL: {(import.meta.env.VITE_APP_URL || "https://yourshop.com").replace(/\/$/, '')}/faqs
            </a>
          </div>
        </div>
        <Button type="submit" className="gap-2"><Save className="h-4 w-4" /> Save changes</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>FAQ list</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {faqs.map((f, idx) => (
            <div key={idx} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-3">
                <Input
                  value={f.q}
                  onChange={(e) => {
                    const next = [...faqs];
                    next[idx].q = e.target.value;
                    setFaqs(next);
                  }}
                  placeholder="Question"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={f.a}
                onChange={(e) => {
                  const next = [...faqs];
                  next[idx].a = e.target.value;
                  setFaqs(next);
                }}
                rows={2}
                placeholder="Answer"
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={f.published}
                  onCheckedChange={(v) => {
                    const next = [...faqs];
                    next[idx].published = v;
                    setFaqs(next);
                  }}
                />
                <Label>Published</Label>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setFaqs([...faqs, { q: "", a: "", published: true }])}
          >
            <Plus className="h-4 w-4" /> Add FAQ
          </Button>
        </CardContent>
      </Card>
    </form>
  );
};

export default CMSFaqs;
