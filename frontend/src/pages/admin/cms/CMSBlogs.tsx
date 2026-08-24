import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { MediaLibraryDialog } from "@/components/admin/media/MediaLibraryDialog";
import { SeoJobBanner } from "@/components/admin/seo/SeoJobBanner";
import { SuggestionActions } from "@/components/admin/SuggestionActions";
import { Plus, Pencil, Trash2, Upload, Sparkles, Loader2, Tag, TrendingDown, Gift } from "lucide-react";
import { toast } from "sonner";
import { initialBlogs, Blog } from "@/data/blogs";
import { blogRepository } from "@/client/apiClient";
import { normalizeUploadedUrl } from "@/utils/image";
import apiClient from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";
import { useSeoJobStatus } from "@/hooks/useSeoJobStatus";

type TopicSuggestion = {
  id: string;
  type: string;
  label: string;
  topic: string;
};

const TOPIC_ICONS: Record<string, typeof Gift> = {
  offer: Gift,
  price_drop: TrendingDown,
  new_product: Sparkles,
  new_arrival: Sparkles,
  best_seller: Tag,
};

type GeneratedBlog = {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  cover?: string | null;
  author?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
};

const CMSBlogs = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [edit, setEdit] = useState<Blog | null>(null);
  const [form, setForm] = useState<Omit<Blog, "id" | "date">>({
    title: "", slug: "", excerpt: "", body: "", cover: null, author: "", published: true,
    seoTitle: "", seoDescription: "", seoKeywords: "",
  });
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | undefined>();
  const [aiStarting, setAiStarting] = useState(false);
  const [aiMode, setAiMode] = useState<"draft" | "publish" | null>(null);
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<string>>(() => new Set());
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  const applyGenerated = useCallback((g: GeneratedBlog, asDraft = true) => {
    if (!g?.title) return;
    setForm({
      title: g.title || "",
      slug: g.slug || "",
      excerpt: g.excerpt || "",
      body: g.body || "",
      cover: g.cover ? normalizeUploadedUrl(g.cover) : null,
      author: g.author || "Schip & Ster",
      published: !asDraft,
      seoTitle: g.seoTitle || "",
      seoDescription: g.seoDescription || "",
      seoKeywords: g.seoKeywords || "",
    });
    setEdit(null);
    setIsEditorOpen(true);
  }, []);

  const fetchBlogs = useCallback(async () => {
    try {
      const res = await blogRepository.getAll();
      if (res.success && res.blogs) {
        setBlogs(res.blogs);
      }
    } catch {
      const saved = localStorage.getItem("blogs_data");
      if (saved) {
        try { setBlogs(JSON.parse(saved)); } catch { setBlogs(initialBlogs); }
      } else {
        setBlogs(initialBlogs);
        localStorage.setItem("blogs_data", JSON.stringify(initialBlogs));
      }
    }
  }, []);

  const refreshJobRef = useRef<(() => void) | null>(null);

  const handleJobComplete = useCallback(async () => {
    const res = await apiClient.get<{
      job: {
        status?: string;
        type?: string;
        summary?: string;
        error?: string;
        publishIntent?: boolean;
        result?: { blog?: { published?: boolean; generated?: GeneratedBlog } };
      };
    }>(ENDPOINTS.AI_SEO_JOB);
    const job = res.job;
    if (job?.status === "completed" && job.type === "blog_generate") {
      const didPublish = job.publishIntent === true || job.result?.blog?.published === true;
      if (didPublish) {
        toast.success(job.summary || "AI blog published live");
        setIsEditorOpen(false);
        fetchBlogs();
        await apiClient.post(ENDPOINTS.AI_SEO_JOB_DISMISS);
        refreshJobRef.current?.();
      } else if (job.result?.blog?.generated) {
        applyGenerated(job.result.blog.generated, true);
        toast.success("AI draft ready — review and click Create to publish");
      }
    } else if (job?.status === "failed" && job.type === "blog_generate") {
      toast.error(job.error || "Blog generation failed");
    }
    setAiMode(null);
  }, [applyGenerated, fetchBlogs]);

  const { job, isActive, refresh: refreshJob } = useSeoJobStatus(handleJobComplete);
  refreshJobRef.current = refreshJob;

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await apiClient.get<{ suggestions: TopicSuggestion[] }>(ENDPOINTS.AI_BLOG_SUGGESTIONS);
      setSuggestions(res.suggestions || []);
    } catch {
      /* optional */
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
    fetchSuggestions();
  }, [fetchBlogs]);

  // Resume draft editor after page refresh (never for publish jobs)
  useEffect(() => {
    if (
      job?.status === "completed" &&
      job.type === "blog_generate" &&
      job.publishIntent !== true &&
      job.result?.blog?.generated &&
      job.result?.blog?.published !== true
    ) {
      applyGenerated(job.result.blog.generated, true);
    }
  }, [job?.id, job?.status, job?.publishIntent]);

  const generateWithAi = async (publish = false, suggestion?: TopicSuggestion) => {
    if (suggestion) {
      setSelectedSuggestionId(suggestion.id);
      setAiTopic(suggestion.topic);
    }
    setAiMode(publish ? "publish" : "draft");
    setAiStarting(true);
    try {
      const res = await apiClient.post<{ message?: string; alreadyRunning?: boolean; job?: { publishIntent?: boolean } }>(ENDPOINTS.AI_BLOG_GENERATE, {
        topic: (suggestion?.topic || aiTopic) || undefined,
        publish,
        suggestionId: suggestion?.id || selectedSuggestionId,
      });
      if (res.alreadyRunning) {
        toast.info(res.message || "A blog job is already running");
      } else {
        toast.success(res.message || (publish ? "Publishing when ready…" : "Draft queued…"));
      }
      refreshJob();
    } catch (err: any) {
      toast.error(err?.message || "AI blog generation failed");
      setAiMode(null);
    } finally {
      setAiStarting(false);
    }
  };

  const pickSuggestion = (s: TopicSuggestion) => {
    setSelectedSuggestionId(s.id);
    setAiTopic(s.topic);
  };

  const dismissSuggestion = (id: string) => {
    setDismissedSuggestionIds((prev) => new Set(prev).add(id));
    if (selectedSuggestionId === id) {
      setSelectedSuggestionId(undefined);
      setAiTopic("");
    }
  };

  const visibleSuggestions = suggestions.filter((s) => !dismissedSuggestionIds.has(s.id));

  const openNew = () => { setEdit(null); setForm({ title: "", slug: "", excerpt: "", body: "", cover: null, author: "", published: true, seoTitle: "", seoDescription: "", seoKeywords: "" }); setIsEditorOpen(true); };
  const openEdit = (b: Blog) => { setEdit(b); setForm({ title: b.title, slug: b.slug, excerpt: b.excerpt, body: b.body, cover: b.cover, author: b.author, published: b.published, seoTitle: b.seoTitle || "", seoDescription: b.seoDescription || "", seoKeywords: b.seoKeywords || "" }); setIsEditorOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (edit) {
        await blogRepository.update(edit.id, form);
        toast.success("Blog updated successfully");
      } else {
        await blogRepository.create(form);
        toast.success("Blog created successfully");
      }
      fetchBlogs();
      setIsEditorOpen(false);
    } catch {
      let updated: Blog[] = [];
      if (edit) {
        updated = blogs.map((b) => (b.id === edit.id ? { ...b, ...form, date: today } : b));
        toast.success("Blog updated (Local Mode)");
      } else {
        updated = [...blogs, { id: Date.now().toString(), ...form, date: today }];
        toast.success("Blog created (Local Mode)");
      }
      setBlogs(updated);
      localStorage.setItem("blogs_data", JSON.stringify(updated));
      setIsEditorOpen(false);
    }
  };

  const del = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this blog?")) {
      try {
        await blogRepository.delete(id);
        toast.success("Blog deleted successfully");
        fetchBlogs();
      } catch {
        const updated = blogs.filter((b) => b.id !== id);
        setBlogs(updated);
        localStorage.setItem("blogs_data", JSON.stringify(updated));
        toast.success("Blog deleted (Local Mode)");
      }
    }
  };

  const aiBusy = aiStarting || isActive;
  const draftBusy = aiBusy && (aiMode === "draft" || (isActive && job?.publishIntent !== true));
  const publishBusy = aiBusy && (aiMode === "publish" || (isActive && job?.publishIntent === true));

  return (
    <div className="space-y-6">
      <SeoJobBanner job={job} onDismiss={refreshJob} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Blogs</h1>
          <p className="text-muted-foreground">AI writes SEO posts from live offers, new products &amp; price drops</p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <Textarea
            placeholder="Custom blog prompt — e.g. Write a guide about LED pendant lights for the living room…"
            value={aiTopic}
            onChange={(e) => { setAiTopic(e.target.value); setSelectedSuggestionId(undefined); }}
            className="min-h-[88px] text-sm resize-y"
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => generateWithAi(false)} disabled={aiBusy} className="gap-2 shrink-0">
              {draftBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              AI Draft
            </Button>
            <Button onClick={() => generateWithAi(true)} disabled={aiBusy} className="gap-2 shrink-0">
              {publishBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              AI Publish
            </Button>
            <Button onClick={openNew} variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Manual post</Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Suggested topics from your store</p>
          <Button variant="ghost" size="sm" onClick={fetchSuggestions} disabled={loadingSuggestions}>Refresh</Button>
        </div>
        {loadingSuggestions ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading offers &amp; products…</div>
        ) : visibleSuggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No suggestions right now — try Refresh or enter a custom topic.</p>
        ) : (
          <div className="space-y-2">
            {visibleSuggestions.map((s) => {
              const Icon = TOPIC_ICONS[s.type] || Tag;
              const active = selectedSuggestionId === s.id;
              return (
                <div
                  key={s.id}
                  className={`flex flex-col gap-3 rounded-lg border p-4 ${active ? "border-primary bg-primary/5" : "bg-muted/20"}`}
                >
                  <button
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left w-full"
                  >
                    <Icon className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{s.label}</p>
                        {s.type === "offer" && <Badge variant="secondary" className="h-5 text-[10px]">Offer</Badge>}
                        {s.type === "price_drop" && <Badge variant="secondary" className="h-5 text-[10px]">Sale</Badge>}
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{s.topic}</p>
                    </div>
                  </button>
                  <div className="flex flex-wrap items-center gap-1.5 border-t pt-3">
                    <SuggestionActions
                      addLabel="AI Draft"
                      dismissLabel="Skip"
                      addDisabled={aiBusy}
                      onAdd={() => generateWithAi(false, s)}
                      onDismiss={() => dismissSuggestion(s.id)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2 text-xs"
                      disabled={aiBusy}
                      onClick={() => generateWithAi(true, s)}
                    >
                      Publish
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Use <strong>AI Draft</strong> to review first, <strong>Publish</strong> to go live, or <strong>Skip</strong> to hide a suggestion.</p>
      </div>

      {isEditorOpen && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{edit ? "Edit Post" : "New Post"}</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditorOpen(false)}>Close</Button>
          </div>
          <form onSubmit={save} className="space-y-4 mt-4">
            <div>
              <Label>Cover image</Label>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-24 w-40 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {form.cover ? <img src={form.cover} alt="" className="h-full w-full object-cover" /> : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Upload className="h-6 w-6" /></div>
                  )}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsMediaLibraryOpen(true)} className="gap-2"><Upload className="h-4 w-4" /> {form.cover ? "Change" : "Browse Media"}</Button>
              </div>
            </div>
            <MediaLibraryDialog
              open={isMediaLibraryOpen}
              onOpenChange={setIsMediaLibraryOpen}
              onSelect={(url) => {
                setForm((p) => ({ ...p, cover: normalizeUploadedUrl(url) }));
                setIsMediaLibraryOpen(false);
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" required /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1" required /></div>
            </div>
            <div><Label>Author</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="mt-1" /></div>
            <div><Label>Excerpt</Label><Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="mt-1" rows={2} /></div>
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-semibold">SEO (search &amp; AI engines)</p>
              <div><Label>SEO title</Label><Input value={form.seoTitle || ""} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} className="mt-1" maxLength={60} placeholder="Max 60 characters" /></div>
              <div><Label>SEO description</Label><Textarea value={form.seoDescription || ""} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} className="mt-1" rows={2} maxLength={160} placeholder="Max 160 characters" /></div>
              <div><Label>SEO keywords</Label><Input value={form.seoKeywords || ""} onChange={(e) => setForm({ ...form, seoKeywords: e.target.value })} className="mt-1" placeholder="lighting, pendant, LED" /></div>
            </div>
            <div>
              <Label>Body</Label>
              <div className="mt-1">
                <RichTextEditor
                  value={form.body}
                  onChange={(val) => setForm({ ...form, body: val })}
                  placeholder="Write the full article here..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /><Label>Published</Label></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button><Button type="submit">{edit ? "Update" : "Create"}</Button></div>
          </form>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {blogs.map((b) => (
          <div key={b.id} className="rounded-xl border overflow-hidden bg-card">
            <div className="aspect-video bg-muted">
              {b.cover ? <img src={b.cover} alt={b.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground text-xs">No cover</div>}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{b.published ? "Published" : "Draft"}</span>
                <span className="text-xs text-muted-foreground">{b.date}</span>
              </div>
              <h3 className="mt-2 font-semibold line-clamp-2">{b.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{b.excerpt}</p>
              <p className="mt-2 text-xs text-muted-foreground">By {b.author || "—"}</p>
              <div className="mt-3 flex gap-1">
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEdit(b)}><Pencil className="h-3 w-3" /> Edit</Button>
                <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => del(b.id)}><Trash2 className="h-3 w-3" /> Delete</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CMSBlogs;
