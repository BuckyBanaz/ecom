import { prisma } from "../config/db";
import { aiService } from "./aiService";
import { getSeoPlaybook } from "./seoPlaybookService";
import { loadSeoEntityContext, runSeoAudit, saveSeoFields } from "./seoAuditService";

export const SEO_AUTOPILOT_KEY = "seo_autopilot";

export interface SeoAutopilotConfig {
  enabled: boolean;
  weeklyBlogEnabled: boolean;
  weeklyBlogDay: number;
  autoSeoOptimizeEnabled: boolean;
  autoSeoOptimizeLimit: number;
  generateBacklinkSuggestions: boolean;
  lastRunAt: string | null;
  lastRunSummary: string | null;
  lastBacklinkSuggestions: string[];
}

const DEFAULT_AUTOPILOT: SeoAutopilotConfig = {
  enabled: false,
  weeklyBlogEnabled: true,
  weeklyBlogDay: 1,
  autoSeoOptimizeEnabled: true,
  autoSeoOptimizeLimit: 15,
  generateBacklinkSuggestions: true,
  lastRunAt: null,
  lastRunSummary: null,
  lastBacklinkSuggestions: [],
};

export async function getSeoAutopilotConfig(): Promise<SeoAutopilotConfig> {
  const row = await prisma.cmsConfig.findUnique({ where: { key: SEO_AUTOPILOT_KEY } });
  return { ...DEFAULT_AUTOPILOT, ...((row?.value || {}) as Partial<SeoAutopilotConfig>) };
}

export async function saveSeoAutopilotConfig(config: Partial<SeoAutopilotConfig>): Promise<SeoAutopilotConfig> {
  const merged = { ...(await getSeoAutopilotConfig()), ...config };
  await prisma.cmsConfig.upsert({
    where: { key: SEO_AUTOPILOT_KEY },
    create: { key: SEO_AUTOPILOT_KEY, value: merged as any },
    update: { value: merged as any },
  });
  return merged;
}

function shouldRunWeeklyBlog(cfg: SeoAutopilotConfig, force: boolean): boolean {
  if (!cfg.weeklyBlogEnabled) return false;
  if (force) return true;
  if (!cfg.enabled) return false;
  const today = new Date().getDay();
  if (today !== cfg.weeklyBlogDay) return false;
  if (!cfg.lastRunAt) return true;
  const last = new Date(cfg.lastRunAt);
  const daysSince = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= 6;
}

export async function runSeoAutopilot(options?: { force?: boolean }) {
  const force = options?.force === true;
  const cfg = await getSeoAutopilotConfig();
  const playbook = await getSeoPlaybook();
  const log: string[] = [];
  let blogCreated = false;
  let seoOptimized = 0;
  let backlinkSuggestions: string[] = [];

  if (shouldRunWeeklyBlog(cfg, force)) {
    try {
      const generated = await aiService.generateBlog({
        targetKeywords: playbook.targetRankKeywords || playbook.globalKeywords,
      });
      await prisma.blog.create({
        data: {
          title: generated.title,
          slug: generated.slug,
          excerpt: generated.excerpt,
          body: generated.body,
          author: generated.author || "Schip & Ster",
          published: true,
          seoTitle: generated.seoTitle,
          seoDescription: generated.seoDescription,
          seoKeywords: generated.seoKeywords,
          cover: generated.cover || null,
        },
      });
      blogCreated = true;
      log.push(`Blog created: "${generated.title}"`);
    } catch (err: any) {
      log.push(`Blog generation failed: ${err.message}`);
    }
  }

  if (cfg.autoSeoOptimizeEnabled && (cfg.enabled || force)) {
    const audit = await runSeoAudit({ onlyIssues: true });
    const targets = audit.items.slice(0, cfg.autoSeoOptimizeLimit);
    for (const item of targets) {
      try {
        const ctx = await loadSeoEntityContext(item.entityType, item.entityId);
        const optimized = await aiService.optimizeSeoEntity({
          entityType: item.entityType,
          label: ctx.label,
          url: ctx.url,
          content: ctx.content,
          existingSeo: ctx.existingSeo,
        });
        await saveSeoFields(item.entityType, item.entityId, {
          seoTitle: optimized.seoTitle,
          seoDescription: optimized.seoDescription,
          seoKeywords: optimized.seoKeywords,
        });
        seoOptimized++;
      } catch {
        /* continue */
      }
    }
    log.push(`SEO optimized ${seoOptimized}/${targets.length} pages`);
  }

  if (cfg.generateBacklinkSuggestions && (cfg.enabled || force)) {
    try {
      backlinkSuggestions = await aiService.generateBacklinkSuggestions(playbook.targetRankKeywords || playbook.globalKeywords);
      log.push(`Generated ${backlinkSuggestions.length} backlink outreach ideas`);
    } catch (err: any) {
      log.push(`Backlink suggestions failed: ${err.message}`);
    }
  }

  const summary = log.join(" · ") || "Nothing to run — enable autopilot tasks first.";
  await saveSeoAutopilotConfig({
    lastRunAt: new Date().toISOString(),
    lastRunSummary: summary,
    lastBacklinkSuggestions: backlinkSuggestions,
  });

  return { blogCreated, seoOptimized, backlinkSuggestions, summary, log };
}
