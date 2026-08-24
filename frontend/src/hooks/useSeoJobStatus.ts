import { useCallback, useEffect, useRef, useState } from "react";
import apiClient from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";

export type SeoJobStatus = "idle" | "queued" | "running" | "completed" | "failed";

export type SeoJobState = {
  id: string | null;
  type: "bulk_optimize" | "autopilot" | "blog_generate" | "faq_generate" | null;
  status: SeoJobStatus;
  progress: { current: number; total: number; label: string | null };
  startedAt: string | null;
  finishedAt: string | null;
  summary: string | null;
  error: string | null;
  succeeded: number;
  failed: number;
  publishIntent?: boolean;
  result?: {
    blog?: {
      generated: {
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
      published: boolean;
      blogId?: string;
    };
  } | null;
  faqs?: Array<{ q: string; a: string; published: boolean }>;
};

const POLL_MS = 2000;

export function useSeoJobStatus(onComplete?: () => void) {
  const [job, setJob] = useState<SeoJobState | null>(null);
  const prevStatus = useRef<SeoJobStatus | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiClient.get<{ job: SeoJobState }>(ENDPOINTS.AI_SEO_JOB);
      setJob(res.job);
      return res.job;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!job) return;
    const active = job.status === "running" || job.status === "queued";
    if (!active) {
      if (
        onCompleteRef.current &&
        (job.status === "completed" || job.status === "failed") &&
        prevStatus.current &&
        (prevStatus.current === "running" || prevStatus.current === "queued")
      ) {
        onCompleteRef.current();
      }
      prevStatus.current = job.status;
      return;
    }

    prevStatus.current = job.status;
    const timer = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(timer);
  }, [job?.status, job?.progress?.current, fetchStatus]);

  const isActive = job?.status === "running" || job?.status === "queued";

  return { job, isActive, refresh: fetchStatus };
}
