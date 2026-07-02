import { prisma } from "../config/db";
import { saveSettings } from "./settingsStore";

export const SEO_PLAYBOOK_KEY = "ai_seo_playbook";

export interface SeoPlaybook {
  siteName: string;
  titleTemplate: string;
  globalKeywords: string;
  targetRankKeywords: string;
  descriptionCta: string;
  brandVoice: string;
  geoFocus: string;
  mergeGlobalKeywords: boolean;
}

const DEFAULT_PLAYBOOK: SeoPlaybook = {
  siteName: "Schip & Ster",
  titleTemplate: "%s | Schip & Ster",
  globalKeywords: "verlichting, lighting, lampen, LED, Nederland",
  targetRankKeywords: "schip & ster, schipenster, LED verlichting kopen, hanglamp woonkamer, buitenverlichting, smart lighting Nederland",
  descriptionCta: "Ordered before 22:00, delivered next day. 30-day free returns.",
  brandVoice:
    "Premium Dutch lighting store. Friendly, expert tone. Mix NL/EN keywords where natural.",
  geoFocus: "Netherlands & Belgium — Dutch primary, English secondary for expats.",
  mergeGlobalKeywords: true,
};

function fromEnv(): Partial<SeoPlaybook> {
  return {
    siteName: process.env.SEO_SITE_NAME || undefined,
    titleTemplate: process.env.SEO_TITLE_TEMPLATE || undefined,
    globalKeywords: process.env.SEO_DEFAULT_KEYWORDS || undefined,
  };
}

export async function getSeoPlaybook(): Promise<SeoPlaybook> {
  const row = await prisma.cmsConfig.findUnique({ where: { key: SEO_PLAYBOOK_KEY } });
  const stored = (row?.value || {}) as Partial<SeoPlaybook>;
  const env = fromEnv();
  return {
    ...DEFAULT_PLAYBOOK,
    ...env,
    ...stored,
  };
}

export async function saveSeoPlaybook(playbook: Partial<SeoPlaybook>): Promise<SeoPlaybook> {
  const current = await getSeoPlaybook();
  const merged: SeoPlaybook = { ...current, ...playbook };

  await prisma.cmsConfig.upsert({
    where: { key: SEO_PLAYBOOK_KEY },
    create: { key: SEO_PLAYBOOK_KEY, value: merged as any },
    update: { value: merged as any },
  });

  await saveSettings({
    SEO_SITE_NAME: merged.siteName,
    SEO_TITLE_TEMPLATE: merged.titleTemplate,
    SEO_DEFAULT_KEYWORDS: merged.globalKeywords,
  });

  return merged;
}

/** Build AI prompt block from central playbook — used for every page optimization. */
export function buildPlaybookPromptBlock(playbook: SeoPlaybook): string {
  return `
GLOBAL SEO PLAYBOOK (apply to every page — change here reflects site-wide):
NOTE: Admin → Settings → AI Brain "output language" controls the LANGUAGE of generated text. When an OUTPUT LANGUAGE block appears in this prompt, it overrides brand voice / GEO language hints below.
- Site name: ${playbook.siteName}
- Title template: ${playbook.titleTemplate} (%s = page-specific title)
- Global keywords (always include where relevant): ${playbook.globalKeywords}
- Target rank keywords (prioritize in titles, content, meta): ${playbook.targetRankKeywords || playbook.globalKeywords}
- Description CTA suffix: ${playbook.descriptionCta}
- Brand voice: ${playbook.brandVoice}
- GEO focus: ${playbook.geoFocus}
- Merge global keywords into every page: ${playbook.mergeGlobalKeywords ? "yes" : "no"}
`.trim();
}

export function applyTitleTemplate(pageTitle: string, template: string, siteName: string): string {
  const base = (pageTitle || siteName).trim();
  if (!base) return siteName.slice(0, 60);
  if (!template.includes("%s")) return base.slice(0, 60);
  if (base.includes(siteName) && template.includes(siteName)) return base.slice(0, 60);
  return template.replace("%s", base).slice(0, 60);
}

export function mergeGlobalKeywords(pageKeywords: string | null | undefined, globalKeywords: string, merge: boolean): string {
  if (!merge || !globalKeywords.trim()) return (pageKeywords || "").trim();
  const parts = new Set<string>();
  for (const chunk of `${pageKeywords || ""},${globalKeywords}`.split(",")) {
    const k = chunk.trim();
    if (k) parts.add(k);
  }
  return Array.from(parts).join(", ");
}

export function resolvePageSeoFields(
  page: {
    title?: string | null;
    seoTitle?: string | null;
    description?: string | null;
    seoDescription?: string | null;
    keywords?: string | null;
    seoKeywords?: string | null;
  },
  playbook: SeoPlaybook,
): { title: string; description: string; keywords: string } {
  const rawTitle = (page.seoTitle || page.title || playbook.siteName).trim();
  const title = applyTitleTemplate(rawTitle, playbook.titleTemplate, playbook.siteName);

  let description = (page.seoDescription || page.description || "").trim();
  if (description && playbook.descriptionCta && !description.includes(playbook.descriptionCta.slice(0, 20))) {
    const combined = `${description} ${playbook.descriptionCta}`.trim();
    description = combined.length <= 160 ? combined : description.slice(0, 160);
  } else if (!description && playbook.descriptionCta) {
    description = playbook.descriptionCta.slice(0, 160);
  }

  const keywords = mergeGlobalKeywords(
    page.seoKeywords || page.keywords,
    playbook.globalKeywords,
    playbook.mergeGlobalKeywords,
  );

  return { title, description, keywords };
}
