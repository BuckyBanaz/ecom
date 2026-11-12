import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { toast } from "sonner";
import { Languages, Loader2, Save, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { translationsRepository } from "@/client/apiClient";

type Status = "missing" | "outdated" | "current";

interface Translation {
  name: string;
  shortDescription: string;
  description: string;
  specs: Array<{ key: string; value: string }>;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  translatedAt?: string;
  manual?: boolean;
}

const EMPTY: Translation = { name: "", shortDescription: "", description: "", specs: [], seoTitle: "", seoDescription: "", seoKeywords: "" };

const STATUS_CLASS: Record<Status, string> = {
  current: "bg-emerald-600 hover:bg-emerald-600",
  outdated: "bg-amber-500 hover:bg-amber-500",
  missing: "bg-muted-foreground/60 hover:bg-muted-foreground/60",
};

/**
 * Product edit page (or a Quick Add draft): the AI translation(s) — view, correct by hand, or re-translate.
 * Drafts keep their translation in the draft; publishing copies it to the product.
 */
export function ProductTranslationPanel({ productId, kind = "product" }: { productId: string; kind?: "product" | "draft" }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<string[]>([]);
  const [lang, setLang] = useState<string>("en");
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [all, setAll] = useState<Record<string, Translation>>({});
  const [form, setForm] = useState<Translation>(EMPTY);
  const [busy, setBusy] = useState<"save" | "translate" | null>(null);
  const api = {
    get: () => (kind === "draft" ? translationsRepository.getDraft(productId) : translationsRepository.getProduct(productId)),
    translate: () => (kind === "draft" ? translationsRepository.translateDraft(productId) : translationsRepository.translateProduct(productId)),
    save: (l: string, data: Record<string, unknown>) =>
      kind === "draft" ? translationsRepository.saveDraft(productId, l, data) : translationsRepository.saveProduct(productId, l, data),
  };

  const apply = useCallback((res: any, selected?: string) => {
    const tgts: string[] = res.targets || [];
    const current = selected && tgts.includes(selected) ? selected : tgts[0] || "en";
    setTargets(tgts);
    setLang(current);
    setStatus(res.status || {});
    setAll(res.translations || {});
    setForm({ ...EMPTY, ...(res.translations?.[current] || {}) });
  }, []);

  const load = useCallback(async () => {
    try {
      apply(await api.get());
    } catch (err: any) {
      toast.error(err?.message || t("admin_translations.toast_load_failed"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, kind, apply, t]);

  useEffect(() => {
    load();
  }, [load]);

  const switchLang = (code: string) => {
    setLang(code);
    setForm({ ...EMPTY, ...(all[code] || {}) });
  };

  const retranslate = async () => {
    if (all[lang]?.manual && !window.confirm(t("admin_translations.confirm_overwrite_manual"))) return;
    setBusy("translate");
    try {
      apply(await api.translate(), lang);
      toast.success(t("admin_translations.toast_translated"));
    } catch (err: any) {
      toast.error(err?.message || t("admin_translations.toast_translate_failed"));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy("save");
    try {
      const res = await api.save(lang, form as unknown as Record<string, unknown>);
      setAll((prev) => ({ ...prev, [lang]: res.translation }));
      setStatus((prev) => ({ ...prev, [lang]: "current" }));
      setForm({ ...EMPTY, ...res.translation });
      toast.success(t("admin_translations.toast_saved"));
    } catch (err: any) {
      toast.error(err?.message || t("admin_translations.toast_save_failed"));
    } finally {
      setBusy(null);
    }
  };

  const set = <K extends keyof Translation>(key: K, value: Translation[K]) => setForm((f) => ({ ...f, [key]: value }));
  const st: Status = status[lang] || "missing";
  const has = Boolean(all[lang]);

  return (
    <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b pb-4 mb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            {t("admin_translations.title")}
          </CardTitle>
          <CardDescription className="text-xs">{t("admin_translations.subtitle")}</CardDescription>
        </div>
        {!loading && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge className={STATUS_CLASS[st]}>{t(`admin_translations.status_${st}`)}</Badge>
            {all[lang]?.manual && <span className="text-[11px] text-muted-foreground">{t("admin_translations.manual")}</span>}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {targets.length > 1 && (
              <div className="flex gap-2">
                {targets.map((code) => (
                  <Button key={code} type="button" size="sm" variant={code === lang ? "default" : "outline"} className="rounded-full" onClick={() => switchLang(code)}>
                    {code.toUpperCase()}
                  </Button>
                ))}
              </div>
            )}

            {!has ? (
              <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{t("admin_translations.empty")}</p>
            ) : (
              <>
                {st === "outdated" && <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">{t("admin_translations.outdated_hint")}</p>}
                <div>
                  <Label>{t("admin_translations.field_name")}</Label>
                  <Input className="mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div>
                  <Label>{t("admin_translations.field_short")}</Label>
                  <Textarea className="mt-1" rows={2} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
                </div>
                <div>
                  <Label>{t("admin_translations.field_description")}</Label>
                  <div className="mt-1">
                    <RichTextEditor key={`${lang}-${all[lang]?.translatedAt || ""}`} value={form.description} onChange={(v) => set("description", v)} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>{t("admin_translations.field_seo_title")} <span className="text-muted-foreground">({form.seoTitle.length}/60)</span></Label>
                    <Input className="mt-1" value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
                  </div>
                  <div>
                    <Label>{t("admin_translations.field_seo_keywords")}</Label>
                    <Input className="mt-1" value={form.seoKeywords} onChange={(e) => set("seoKeywords", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>{t("admin_translations.field_seo_description")} <span className="text-muted-foreground">({form.seoDescription.length}/160)</span></Label>
                  <Textarea className="mt-1" rows={2} value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
                </div>
                {form.specs.length > 0 && (
                  <div>
                    <Label>{t("admin_translations.field_specs")}</Label>
                    <div className="mt-1 space-y-1.5">
                      {form.specs.map((row, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2">
                          <Input value={row.key} onChange={(e) => set("specs", form.specs.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))} />
                          <Input value={row.value} onChange={(e) => set("specs", form.specs.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {all[lang]?.translatedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t("admin_translations.updated_at", { date: format(new Date(all[lang].translatedAt as string), "dd MMM yyyy, HH:mm") })}
                  </p>
                )}
              </>
            )}

            <div className="flex flex-wrap gap-2">
              {has && (
                <Button type="button" className="rounded-full" onClick={save} disabled={busy !== null}>
                  {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t("admin_translations.save")}
                </Button>
              )}
              <Button type="button" variant="outline" className="rounded-full" onClick={retranslate} disabled={busy !== null}>
                {busy === "translate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {busy === "translate" ? t("admin_translations.translating") : has ? t("admin_translations.retranslate") : t("admin_translations.translate_now")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("admin_translations.auto_hint")}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
