import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import { toast } from "sonner";

const presets: Record<string, { title: string; slug: string; body: string }> = {
  "privacy-policy": {
    title: "Privacy Policy",
    slug: "privacy-policy",
    body: "We respect your privacy. This document describes what data we collect and how we use it...",
  },
  "terms-conditions": {
    title: "Terms & Conditions",
    slug: "terms-conditions",
    body: "By using our service you agree to the following terms...",
  },
};

const CMSLegal = () => {
  const { kind = "privacy-policy" } = useParams();
  const preset = presets[kind] ?? presets["privacy-policy"];
  const [title, setTitle] = useState(preset.title);
  const [slug, setSlug] = useState(preset.slug);
  const [body, setBody] = useState(preset.body);

  const save = (e: React.FormEvent) => { e.preventDefault(); toast.success(`${title} saved (demo)`); };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{preset.title}</h1>
          <p className="text-muted-foreground">Edit legal page content</p>
        </div>
        <Button type="submit" className="gap-2"><Save className="h-4 w-4" /> Save</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Page content</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
            <div><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1" /></div>
          </div>
          <div>
            <Label>Body (Markdown supported)</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 min-h-[400px] font-mono text-sm" />
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default CMSLegal;