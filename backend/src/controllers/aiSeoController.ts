import { Request, Response, NextFunction } from "express";
import { aiService } from "../services/aiService";
import {
  loadSeoEntityContext,
  runSeoAudit,
  saveSeoFields,
  SeoEntityType,
} from "../services/seoAuditService";
import { getSeoPlaybook, saveSeoPlaybook, resolvePageSeoFields } from "../services/seoPlaybookService";
import {
  getSeoAutopilotConfig,
  saveSeoAutopilotConfig,
} from "../services/seoAutopilotService";
import {
  clearSeoJobIfDone,
  enqueueAutopilotRun,
  enqueueBlogGenerate,
  enqueueBulkOptimize,
  enqueueFaqGenerate,
  getSeoJobStatus,
} from "../services/seoJobQueueService";
import { getBlogTopicSuggestions } from "../services/blogContextService";
import { loadCmsContextForAi } from "../services/cmsContextService";
import { getInternalLinkSuggestions, applyInternalLinkSuggestion } from "../services/internalLinkService";
import { saveRobotsTxtContent, saveLlmsTxtContent, getSeoCanonicalBaseUrl } from "../services/settingsStore";
import {
  getRankHistory,
  summarizeRankTrend,
  syncRankTracking,
} from "../services/rankTrackingService";
import {
  fetchSearchConsoleOverview,
  getSearchConsoleStatus,
} from "../services/searchConsoleService";
import { getGoogleIntegrationStatus } from "../utils/googleCredentials";

const VALID_TYPES: SeoEntityType[] = ["product", "category", "blog", "cms_page", "homepage"];

export const getSeoPlaybookHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const playbook = await getSeoPlaybook();
    res.json({ success: true, playbook });
  } catch (error) {
    next(error);
  }
};

export const updateSeoPlaybookHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const playbook = await saveSeoPlaybook(req.body || {});
    res.json({ success: true, playbook, message: "Global SEO playbook saved — reflects on all pages instantly." });
  } catch (error) {
    next(error);
  }
};

/** Re-apply playbook template + keywords to all pages without AI (instant sync). */
export const syncPlaybookToAllPages = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const playbook = await getSeoPlaybook();
    const audit = await runSeoAudit({ onlyIssues: false });
    let updated = 0;

    for (const item of audit.items) {
      const resolved = resolvePageSeoFields(
        {
          title: item.label,
          seoTitle: item.seoTitle,
          seoDescription: item.seoDescription,
          seoKeywords: item.seoKeywords,
        },
        playbook,
      );
      if (!resolved.title && !resolved.description && !resolved.keywords) continue;
      await saveSeoFields(item.entityType, item.entityId, {
        seoTitle: resolved.title,
        seoDescription: resolved.description,
        seoKeywords: resolved.keywords,
      });
      updated++;
    }

    res.json({ success: true, updated, total: audit.items.length });
  } catch (error) {
    next(error);
  }
};

export const getSeoAudit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const entityType = req.query.entityType as SeoEntityType | undefined;
    const onlyIssues = req.query.onlyIssues === "true";

    if (entityType && !VALID_TYPES.includes(entityType)) {
      res.status(400).json({ success: false, error: "Invalid entityType" });
      return;
    }

    const result = await runSeoAudit({ entityType, onlyIssues });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const optimizeSeoEntity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { entityType, entityId, save = true, customPrompt } = req.body as {
      entityType: SeoEntityType;
      entityId: string;
      save?: boolean;
      customPrompt?: string;
    };

    if (!entityType || !entityId || !VALID_TYPES.includes(entityType)) {
      res.status(400).json({ success: false, error: "entityType and entityId are required" });
      return;
    }

    const ctx = await loadSeoEntityContext(entityType, entityId);
    const optimized = await aiService.optimizeSeoEntity({
      entityType,
      label: ctx.label,
      url: ctx.url,
      content: ctx.content,
      existingSeo: ctx.existingSeo,
      customPrompt,
    });

    if (save) {
      await saveSeoFields(entityType, entityId, {
        seoTitle: optimized.seoTitle,
        seoDescription: optimized.seoDescription,
        seoKeywords: optimized.seoKeywords,
      });
    }

    res.json({ success: true, ...optimized, saved: !!save });
  } catch (error) {
    next(error);
  }
};

export const bulkOptimizeSeo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { items, entityType, onlyIssues = true, limit = 10, customPrompt } = req.body as {
      items?: Array<{ entityType: SeoEntityType; entityId: string }>;
      entityType?: SeoEntityType;
      onlyIssues?: boolean;
      limit?: number;
      customPrompt?: string;
    };

    const { job, alreadyRunning } = await enqueueBulkOptimize({
      items,
      entityType,
      onlyIssues,
      limit,
      customPrompt,
    });

    res.json({
      success: true,
      job,
      alreadyRunning,
      message: alreadyRunning
        ? "A SEO job is already running — progress continues in the background."
        : "Bulk SEO optimization queued — safe to refresh the page.",
    });
  } catch (error) {
    next(error);
  }
};

export const getAutopilotConfig = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = await getSeoAutopilotConfig();
    res.json({ success: true, config });
  } catch (error) {
    next(error);
  }
};

export const updateAutopilotConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = await saveSeoAutopilotConfig(req.body || {});
    res.json({ success: true, config });
  } catch (error) {
    next(error);
  }
};

export const runAutopilotNow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const force = req.body?.force !== false;
    const { job, alreadyRunning } = await enqueueAutopilotRun(force);
    res.json({
      success: true,
      job,
      alreadyRunning,
      summary: alreadyRunning ? job.summary : "Autopilot queued — safe to refresh the page.",
    });
  } catch (error) {
    next(error);
  }
};

export const getSeoJobStatusHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const job = await getSeoJobStatus();
    res.json({ success: true, job });
  } catch (error) {
    next(error);
  }
};

export const dismissSeoJobHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const job = await clearSeoJobIfDone();
    res.json({ success: true, job });
  } catch (error) {
    next(error);
  }
};

export const getBlogTopicSuggestionsHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const suggestions = await getBlogTopicSuggestions();
    res.json({ success: true, suggestions });
  } catch (error) {
    next(error);
  }
};

export const getCmsContextSummaryHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { summary } = await loadCmsContextForAi();
    res.json({ success: true, summary });
  } catch (error) {
    next(error);
  }
};

export const generateFaqsWithAi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { focus, mergeWithExisting = true, existingFaqs, limit = 12, autoSave = false } = req.body as {
      focus?: string;
      mergeWithExisting?: boolean;
      existingFaqs?: Array<{ q: string; a: string; published?: boolean }>;
      limit?: number;
      autoSave?: boolean;
    };

    const { job, alreadyRunning } = await enqueueFaqGenerate({
      focus,
      mergeWithExisting,
      existingFaqs,
      limit,
      autoSave,
    });

    res.json({
      success: true,
      job,
      alreadyRunning,
      message: alreadyRunning
        ? "A job is already running — progress continues in the background."
        : autoSave
          ? "FAQ generation queued — will save when ready. Safe to refresh."
          : "FAQ draft queued — review before saving.",
    });
  } catch (error) {
    next(error);
  }
};

export const generateBlogWithAi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { topic, targetKeywords, publish = false, suggestionId } = req.body as {
      topic?: string;
      targetKeywords?: string;
      publish?: boolean;
      suggestionId?: string;
    };

    const { job, alreadyRunning } = await enqueueBlogGenerate({
      topic,
      targetKeywords,
      publish,
      suggestionId,
    });

    res.json({
      success: true,
      job,
      alreadyRunning,
      message: alreadyRunning
        ? "A job is already running — progress continues in the background."
        : publish
          ? "Blog generation queued — will publish when ready. Safe to refresh."
          : "Blog draft queued — safe to refresh the page.",
    });
  } catch (error) {
    next(error);
  }
};

export const getSearchConsoleStatusHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = await getSearchConsoleStatus();
    const integration = getGoogleIntegrationStatus();
    res.json({ success: true, ...status, integration });
  } catch (error) {
    next(error);
  }
};

export const getSearchConsoleOverviewHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(String(req.query.days || "28"), 10) || 28));
    const overview = await fetchSearchConsoleOverview(days);
    res.json({ success: true, overview });
  } catch (error) {
    next(error);
  }
};

export const getRankTrackingHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const history = await getRankHistory();
    const keywords = [...new Set(history.snapshots.map((s) => s.keyword))];
    const trends = keywords.map((keyword) => summarizeRankTrend(history.snapshots, keyword));
    res.json({ success: true, history, trends });
  } catch (error) {
    next(error);
  }
};

export const syncRankTrackingHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await syncRankTracking();
    const trends = result.keywords.map((keyword) =>
      summarizeRankTrend(result.history.snapshots, keyword),
    );
    res.json({ success: true, ...result, trends });
  } catch (error) {
    next(error);
  }
};

export const getInternalLinkSuggestionsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = Math.min(50, Math.max(5, parseInt(String(req.query.limit || "25"), 10) || 25));
    const suggestions = await getInternalLinkSuggestions(limit);
    res.json({ success: true, suggestions });
  } catch (error) {
    next(error);
  }
};

export const applyInternalLinkSuggestionHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sourceType, sourceId, targetUrl, anchorHint } = req.body || {};
    if (!sourceType || !sourceId || !targetUrl) {
      res.status(400).json({ success: false, error: "sourceType, sourceId, and targetUrl are required." });
      return;
    }
    const result = await applyInternalLinkSuggestion({
      sourceType: String(sourceType),
      sourceId: String(sourceId),
      targetUrl: String(targetUrl),
      anchorHint: String(anchorHint || ""),
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const generateRobotsTxtHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { existingContent, canonicalUrl, save } = req.body || {};
    const robots = await aiService.generateRobotsTxt({
      existingContent: typeof existingContent === "string" ? existingContent : undefined,
      canonicalUrl: typeof canonicalUrl === "string" ? canonicalUrl : getSeoCanonicalBaseUrl(),
    });
    if (save === true) {
      await saveRobotsTxtContent(robots);
    }
    res.json({ success: true, robots, saved: save === true });
  } catch (error) {
    next(error);
  }
};

export const generateLlmsTxtHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { existingContent, canonicalUrl, save } = req.body || {};
    const llms = await aiService.generateLlmsTxt({
      existingContent: typeof existingContent === "string" ? existingContent : undefined,
      canonicalUrl: typeof canonicalUrl === "string" ? canonicalUrl : getSeoCanonicalBaseUrl(),
    });
    if (save === true) {
      await saveLlmsTxtContent(llms);
    }
    res.json({ success: true, llms, saved: save === true });
  } catch (error) {
    next(error);
  }
};
