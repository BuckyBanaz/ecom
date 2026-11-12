import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Save, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { translationsRepository } from "@/client/apiClient";

type Status = "missing" | "outdated" | "current";

const STATUS_CLASS: Record<Status, string> = {
  current: "bg-emerald-600 hover:bg-emerald-600",
  outdated: "bg-amber-500 hover:bg-amber-500",
  missing: "bg-muted-foreground/60 hover:bg-muted-foreground/60",
};

/** Long text fields get a textarea instead of a one-line input */
const MULTILINE = new Set(["excerpt", "seoDescription", "seoDesc"]);

/**
 * CMS page / blog editor: the AI version of the content in one storefront language — review, correct by hand,
 * or re-translate. The source text is edited in the normal form; this only touches the translation.
 */
export function ContentTranslationPanel({ type, id, lang }: { type: "cmsPage" | "blog"; id: string; lang: string }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<{ text: string[]; html: string[] }>({ text: [], html: [] });
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [all, setAll] = useState<Record<string, Record<string, any>>>({});
  const [form, setForm] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState<"save" | "translate" | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  const apply = useCallback(
    (res: any) => {
      setFields({ text: res.fields?.text || [], html: res.fields?.html || [] });
      setStatus(res.status || {});
      setAll(res.translations || {});
      setForm({ ...(res.translations?.[lang] || {}) });
      setEditorKey((k) => k + 1);
    },
    [lang]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apply(await translationsRepository.getContent(type, id));
    } catch (err: any) {
      toast.error(err?.message || t("admin_translations.toast_load_failed"));
    } finally {
      setLoading(false);
    }
  }, [type, id, apply, t]);

  useEffect(() => {
    load();
  }, [load]);

  const retranslate = async () => {
    if (all[lang]?.manual && !window.confirm(t("admin_translations.confirm_overwrite_manual"))) return;
    setBusy("translate");
    try {
      await translationsRepository.translateContent(type, id);
      await load();
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
      const data = Object.fromEntries([...fields.text, ...fields.html].map((f) => [f, form[f] ?? ""]));
      const res = await translationsRepository.saveContent(type, id, lang, data);
      setAll((prev) => ({ ...prev, [lang]: res.translation }));
      setStatus((prev) => ({ ...prev, [lang]: "current" }));
      toast.success(t("admin_translations.toast_saved"));
    } catch (err: any) {
      toast.error(err?.message || t("admin_translations.toast_save_failed"));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center rounded-xl border bg-card p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const st: Status = status[lang] || "missing";
  const has = Boolean(all[lang]);
  const label = (f: string) => t(`admin_translations.field_${f}`, f);

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">{t("admin_translations.content_panel_hint", { lang: lang.toUpperCase() })}</p>
        <div className="flex flex-col items-end gap-1">
          <Badge className={STATUS_CLASS[st]}>{t(`admin_translations.status_${st}`)}</Badge>
          {all[lang]?.manual && <span className="text-[11px] text-muted-foreground">{t("admin_translations.manual")}</span>}
        </div>
      </div>

      {!has ? (
        <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{t("admin_translations.empty")}</p>
      ) : (
        <>
          {st === "outdated" && <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">{t("admin_translations.outdated_hint")}</p>}
          {fields.text.map((f) => (
            <div key={f}>
              <Label>{label(f)}</Label>
              {MULTILINE.has(f) ? (
                <Textarea className="mt-1" rows={2} value={form[f] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} />
              ) : (
                <Input className="mt-1" value={form[f] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} />
              )}
            </div>
          ))}
          {fields.html.map((f) => (
            <div key={f}>
              <Label>{label(f)}</Label>
              <div className="mt-1">
                <RichTextEditor key={`${lang}-${f}-${editorKey}`} value={form[f] ?? ""} onChange={(v) => setForm((p) => ({ ...p, [f]: v }))} />
              </div>
            </div>
          ))}
          {all[lang]?.translatedAt && (
            <p className="text-xs text-muted-foreground">
              {t("admin_translations.updated_at", { date: format(new Date(all[lang].translatedAt), "dd MMM yyyy, HH:mm") })}
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
    </div>
  );
}

/** Tab bar for editors: the source form + one tab per storefront language */
export function ContentLanguageTabs({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const { t } = useTranslation();
  const tabs = ["source", "nl", "en"];
  return (
    <div className="inline-flex rounded-full border bg-muted/40 p-1" role="tablist">
      {tabs.map((code) => (
        <button
          key={code}
          type="button"
          role="tab"
          aria-selected={value === code}
          disabled={disabled && code !== "source"}
          title={disabled && code !== "source" ? t("admin_translations.save_first") : undefined}
          onClick={() => onChange(code)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            value === code ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t(`admin_translations.tab_${code}`)}
        </button>
      ))}
    </div>
  );
}
