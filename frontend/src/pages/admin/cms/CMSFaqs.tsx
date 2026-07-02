import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Save, Trash2, Sparkles, Loader2, Globe, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { getClientBaseUrl } from "@/utils/siteUrl";
import { cmsFaqsRepository } from "@/client/apiClient";
import apiClient from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";
import { SeoJobBanner } from "@/components/admin/seo/SeoJobBanner";
import { SuggestionActions } from "@/components/admin/SuggestionActions";
import { useSeoJobStatus } from "@/hooks/useSeoJobStatus";

type FaqItem = { q: string; a: string; published: boolean };

type CmsContextSummary = {
  pageCount: number;
  categoryCount: number;
  productCount: number;
  blogCount: number;
  existingFaqCount: number;
  couponCount: number;
};

const defaultFaqs: FaqItem[] = [
  { q: "When will my order be delivered?", a: "Orders placed before 22:00 on weekdays are shipped the same day and delivered next day in NL/BE.", published: true },
  { q: "What is your return policy?", a: "You have 30 days to return an item for a full refund. Items must be unused.", published: true },
  { q: "Do you offer a warranty?", a: "All our lamps come with a 2-year warranty against manufacturing defects.", published: true },
];

const CMSFaqs = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>(defaultFaqs);
  const [pendingAiFaqs, setPendingAiFaqs] = useState<FaqItem[]>([]);
  const [cmsSummary, setCmsSummary] = useState<CmsContextSummary | null>(null);
  const [aiFocus, setAiFocus] = useState("");
  const [mergeExisting, setMergeExisting] = useState(true);
  const [aiStarting, setAiStarting] = useState(false);
  const [aiMode, setAiMode] = useState<"draft" | "save" | null>(null);
  const faqsRef = useRef(faqs);
  faqsRef.current = faqs;

  const refreshJobRef = useRef<(() => void) | null>(null);

  const handleJobComplete = useCallback(async () => {
    const res = await apiClient.get<{
      job: {
        status?: string;
        type?: string;
        summary?: string;
        error?: string;
        publishIntent?: boolean;
        result?: { faqs?: FaqItem[] };
      };
    }>(ENDPOINTS.AI_SEO_JOB);

    const job = res.job;
    if (job?.status === "completed" && job.type === "faq_generate" && job.result?.faqs?.length) {
      if (job.publishIntent) {
        setFaqs(job.result.faqs);
        setPendingAiFaqs([]);
        toast.success(job.summary || "FAQs saved");
      } else {
        setPendingAiFaqs(job.result.faqs);
        toast.success("AI FAQ suggestions ready — add the ones you want below");
      }
      await apiClient.post(ENDPOINTS.AI_SEO_JOB_DISMISS);
      refreshJobRef.current?.();
    } else if (job?.status === "failed" && job.type === "faq_generate") {
      toast.error(job.error || "FAQ generation failed");
    }
    setAiMode(null);
  }, []);

  const { job, isActive, refresh: refreshJob } = useSeoJobStatus(handleJobComplete);
  refreshJobRef.current = refreshJob;

  useEffect(() => {
    let active = true;
    cmsFaqsRepository.get().then((res) => {
      if (active && res.success && res.data) setFaqs(res.data);
    }).catch(() => {
      const saved = localStorage.getItem("faq_data");
      if (saved && active) {
        try { setFaqs(JSON.parse(saved)); } catch { setFaqs(defaultFaqs); }
      }
    });
    apiClient.get<{ summary: CmsContextSummary }>(ENDPOINTS.AI_CMS_CONTEXT)
      .then((res) => { if (active) setCmsSummary(res.summary); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (
      job?.status === "completed" &&
      job.type === "faq_generate" &&
      job.result?.faqs?.length &&
      job.publishIntent !== true
    ) {
      setPendingAiFaqs(job.result.faqs);
    }
  }, [job?.id, job?.status]);

  const addPendingFaq = (idx: number) => {
    const item = pendingAiFaqs[idx];
    if (!item) return;
    setFaqs((prev) => [...prev, item]);
    setPendingAiFaqs((prev) => prev.filter((_, i) => i !== idx));
    toast.success("FAQ added to list");
  };

  const dismissPendingFaq = (idx: number) => {
    setPendingAiFaqs((prev) => prev.filter((_, i) => i !== idx));
  };

  const addAllPendingFaqs = () => {
    setFaqs((prev) => [...prev, ...pendingAiFaqs]);
    setPendingAiFaqs([]);
    toast.success("All suggested FAQs added");
  };

  const generateFaqs = async (autoSave = false) => {
    setAiMode(autoSave ? "save" : "draft");
    setAiStarting(true);
    try {
      const res = await apiClient.post<{ message?: string; alreadyRunning?: boolean }>(ENDPOINTS.AI_FAQ_GENERATE, {
        focus: aiFocus || undefined,
        mergeWithExisting: mergeExisting,
        existingFaqs: faqsRef.current,
        limit: 12,
        autoSave,
      });
      toast.success(res.message || (autoSave ? "Generating & saving…" : "FAQ draft queued"));
      refreshJob();
    } catch (err: any) {
      toast.error(err?.message || "FAQ generation failed");
      setAiMode(null);
    } finally {
      setAiStarting(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await cmsFaqsRepository.update(faqs);
      if (res.success) toast.success("FAQs saved");
      else toast.error("Failed to save FAQs");
    } catch {
      toast.error("Network error");
    }
  };

  const aiBusy = aiStarting || isActive;
  const draftBusy = aiBusy && (aiMode === "draft" || (isActive && job?.type === "faq_generate" && job?.publishIntent !== true));
  const saveBusy = aiBusy && (aiMode === "save" || (isActive && job?.type === "faq_generate" && job?.publishIntent === true));

  return (
    <form onSubmit={save} className="space-y-6">
      <SeoJobBanner job={job} onDismiss={refreshJob} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">FAQs</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <p className="text-muted-foreground">SEO, AEO &amp; GEO optimized FAQs from your full CMS.</p>
            <a href={`${getClientBaseUrl()}/faqs`} target="_blank" rel="noreferrer" className="text-xs bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary px-2 py-1 rounded-md border">
              Live: /faqs
            </a>
          </div>
        </div>
        <Button type="submit" className="gap-2 shrink-0"><Save className="h-4 w-4" /> Save changes</Button>
      </div>

      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription className="text-sm">
          AI reads your <strong>dynamic CMS pages</strong>, categories, blogs, offers &amp; existing FAQs — same context as the Rich Text Editor AI.
          {cmsSummary && (
            <span className="block mt-1 text-xs text-muted-foreground">
              Loaded: {cmsSummary.pageCount} pages · {cmsSummary.categoryCount} categories · {cmsSummary.blogCount} blogs · {cmsSummary.productCount} products · {cmsSummary.existingFaqCount} existing FAQs
            </span>
          )}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI FAQ Writer</CardTitle>
          <CardDescription>Generate answers Google &amp; AI assistants can cite (FAQ schema on /faqs)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Focus (optional)</Label>
            <Textarea
              value={aiFocus}
              onChange={(e) => setAiFocus(e.target.value)}
              placeholder="e.g. shipping to Belgium, LED warranty, business orders, returns process…"
              rows={2}
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={mergeExisting} onCheckedChange={setMergeExisting} />
            <Label>Keep existing FAQs and add new ones</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={aiBusy} onClick={() => generateFaqs(false)} className="gap-2">
              {draftBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              AI Draft
            </Button>
            <Button type="button" disabled={aiBusy} onClick={() => generateFaqs(true)} className="gap-2">
              {saveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              AI Generate &amp; Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Use AI Draft for suggestions you can add one-by-one, or Generate &amp; Save to apply all at once.</p>
        </CardContent>
      </Card>

      {pendingAiFaqs.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">AI FAQ suggestions</CardTitle>
                <CardDescription>Add only the FAQs you want — nothing is saved until you click Save changes.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={addAllPendingFaqs}>Add all</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPendingAiFaqs([])}>Dismiss all</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingAiFaqs.map((f, idx) => (
              <div key={`pending-${idx}-${f.q.slice(0, 24)}`} className="rounded-lg border bg-background p-3 space-y-2">
                <p className="text-sm font-semibold">{f.q}</p>
                <p className="text-sm text-muted-foreground">{f.a}</p>
                <SuggestionActions addLabel="Add to list" dismissLabel="Skip" onAdd={() => addPendingFaq(idx)} onDismiss={() => dismissPendingFaq(idx)} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
                  className="text-destructive shrink-0"
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
