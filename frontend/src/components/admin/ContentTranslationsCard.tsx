import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2, Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { translationsRepository } from "@/client/apiClient";

interface Group {
  id: string;
  label: string;
  total: number;
  current: number;
}

interface Job {
  status: "idle" | "running" | "completed" | "failed";
  total: number;
  done: number;
  translated: number;
  failed: number;
  current?: string;
  errors?: string[];
}

/** CMS pages, blogs, categories, menus and site texts: translation status + "translate all" */
export function ContentTranslationsCard() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [starting, setStarting] = useState(false);
  const wasRunning = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await translationsRepository.contentStatus();
      setGroups(res.groups || []);
      setLanguages(res.languages || []);
      setJob(res.job);
    } catch (err: any) {
      toast.error(err?.message || t("admin_translations.toast_load_failed"));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!job) return;
    if (job.status === "running") {
      wasRunning.current = true;
      const timer = setTimeout(load, 3000);
      return () => clearTimeout(timer);
    }
    if (wasRunning.current) {
      wasRunning.current = false;
      if (job.status === "completed") toast.success(t("admin_translations.toast_content_done", { count: job.translated, failed: job.failed }));
      else if (job.status === "failed") toast.error(t("admin_translations.toast_all_failed", { message: job.errors?.slice(-1)[0] || "" }));
    }
  }, [job, load, t]);

  const start = async () => {
    setStarting(true);
    try {
      await translationsRepository.translateAllContent();
      toast.info(t("admin_translations.toast_all_started"));
      await load();
    } catch (err: any) {
      toast.error(err?.message || t("admin_translations.toast_translate_failed"));
    } finally {
      setStarting(false);
    }
  };

  const running = job?.status === "running";
  const todo = groups.reduce((sum, g) => sum + (g.total - g.current), 0);
  const pct = job && job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Languages className="h-5 w-5 text-primary" />
            {t("admin_translations.content_title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("admin_translations.content_subtitle", { langs: languages.map((l) => l.toUpperCase()).join(" + ") })}
          </p>
        </div>
        <Button className="shrink-0 rounded-full gap-1.5" onClick={start} disabled={running || starting}>
          {running || starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
          {running ? t("admin_translations.translating") : t("admin_translations.content_translate_all")}
        </Button>
      </div>

      <ul className="divide-y rounded-xl border">
        {groups.map((g) => {
          const done = g.total > 0 && g.current === g.total;
          return (
            <li key={g.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span className="font-medium">{t(`admin_translations.group_${g.id}`, g.label)}</span>
              <span className={`flex items-center gap-1.5 tabular-nums ${done ? "text-emerald-600" : "text-muted-foreground"}`}>
                {done && <CheckCircle2 className="h-4 w-4" />}
                {t("admin_translations.group_count", { current: g.current, total: g.total })}
              </span>
            </li>
          );
        })}
      </ul>

      {running && job && (
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{t("admin_translations.bar_running", { done: job.done, total: job.total, current: job.current || "" })}</p>
        </div>
      )}

      {!running && job?.errors && job.errors.length > 0 && (
        <details className="rounded-lg bg-destructive/5 p-3 text-xs">
          <summary className="cursor-pointer font-medium text-destructive">{t("admin_translations.errors", { count: job.errors.length })}</summary>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {job.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-muted-foreground">
        {todo > 0 ? t("admin_translations.content_todo", { count: todo }) : t("admin_translations.content_all_current")}{" "}
        {t("admin_translations.content_auto_hint")}
      </p>
    </section>
  );
}
