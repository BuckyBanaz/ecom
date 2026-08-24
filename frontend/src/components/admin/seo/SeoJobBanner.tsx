import { Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import apiClient from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";
import type { SeoJobState } from "@/hooks/useSeoJobStatus";

type Props = {
  job: SeoJobState | null;
  onDismiss?: () => void;
};

export function SeoJobBanner({ job, onDismiss }: Props) {
  const { t } = useTranslation();

  if (!job || job.status === "idle") return null;

  const isActive = job.status === "running" || job.status === "queued";
  const pct = job.progress.total > 0 ? Math.round((job.progress.current / job.progress.total) * 100) : 0;

  const typeLabel: Record<string, string> = {
    bulk_optimize: t("cms_seo.job_type_bulk"),
    autopilot: t("cms_seo.job_type_autopilot"),
    blog_generate: t("cms_seo.job_type_blog"),
    faq_generate: t("cms_seo.job_type_faq"),
  };

  const dismiss = async () => {
    if (isActive) return;
    await apiClient.post(ENDPOINTS.AI_SEO_JOB_DISMISS);
    onDismiss?.();
  };

  return (
    <Alert className={isActive ? "border-primary/40 bg-primary/5" : job.status === "failed" ? "border-destructive/40" : "border-green-500/40"}>
      {isActive ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : job.status === "completed" ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-destructive" />
      )}
      <AlertDescription className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium">
            {isActive ? t("cms_seo.job_running") : job.status === "completed" ? t("cms_seo.job_complete") : t("cms_seo.job_failed")}
            {job.type ? ` — ${typeLabel[job.type] || job.type}` : ""}
          </span>
          {!isActive && (
            <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={dismiss}>
              <X className="h-3 w-3" /> {t("cms_seo.job_dismiss")}
            </Button>
          )}
        </div>
        {isActive && (
          <>
            <Progress value={pct} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {job.progress.current}/{job.progress.total}
              {job.progress.label ? ` — ${job.progress.label}` : ""}
              {" · "}{t("cms_seo.job_refresh_hint")}
            </p>
          </>
        )}
        {!isActive && job.summary && <p className="text-xs">{job.summary}</p>}
        {!isActive && job.error && <p className="text-xs text-destructive">{job.error}</p>}
        {!isActive && job.succeeded > 0 && (
          <p className="text-xs text-muted-foreground">
            {job.failed > 0
              ? t("cms_seo.job_succeeded_failed", { succeeded: job.succeeded, failed: job.failed })
              : t("cms_seo.job_succeeded", { count: job.succeeded })}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
