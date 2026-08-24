import { prisma } from "../config/db";

export type SeoEntityType = "product" | "category" | "blog" | "cms_page" | "homepage";

export type SeoIssueCode =
  | "missing_title"
  | "missing_description"
  | "missing_keywords"
  | "title_too_long"
  | "description_too_long"
  | "description_too_short";

export interface SeoAuditItem {
  entityType: SeoEntityType;
  entityId: string;
  label: string;
  url: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  score: number;
  issues: SeoIssueCode[];
  published: boolean;
}

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function scoreSeoFields(fields: {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
}): { score: number; issues: SeoIssueCode[] } {
  const title = (fields.title || "").trim();
  const description = (fields.description || "").trim();
  const keywords = (fields.keywords || "").trim();
  const issues: SeoIssueCode[] = [];
  let score = 100;

  if (!title) {
    issues.push("missing_title");
    score -= 30;
  } else if (title.length > 60) {
    issues.push("title_too_long");
    score -= 10;
  }

  if (!description) {
    issues.push("missing_description");
    score -= 30;
  } else {
    if (description.length > 160) {
      issues.push("description_too_long");
      score -= 10;
    }
    if (description.length < 50) {
      issues.push("description_too_short");
      score -= 5;
    }
  }

  if (!keywords) {
    issues.push("missing_keywords");
    score -= 20;
  }

  return { score: Math.max(0, score), issues };
}

function auditRow(
  entityType: SeoEntityType,
  entityId: string,
  label: string,
  url: string,
  seoTitle: string | null | undefined,
  seoDescription: string | null | undefined,
  seoKeywords: string | null | undefined,
  published = true,
): SeoAuditItem {
  const { score, issues } = scoreSeoFields({
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords,
  });
  return {
    entityType,
    entityId,
    label,
    url,
    seoTitle: seoTitle || null,
    seoDescription: seoDescription || null,
    seoKeywords: seoKeywords || null,
    score,
    issues,
    published,
  };
}

export async function runSeoAudit(filters?: {
  entityType?: SeoEntityType;
  onlyIssues?: boolean;
}): Promise<{ summary: Record<string, number>; items: SeoAuditItem[] }> {
  const items: SeoAuditItem[] = [];
  const type = filters?.entityType;

  if (!type || type === "product") {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        seoTitle: true,
        seoDescription: true,
        seoKeywords: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    for (const p of products) {
      items.push(
        auditRow(
          "product",
          p.id,
          p.name,
          `/product/${p.slug}`,
          p.seoTitle,
          p.seoDescription,
          p.seoKeywords,
        ),
      );
    }
  }

  if (!type || type === "category") {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        seoKeywords: true,
      },
      orderBy: { name: "asc" },
    });
    for (const c of categories) {
      items.push(
        auditRow(
          "category",
          c.id,
          c.name,
          `/category/${c.slug}`,
          c.seoTitle,
          c.seoDescription,
          c.seoKeywords,
        ),
      );
    }
  }

  if (!type || type === "blog") {
    const blogs = await prisma.blog.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        seoTitle: true,
        seoDescription: true,
        seoKeywords: true,
        published: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    for (const b of blogs) {
      items.push(
        auditRow(
          "blog",
          b.id,
          b.title,
          `/blogs/${b.slug}`,
          b.seoTitle || b.title,
          b.seoDescription || b.excerpt,
          b.seoKeywords,
          b.published,
        ),
      );
    }
  }

  if (!type || type === "cms_page") {
    const pages = await prisma.cmsPage.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        seoTitle: true,
        seoDesc: true,
        seoKeywords: true,
        published: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    for (const p of pages) {
      items.push(
        auditRow(
          "cms_page",
          p.id,
          p.title,
          `/${p.slug}`,
          p.seoTitle,
          p.seoDesc,
          p.seoKeywords,
          p.published,
        ),
      );
    }
  }

  if (!type || type === "homepage") {
    const cfg = await prisma.cmsConfig.findUnique({ where: { key: "homepage_data" } });
    const data = (cfg?.value || {}) as Record<string, string>;
    items.push(
      auditRow(
        "homepage",
        "homepage",
        "Homepage",
        "/",
        data.seoTitle,
        data.seoDesc,
        data.seoKeywords,
      ),
    );
  }

  const filtered = filters?.onlyIssues ? items.filter((i) => i.issues.length > 0) : items;
  filtered.sort((a, b) => a.score - b.score);

  const summary = {
    total: filtered.length,
    excellent: filtered.filter((i) => i.score >= 90).length,
    good: filtered.filter((i) => i.score >= 70 && i.score < 90).length,
    needsWork: filtered.filter((i) => i.score >= 40 && i.score < 70).length,
    critical: filtered.filter((i) => i.score < 40).length,
  };

  return { summary, items: filtered };
}

export async function loadSeoEntityContext(
  entityType: SeoEntityType,
  entityId: string,
): Promise<{ label: string; url: string; content: string; existingSeo: Record<string, string | null> }> {
  switch (entityType) {
    case "product": {
      const p = await prisma.product.findUnique({
        where: { id: entityId },
        include: { category: true, brand: true },
      });
      if (!p) throw new Error("Product not found");
      return {
        label: p.name,
        url: `/product/${p.slug}`,
        content: [p.name, p.shortDescription, stripHtml(p.description)].filter(Boolean).join("\n\n"),
        existingSeo: {
          seoTitle: p.seoTitle,
          seoDescription: p.seoDescription,
          seoKeywords: p.seoKeywords,
        },
      };
    }
    case "category": {
      const c = await prisma.category.findUnique({ where: { id: entityId } });
      if (!c) throw new Error("Category not found");
      const count = await prisma.product.count({ where: { categoryId: c.id } });
      return {
        label: c.name,
        url: `/category/${c.slug}`,
        content: `Category: ${c.name}. Group: ${c.group}. ${count} products.`,
        existingSeo: {
          seoTitle: c.seoTitle,
          seoDescription: c.seoDescription,
          seoKeywords: c.seoKeywords,
        },
      };
    }
    case "blog": {
      const b = await prisma.blog.findUnique({ where: { id: entityId } });
      if (!b) throw new Error("Blog not found");
      return {
        label: b.title,
        url: `/blogs/${b.slug}`,
        content: [b.title, b.excerpt, stripHtml(b.body)].filter(Boolean).join("\n\n").slice(0, 4000),
        existingSeo: {
          seoTitle: b.seoTitle,
          seoDescription: b.seoDescription,
          seoKeywords: b.seoKeywords,
        },
      };
    }
    case "cms_page": {
      const p = await prisma.cmsPage.findUnique({ where: { id: entityId } });
      if (!p) throw new Error("CMS page not found");
      return {
        label: p.title,
        url: `/${p.slug}`,
        content: [p.title, stripHtml(p.body)].filter(Boolean).join("\n\n").slice(0, 4000),
        existingSeo: {
          seoTitle: p.seoTitle,
          seoDescription: p.seoDesc,
          seoKeywords: p.seoKeywords,
        },
      };
    }
    case "homepage": {
      const cfg = await prisma.cmsConfig.findUnique({ where: { key: "homepage_data" } });
      const data = (cfg?.value || {}) as Record<string, string>;
      return {
        label: "Homepage",
        url: "/",
        content: stripHtml(data.content || "").slice(0, 4000),
        existingSeo: {
          seoTitle: data.seoTitle || null,
          seoDescription: data.seoDesc || null,
          seoKeywords: data.seoKeywords || null,
        },
      };
    }
    default:
      throw new Error("Unsupported entity type");
  }
}

export async function saveSeoFields(
  entityType: SeoEntityType,
  entityId: string,
  seo: { seoTitle: string; seoDescription: string; seoKeywords: string },
): Promise<void> {
  switch (entityType) {
    case "product":
      await prisma.product.update({
        where: { id: entityId },
        data: {
          seoTitle: seo.seoTitle,
          seoDescription: seo.seoDescription,
          seoKeywords: seo.seoKeywords,
        },
      });
      return;
    case "category":
      await prisma.category.update({
        where: { id: entityId },
        data: {
          seoTitle: seo.seoTitle,
          seoDescription: seo.seoDescription,
          seoKeywords: seo.seoKeywords,
        },
      });
      return;
    case "blog":
      await prisma.blog.update({
        where: { id: entityId },
        data: {
          seoTitle: seo.seoTitle,
          seoDescription: seo.seoDescription,
          seoKeywords: seo.seoKeywords,
        },
      });
      return;
    case "cms_page":
      await prisma.cmsPage.update({
        where: { id: entityId },
        data: {
          seoTitle: seo.seoTitle,
          seoDesc: seo.seoDescription,
          seoKeywords: seo.seoKeywords,
        },
      });
      return;
    case "homepage": {
      const cfg = await prisma.cmsConfig.findUnique({ where: { key: "homepage_data" } });
      const data = { ...((cfg?.value || {}) as Record<string, unknown>) };
      data.seoTitle = seo.seoTitle;
      data.seoDesc = seo.seoDescription;
      data.seoKeywords = seo.seoKeywords;
      await prisma.cmsConfig.upsert({
        where: { key: "homepage_data" },
        create: { key: "homepage_data", value: data as any },
        update: { value: data as any },
      });
      return;
    }
    default:
      throw new Error("Unsupported entity type");
  }
}
