import { prisma } from "../config/db";
import { aiService } from "./aiService";
import { loadSeoEntityContext, runSeoAudit, saveSeoFields, SeoEntityType } from "./seoAuditService";
import { runSeoAutopilot } from "./seoAutopilotService";

export const SEO_JOB_KEY = "seo_job_state";

export type SeoJobType = "bulk_optimize" | "autopilot" | "blog_generate" | "faq_generate" | "product_optimize";

export type SeoJobStatus = "idle" | "queued" | "running" | "completed" | "failed";

export interface SeoJobResult {
  blog?: {
    generated: Record<string, unknown>;
    published: boolean;
    blogId?: string;
  };
  faqs?: Array<{ q: string; a: string; published: boolean }>;
}

export interface SeoJobState {
  id: string | null;
  type: SeoJobType | null;
  status: SeoJobStatus;
  progress: { current: number; total: number; label: string | null };
  startedAt: string | null;
  finishedAt: string | null;
  summary: string | null;
  error: string | null;
  succeeded: number;
  failed: number;
  result?: SeoJobResult | null;
  /** Set when blog_generate is queued — survives until job completes. */
  publishIntent?: boolean;
  targetEntityId?: string | null;
}

const DEFAULT_JOB: SeoJobState = {
  id: null,
  type: null,
  status: "idle",
  progress: { current: 0, total: 0, label: null },
  startedAt: null,
  finishedAt: null,
  summary: null,
  error: null,
  succeeded: 0,
  failed: 0,
  result: null,
  publishIntent: undefined,
  targetEntityId: null,
};

let processing = false;

async function loadJobState(): Promise<SeoJobState> {
  const row = await prisma.cmsConfig.findUnique({ where: { key: SEO_JOB_KEY } });
  return { ...DEFAULT_JOB, ...((row?.value || {}) as Partial<SeoJobState>) };
}

async function saveJobState(state: SeoJobState): Promise<void> {
  await prisma.cmsConfig.upsert({
    where: { key: SEO_JOB_KEY },
    create: { key: SEO_JOB_KEY, value: state as any },
    update: { value: state as any },
  });
}

export async function getSeoJobStatus(): Promise<SeoJobState> {
  const state = await loadJobState();
  if (state.status === "running" || state.status === "queued") {
    return state;
  }
  return state;
}

/** Mark jobs left running after a server restart as failed. */
export async function recoverSeoJobOnBoot(): Promise<void> {
  const state = await loadJobState();
  if (state.status === "running" || state.status === "queued") {
    await saveJobState({
      ...state,
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: "Job interrupted — server restarted. Start again from the admin panel.",
      progress: { ...state.progress, label: null },
    });
  }
}

function newJobId(): string {
  return `seo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function patchJob(patch: Partial<SeoJobState>): Promise<SeoJobState> {
  const current = await loadJobState();
  const next = { ...current, ...patch };
  await saveJobState(next);
  return next;
}

async function runBulkOptimizeJob(payload: {
  entityType?: SeoEntityType;
  onlyIssues?: boolean;
  limit?: number;
  items?: Array<{ entityType: SeoEntityType; entityId: string }>;
  customPrompt?: string;
}) {
  const cap = Math.min(Math.max(Number(payload.limit) || 10, 1), 100);
  let targets: Array<{ entityType: SeoEntityType; entityId: string; label?: string }> = [];

  if (Array.isArray(payload.items) && payload.items.length > 0) {
    targets = payload.items.slice(0, cap);
  } else {
    const audit = await runSeoAudit({ entityType: payload.entityType, onlyIssues: payload.onlyIssues !== false });
    targets = audit.items.slice(0, cap).map((i) => ({
      entityType: i.entityType,
      entityId: i.entityId,
      label: i.label,
    }));
  }

  await patchJob({
    progress: { current: 0, total: targets.length, label: targets[0]?.label || null },
  });

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    await patchJob({
      progress: { current: i, total: targets.length, label: target.label || `${target.entityType}:${target.entityId}` },
    });

    try {
      const ctx = await loadSeoEntityContext(target.entityType, target.entityId);
      const optimized = await aiService.optimizeSeoEntity({
        entityType: target.entityType,
        label: ctx.label,
        url: ctx.url,
        content: ctx.content,
        existingSeo: ctx.existingSeo,
        customPrompt: payload.customPrompt,
      });
      await saveSeoFields(target.entityType, target.entityId, {
        seoTitle: optimized.seoTitle,
        seoDescription: optimized.seoDescription,
        seoKeywords: optimized.seoKeywords,
      });
      succeeded++;
    } catch {
      failed++;
    }

    await patchJob({ succeeded, failed });
  }

  const summary = `Optimized ${succeeded}/${targets.length} pages`;
  await patchJob({
    status: "completed",
    finishedAt: new Date().toISOString(),
    summary,
    progress: { current: targets.length, total: targets.length, label: null },
    succeeded,
    failed,
  });
}

async function runAutopilotJob(force: boolean) {
  await patchJob({ progress: { current: 0, total: 3, label: "Weekly blog" } });
  const result = await runSeoAutopilot({ force });
  await patchJob({
    status: "completed",
    finishedAt: new Date().toISOString(),
    summary: result.summary,
    progress: { current: 3, total: 3, label: null },
    succeeded: result.seoOptimized + (result.blogCreated ? 1 : 0),
    failed: 0,
  });
}

async function resolveProductImageFromSuggestionId(suggestionId?: string): Promise<string | undefined> {
  if (!suggestionId) return undefined;
  const productId = suggestionId.replace(/^(new|drop|arrival|best)-/, "");
  if (!productId || productId === suggestionId) return undefined;
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { image: true } });
  return product?.image || undefined;
}

async function runBlogGenerateJob(payload: {
  topic?: string;
  targetKeywords?: string;
  publish?: boolean;
  suggestionId?: string;
}) {
  await patchJob({ progress: { current: 0, total: 3, label: "Writing article…" } });

  await patchJob({ progress: { current: 1, total: 3, label: "Generating cover image…" } });

  const productImageUrl = await resolveProductImageFromSuggestionId(payload.suggestionId);
  const generated = await aiService.generateBlog({
    topic: payload.topic,
    targetKeywords: payload.targetKeywords,
    productImageUrl,
  });

  await patchJob({ progress: { current: 2, total: 3, label: "Saving blog…" } });

  let blogId: string | undefined;
  const publish = payload.publish === true;

  if (publish) {
    let slug = generated.slug;
    const existing = await prisma.blog.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const blog = await prisma.blog.create({
      data: {
        title: generated.title,
        slug,
        excerpt: generated.excerpt,
        body: generated.body,
        author: generated.author,
        cover: generated.cover,
        published: true,
        seoTitle: generated.seoTitle,
        seoDescription: generated.seoDescription,
        seoKeywords: generated.seoKeywords,
      },
    });
    blogId = blog.id;
  }

  const summary = publish ? `Published: "${generated.title}"` : `Draft ready: "${generated.title}"`;
  await patchJob({
    status: "completed",
    finishedAt: new Date().toISOString(),
    summary,
    progress: { current: 3, total: 3, label: null },
    succeeded: 1,
    failed: 0,
    result: {
      blog: {
        generated: generated as unknown as Record<string, unknown>,
        published: publish,
        blogId,
      },
    },
  });
}

async function runFaqGenerateJob(payload: {
  focus?: string;
  mergeWithExisting?: boolean;
  existingFaqs?: Array<{ q: string; a: string; published?: boolean }>;
  limit?: number;
  autoSave?: boolean;
}) {
  await patchJob({ progress: { current: 0, total: 2, label: "Loading CMS context…" } });

  const generated = await aiService.generateFaqs({
    focus: payload.focus,
    mergeWithExisting: payload.mergeWithExisting,
    existingFaqs: payload.existingFaqs,
    limit: payload.limit,
  });

  await patchJob({ progress: { current: 1, total: 2, label: "Saving FAQs…" } });

  if (payload.autoSave === true) {
    await prisma.cmsConfig.upsert({
      where: { key: "faq_data" },
      create: { key: "faq_data", value: generated.faqs as any },
      update: { value: generated.faqs as any },
    });
  }

  const summary = payload.autoSave
    ? `Saved ${generated.faqs.length} FAQs (from ${generated.contextSummary.pageCount} CMS pages)`
    : `Generated ${generated.faqs.length} FAQs — review and save`;

  await patchJob({
    status: "completed",
    finishedAt: new Date().toISOString(),
    summary,
    progress: { current: 2, total: 2, label: null },
    succeeded: generated.faqs.length,
    failed: 0,
    result: { faqs: generated.faqs },
  });
}

async function runProductOptimizeJob(payload: { productId: string; customPrompt?: string }) {
  const { productId, customPrompt } = payload;
  await patchJob({
    progress: { current: 0, total: 3, label: "Loading product details..." }
  });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true }
  });
  if (!product) throw new Error("Product not found");

  await patchJob({
    progress: { current: 1, total: 3, label: "Optimizing product content with AI..." }
  });

  const optimized = await aiService.optimizeProductContent({
    product,
    customPrompt
  });

  await patchJob({
    progress: { current: 2, total: 3, label: "Saving optimized content to database..." }
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      description: optimized.description || product.description,
      descriptionNl: optimized.descriptionNl || product.descriptionNl,
      descriptionEn: optimized.descriptionEn || product.descriptionEn,
      specifications: optimized.specifications || product.specifications,
      seoTitle: optimized.seoTitle || product.seoTitle,
      seoDesc: optimized.seoDescription || product.seoDesc,
    }
  });

  await patchJob({
    status: "completed",
    finishedAt: new Date().toISOString(),
    summary: `Successfully optimized content for product "${product.name}"`,
    progress: { current: 3, total: 3, label: null }
  });
}

async function processJob(type: SeoJobType, payload: Record<string, unknown>) {
  if (processing) return;
  processing = true;
  try {
    await patchJob({
      status: "running",
      startedAt: new Date().toISOString(),
      error: null,
      succeeded: 0,
      failed: 0,
      result: null,
    });

    if (type === "bulk_optimize") {
      await runBulkOptimizeJob(payload as Parameters<typeof runBulkOptimizeJob>[0]);
    } else if (type === "blog_generate") {
      await runBlogGenerateJob(payload as Parameters<typeof runBlogGenerateJob>[0]);
    } else if (type === "faq_generate") {
      await runFaqGenerateJob(payload as Parameters<typeof runFaqGenerateJob>[0]);
    } else if (type === "product_optimize") {
      await runProductOptimizeJob(payload as { productId: string; customPrompt?: string });
    } else {
      await runAutopilotJob(payload.force !== false);
    }
  } catch (err: any) {
    await patchJob({
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: err?.message || "Job failed",
    });
  } finally {
    processing = false;
  }
}

export async function enqueueBulkOptimize(payload: {
  entityType?: SeoEntityType;
  onlyIssues?: boolean;
  limit?: number;
  items?: Array<{ entityType: SeoEntityType; entityId: string }>;
  customPrompt?: string;
}): Promise<{ job: SeoJobState; alreadyRunning: boolean }> {
  const current = await loadJobState();
  if (current.status === "running" || current.status === "queued") {
    return { job: current, alreadyRunning: true };
  }

  const job: SeoJobState = {
    ...DEFAULT_JOB,
    id: newJobId(),
    type: "bulk_optimize",
    status: "queued",
    startedAt: new Date().toISOString(),
    progress: { current: 0, total: 0, label: "Preparing…" },
  };
  await saveJobState(job);

  setImmediate(() => {
    processJob("bulk_optimize", payload).catch(console.error);
  });

  return { job, alreadyRunning: false };
}

export async function enqueueAutopilotRun(force = true): Promise<{ job: SeoJobState; alreadyRunning: boolean }> {
  const current = await loadJobState();
  if (current.status === "running" || current.status === "queued") {
    return { job: current, alreadyRunning: true };
  }

  const job: SeoJobState = {
    ...DEFAULT_JOB,
    id: newJobId(),
    type: "autopilot",
    status: "queued",
    startedAt: new Date().toISOString(),
    progress: { current: 0, total: 3, label: "Starting autopilot…" },
  };
  await saveJobState(job);

  setImmediate(() => {
    processJob("autopilot", { force }).catch(console.error);
  });

  return { job, alreadyRunning: false };
}

export async function enqueueBlogGenerate(payload: {
  topic?: string;
  targetKeywords?: string;
  publish?: boolean;
  suggestionId?: string;
}): Promise<{ job: SeoJobState; alreadyRunning: boolean }> {
  const current = await loadJobState();
  if (current.status === "running" || current.status === "queued") {
    return { job: current, alreadyRunning: true };
  }

  const job: SeoJobState = {
    ...DEFAULT_JOB,
    id: newJobId(),
    type: "blog_generate",
    status: "queued",
    startedAt: new Date().toISOString(),
    progress: { current: 0, total: 3, label: "Queued…" },
    publishIntent: payload.publish === true,
  };
  await saveJobState(job);

  setImmediate(() => {
    processJob("blog_generate", payload as Record<string, unknown>).catch(console.error);
  });

  return { job, alreadyRunning: false };
}

export async function enqueueFaqGenerate(payload: {
  focus?: string;
  mergeWithExisting?: boolean;
  existingFaqs?: Array<{ q: string; a: string; published?: boolean }>;
  limit?: number;
  autoSave?: boolean;
}): Promise<{ job: SeoJobState; alreadyRunning: boolean }> {
  const current = await loadJobState();
  if (current.status === "running" || current.status === "queued") {
    return { job: current, alreadyRunning: true };
  }

  const job: SeoJobState = {
    ...DEFAULT_JOB,
    id: newJobId(),
    type: "faq_generate",
    status: "queued",
    startedAt: new Date().toISOString(),
    progress: { current: 0, total: 2, label: "Queued…" },
    publishIntent: payload.autoSave === true,
  };
  await saveJobState(job);

  setImmediate(() => {
    processJob("faq_generate", payload as Record<string, unknown>).catch(console.error);
  });

  return { job, alreadyRunning: false };
}

export async function enqueueProductOptimize(payload: {
  productId: string;
  customPrompt?: string;
}): Promise<{ job: SeoJobState; alreadyRunning: boolean }> {
  const current = await loadJobState();
  if (current.status === "running" || current.status === "queued") {
    return { job: current, alreadyRunning: true };
  }

  const job: SeoJobState = {
    ...DEFAULT_JOB,
    id: newJobId(),
    type: "product_optimize",
    status: "queued",
    startedAt: new Date().toISOString(),
    progress: { current: 0, total: 3, label: "Queued…" },
    targetEntityId: payload.productId,
  };
  await saveJobState(job);

  setImmediate(() => {
    processJob("product_optimize", payload as Record<string, unknown>).catch(console.error);
  });

  return { job, alreadyRunning: false };
}

export async function clearSeoJobIfDone(): Promise<SeoJobState> {
  const state = await loadJobState();
  if (state.status === "completed" || state.status === "failed") {
    await saveJobState(DEFAULT_JOB);
    return DEFAULT_JOB;
  }
  return state;
}
