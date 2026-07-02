import { Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";
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

const TYPE_LABEL: Record<string, string> = {
  bulk_optimize: "Bulk SEO optimize",
  autopilot: "SEO Autopilot",
  blog_generate: "AI blog writer",
  faq_generate: "AI FAQ writer",
};

export function SeoJobBanner({ job, onDismiss }: Props) {
  if (!job || job.status === "idle") return null;

  const isActive = job.status === "running" || job.status === "queued";
  const pct = job.progress.total > 0 ? Math.round((job.progress.current / job.progress.total) * 100) : 0;

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
            {isActive ? "Running in background" : job.status === "completed" ? "Job complete" : "Job failed"}
            {job.type ? ` — ${TYPE_LABEL[job.type] || job.type}` : ""}
          </span>
          {!isActive && (
            <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={dismiss}>
              <X className="h-3 w-3" /> Dismiss
            </Button>
          )}
        </div>
        {isActive && (
          <>
            <Progress value={pct} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {job.progress.current}/{job.progress.total}
              {job.progress.label ? ` — ${job.progress.label}` : ""}
              {" · "}You can refresh — the job continues on the server.
            </p>
          </>
        )}
        {!isActive && job.summary && <p className="text-xs">{job.summary}</p>}
        {!isActive && job.error && <p className="text-xs text-destructive">{job.error}</p>}
        {!isActive && job.succeeded > 0 && (
          <p className="text-xs text-muted-foreground">{job.succeeded} succeeded{job.failed > 0 ? `, ${job.failed} failed` : ""}</p>
        )}
      </AlertDescription>
    </Alert>
  );
}
