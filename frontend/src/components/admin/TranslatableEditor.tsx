import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Save, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { translationsRepository } from "@/client/apiClient";
import { ContentLanguageTabs } from "@/components/admin/ContentTranslationPanel";

type Status = "missing" | "outdated" | "current";
interface Line {
  key: string;
  text: string;
  html: boolean;
  [lang: string]: string | boolean | null;
}

const STATUS_CLASS: Record<Status, string> = {
  current: "bg-emerald-600 hover:bg-emerald-600",
  outdated: "bg-amber-500 hover:bg-amber-500",
  missing: "bg-muted-foreground/60 hover:bg-muted-foreground/60",
};

/**
 * Settings / menu translations line by line: every text of the original with its translation in `lang`.
 * Only the text changes — links, images and layout are not editable here and the server rejects HTML whose
 * tags or links were altered. `target` is "config:<key>" or "megaMenu:<id>".
 */
export function LineTranslationPanel({ target, lang, title }: { target: string; lang: string; title?: string }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<Line[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("missing");
  const [manual, setManual] = useState(false);
  const [translatedAt, setTranslatedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "translate" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await translationsRepository.getLines(target);
      setLines(res.leaves || []);
      setStatus(res.status?.[lang] || "missing");
      setManual(Boolean(res.manual?.[lang]));
      setTranslatedAt(res.translatedAt?.[lang] || null);
      setEdits({});
    } catch (err: any) {
      toast.error(err?.message || t("admin_translations.toast_load_failed"));
    } finally {
      setLoading(false);
    }
  }, [target, lang, t]);

  useEffect(() => {
    load();
  }, [load]);

  const retranslate = async () => {
    if (manual && !window.confirm(t("admin_translations.confirm_overwrite_manual"))) return;
    setBusy("translate");
    try {
      const [kind, ...rest] = target.split(":");
      await translationsRepository.translateContent(kind, rest.join(":"));
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
      await translationsRepository.saveLines(target, lang, edits);
      await load();
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

  const value = (line: Line) => edits[line.key] ?? (typeof line[lang] === "string" ? (line[lang] as string) : "");

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {title && <h3 className="font-semibold">{title}</h3>}
          <p className="max-w-xl text-sm text-muted-foreground">{t("admin_translations.lines_hint", { lang: lang.toUpperCase() })}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={STATUS_CLASS[status]}>{t(`admin_translations.status_${status}`)}</Badge>
          {manual && <span className="text-[11px] text-muted-foreground">{t("admin_translations.manual")}</span>}
        </div>
      </div>

      {status === "missing" ? (
        <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{t("admin_translations.empty")}</p>
      ) : lines.length === 0 ? (
        <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{t("admin_translations.no_lines")}</p>
      ) : (
        <>
          {status === "outdated" && <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">{t("admin_translations.outdated_hint")}</p>}
          <ul className="space-y-3">
            {lines.map((line) => (
              <li key={line.key} className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                <p className={`whitespace-pre-wrap break-words text-xs text-muted-foreground ${line.html ? "font-mono" : ""}`}>{line.text}</p>
                {line.html || line.text.length > 90 ? (
                  <Textarea
                    rows={line.html ? Math.min(14, Math.max(4, Math.ceil(line.text.length / 90))) : 3}
                    className={line.html ? "font-mono text-xs" : ""}
                    value={value(line)}
                    onChange={(e) => setEdits((p) => ({ ...p, [line.key]: e.target.value }))}
                  />
                ) : (
                  <Input value={value(line)} onChange={(e) => setEdits((p) => ({ ...p, [line.key]: e.target.value }))} />
                )}
              </li>
            ))}
          </ul>
          {translatedAt && (
            <p className="text-xs text-muted-foreground">{t("admin_translations.updated_at", { date: format(new Date(translatedAt), "dd MMM yyyy, HH:mm") })}</p>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-2">
        {status !== "missing" && lines.length > 0 && (
          <Button type="button" className="rounded-full" onClick={save} disabled={busy !== null || Object.keys(edits).length === 0}>
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("admin_translations.save")}
          </Button>
        )}
        <Button type="button" variant="outline" className="rounded-full" onClick={retranslate} disabled={busy !== null}>
          {busy === "translate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy === "translate" ? t("admin_translations.translating") : status === "missing" ? t("admin_translations.translate_now") : t("admin_translations.retranslate")}
        </Button>
      </div>
    </section>
  );
}

/**
 * Wraps a CMS editor page with "Original | Nederlands | English" tabs. The original editor stays mounted (hidden)
 * on the translation tabs, so unsaved edits are not lost.
 */
export function TranslatableEditor({ children, panels }: { children: ReactNode; panels: (lang: string) => ReactNode }) {
  const [tab, setTab] = useState("source");
  return (
    <div className="space-y-6">
      <ContentLanguageTabs value={tab} onChange={setTab} />
      <div className={tab === "source" ? "" : "hidden"}>{children}</div>
      {tab !== "source" && <div className="space-y-6">{panels(tab)}</div>}
    </div>
  );
}
