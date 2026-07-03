import { prisma } from "../config/db";
import { getSeoPlaybook } from "./seoPlaybookService";
import { fetchSearchConsoleOverview } from "./searchConsoleService";

export type InternalLinkSuggestion = {
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
  sourceUrl: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  targetUrl: string;
  anchorHint: string;
  reason: string;
  score: number;
};

type LinkablePage = {
  type: string;
  id: string;
  label: string;
  url: string;
  text: string;
};

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[\s,.|/\-–—]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 2),
  );
}

function overlapScore(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  let score = 0;
  for (const token of ta) {
    if (tb.has(token)) score += 1;
  }
  return score;
}

async function loadLinkablePages(): Promise<LinkablePage[]> {
  const [products, categories, blogs, cmsPages] = await Promise.all([
    prisma.product.findMany({
      select: { id: true, name: true, slug: true, seoKeywords: true, shortDescription: true },
      take: 200,
    }),
    prisma.category.findMany({
      select: { id: true, name: true, slug: true, seoKeywords: true },
      take: 100,
    }),
    prisma.blog.findMany({
      where: { published: true },
      select: { id: true, title: true, slug: true, seoKeywords: true, excerpt: true },
      take: 100,
    }),
    prisma.cmsPage.findMany({
      where: { published: true },
      select: { id: true, title: true, slug: true, seoKeywords: true },
      take: 50,
    }),
  ]);

  const pages: LinkablePage[] = [
    ...products.map((p) => ({
      type: "product",
      id: p.id,
      label: p.name,
      url: `/product/${p.slug}`,
      text: `${p.name} ${p.seoKeywords || ""} ${p.shortDescription || ""}`,
    })),
    ...categories.map((c) => ({
      type: "category",
      id: c.id,
      label: c.name,
      url: `/category/${c.slug}`,
      text: `${c.name} ${c.seoKeywords || ""}`,
    })),
    ...blogs.map((b) => ({
      type: "blog",
      id: b.id,
      label: b.title,
      url: `/blogs/${b.slug}`,
      text: `${b.title} ${b.seoKeywords || ""} ${b.excerpt || ""}`,
    })),
    ...cmsPages.map((p) => ({
      type: "cms_page",
      id: p.id,
      label: p.title,
      url: `/${p.slug}`,
      text: `${p.title} ${p.seoKeywords || ""}`,
    })),
  ];

  return pages;
}

export async function getInternalLinkSuggestions(limit = 25): Promise<InternalLinkSuggestion[]> {
  const playbook = await getSeoPlaybook();
  const priorityTerms = `${playbook.targetRankKeywords},${playbook.globalKeywords}`;
  const pages = await loadLinkablePages();

  let gscQueries: string[] = [];
  try {
    const overview = await fetchSearchConsoleOverview(28);
    gscQueries = overview.topQueries.slice(0, 10).map((q) => q.query);
  } catch {
    // GSC optional — suggestions still work from playbook keywords
  }

  const suggestions: InternalLinkSuggestion[] = [];

  for (const source of pages) {
    const candidates: InternalLinkSuggestion[] = [];

    for (const target of pages) {
      if (source.id === target.id && source.type === target.type) continue;

      let score = overlapScore(source.text, target.text);
      score += overlapScore(priorityTerms, target.text) * 2;
      score += gscQueries.reduce((sum, q) => sum + overlapScore(q, target.text), 0);

      if (score < 2) continue;

      candidates.push({
        sourceType: source.type,
        sourceId: source.id,
        sourceLabel: source.label,
        sourceUrl: source.url,
        targetType: target.type,
        targetId: target.id,
        targetLabel: target.label,
        targetUrl: target.url,
        anchorHint: target.label,
        reason:
          gscQueries.some((q) => overlapScore(q, target.text) > 0)
            ? "Matches a Search Console query + related catalog content"
            : "Related keyword overlap with playbook targets",
        score,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    suggestions.push(...candidates.slice(0, 2));
  }

  const deduped = new Map<string, InternalLinkSuggestion>();
  for (const item of suggestions.sort((a, b) => b.score - a.score)) {
    const key = `${item.sourceUrl}->${item.targetUrl}`;
    if (!deduped.has(key)) deduped.set(key, item);
  }

  return [...deduped.values()].slice(0, limit);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildLinkSnippet(targetUrl: string, anchorHint: string): string {
  const href = escapeHtml(targetUrl);
  const label = escapeHtml(anchorHint.trim() || targetUrl);
  return `<p><a href="${href}">${label}</a></p>`;
}

function contentAlreadyLinksTo(html: string | null, targetUrl: string): boolean {
  if (!html) return false;
  const normalized = targetUrl.replace(/\/$/, "");
  return (
    html.includes(`href="${normalized}"`) ||
    html.includes(`href="${normalized}/"`) ||
    html.includes(`href='${normalized}'`) ||
    html.includes(`href='${normalized}/'`)
  );
}

export async function applyInternalLinkSuggestion(input: {
  sourceType: string;
  sourceId: string;
  targetUrl: string;
  anchorHint: string;
}): Promise<{ applied: boolean; field: string; alreadyExists?: boolean }> {
  const { sourceType, sourceId, targetUrl, anchorHint } = input;
  const snippet = buildLinkSnippet(targetUrl, anchorHint);

  if (sourceType === "product") {
    const row = await prisma.product.findUnique({ where: { id: sourceId }, select: { description: true } });
    if (!row) throw new Error("Source product not found");
    if (contentAlreadyLinksTo(row.description, targetUrl)) {
      return { applied: false, field: "description", alreadyExists: true };
    }
    await prisma.product.update({
      where: { id: sourceId },
      data: { description: `${(row.description || "").trim()}\n${snippet}` },
    });
    return { applied: true, field: "description" };
  }

  if (sourceType === "blog") {
    const row = await prisma.blog.findUnique({ where: { id: sourceId }, select: { body: true } });
    if (!row) throw new Error("Source blog not found");
    if (contentAlreadyLinksTo(row.body, targetUrl)) {
      return { applied: false, field: "body", alreadyExists: true };
    }
    await prisma.blog.update({
      where: { id: sourceId },
      data: { body: `${(row.body || "").trim()}\n${snippet}` },
    });
    return { applied: true, field: "body" };
  }

  if (sourceType === "cms_page") {
    const row = await prisma.cmsPage.findUnique({ where: { id: sourceId }, select: { body: true } });
    if (!row) throw new Error("Source CMS page not found");
    if (contentAlreadyLinksTo(row.body, targetUrl)) {
      return { applied: false, field: "body", alreadyExists: true };
    }
    await prisma.cmsPage.update({
      where: { id: sourceId },
      data: { body: `${(row.body || "").trim()}\n${snippet}` },
    });
    return { applied: true, field: "body" };
  }

  throw new Error("This page type has no editable content — pick a product, blog, or CMS page as the source.");
}
