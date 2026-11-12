import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { translationsRepository } from "@/client/apiClient";

interface Job {
  status: "idle" | "running" | "completed" | "failed";
  total: number;
  done: number;
  translated: number;
  skipped: number;
  failed: number;
  current?: string;
  error?: string;
}

interface Overview {
  targets: string[];
  counts: { total: number; current: number; outdated: number; missing: number };
  job: Job;
}

/** Products page: how many products are translated, and a button to translate the rest in the background */
export function ProductTranslationsBar() {
  const { t } = useTranslation();
  const [data, setData] = useState<Overview | null>(null);
  const [starting, setStarting] = useState(false);
  const wasRunning = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await translationsRepository.productsStatus();
      setData(res);
      return res as Overview;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while the job runs; tell the admin when it is done
  useEffect(() => {
    if (!data) return;
    const running = data.job.status === "running";
    if (running) {
      wasRunning.current = true;
      const timer = setTimeout(load, 3000);
      return () => clearTimeout(timer);
    }
    if (wasRunning.current) {
      wasRunning.current = false;
      if (data.job.status === "completed") toast.success(t("admin_translations.toast_all_done", { count: data.job.translated, failed: data.job.failed }));
      else if (data.job.status === "failed") toast.error(t("admin_translations.toast_all_failed", { message: data.job.error || "" }));
    }
  }, [data, load, t]);

  const start = async () => {
    setStarting(true);
    try {
      await translationsRepository.translateAllProducts();
      toast.info(t("admin_translations.toast_all_started"));
      await load();
    } catch (err: any) {
      toast.error(err?.message || t("admin_translations.toast_translate_failed"));
    } finally {
      setStarting(false);
    }
  };

  if (!data || data.targets.length === 0) return null;
  const { counts, job } = data;
  const running = job.status === "running";
  const todo = counts.missing + counts.outdated;
  const pct = job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;

  return (
    <div className="mt-4 rounded-2xl border bg-card/60 p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Languages className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <p className="font-semibold">
              {t("admin_translations.bar_title", { langs: data.targets.map((l) => l.toUpperCase()).join(", ") })}
            </p>
            <p className="text-xs text-muted-foreground">
              {running
                ? t("admin_translations.bar_running", { done: job.done, total: job.total, current: job.current || "" })
                : t("admin_translations.bar_counts", { current: counts.current, total: counts.total, missing: counts.missing, outdated: counts.outdated })}
            </p>
          </div>
        </div>
        <Button
          variant={todo > 0 ? "default" : "outline"}
          size="sm"
          className="rounded-full gap-1.5"
          onClick={start}
          disabled={running || starting || todo === 0}
        >
          {running || starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
          {running ? t("admin_translations.translating") : todo > 0 ? t("admin_translations.translate_all", { count: todo }) : t("admin_translations.all_current")}
        </Button>
      </div>
      {running && (
        <div className="mt-3 h-1.5 rounded-full bg-muted">
          <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
