import { prisma } from "../config/db";
import { getSeoPlaybook } from "./seoPlaybookService";

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\[[^\]]+\]/g, " ").replace(/\s+/g, " ").trim();

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export interface CmsContextSummary {
  pageCount: number;
  categoryCount: number;
  productCount: number;
  blogCount: number;
  existingFaqCount: number;
  couponCount: number;
}

export interface CmsContextPayload {
  summary: CmsContextSummary;
  contextBlock: string;
}

export async function loadCmsContextForAi(): Promise<CmsContextPayload> {
  const [
    pages,
    categories,
    productCount,
    blogs,
    faqRow,
    homepageRow,
    headerFooterRow,
    featuresRow,
    coupons,
    playbook,
  ] = await Promise.all([
    prisma.cmsPage.findMany({
      where: { published: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { title: true, slug: true, body: true, published: true, seoTitle: true, seoDesc: true, seoKeywords: true },
    }),
    prisma.category.findMany({
      take: 20,
      select: { name: true, slug: true, seoTitle: true, seoDescription: true },
    }),
    prisma.product.count(),
    prisma.blog.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { title: true, slug: true, excerpt: true, seoTitle: true },
    }),
    prisma.cmsConfig.findUnique({ where: { key: "faq_data" } }),
    prisma.cmsConfig.findUnique({ where: { key: "homepage_data" } }),
    prisma.cmsConfig.findUnique({ where: { key: "header_footer_data" } }),
    prisma.cmsConfig.findUnique({ where: { key: "store_features" } }),
    prisma.coupon.findMany({
      where: { isActive: true },
      take: 5,
      select: { code: true, discountType: true, value: true },
    }),
    getSeoPlaybook(),
  ]);

  const existingFaqs = Array.isArray(faqRow?.value) ? (faqRow!.value as Array<{ q?: string; a?: string }>) : [];

  const lines: string[] = [
    `=== STORE: ${playbook.siteName} ===`,
    `Target SEO keywords: ${playbook.targetRankKeywords || playbook.globalKeywords || "lighting, lamps, Netherlands"}`,
    "",
    "=== STATIC STOREFRONT ROUTES ===",
    "- / (homepage)",
    "- /categories (all categories)",
    "- /category/deals (promotions)",
    "- /category/bestsellers",
    "- /brands",
    "- /blogs (blog index)",
    "- /faqs (shipping, returns, warranty)",
    "- /relief (category hub)",
    "",
    "=== DYNAMIC CMS PAGES (live — use /{slug} URLs in llms.txt) ===",
  ];

  for (const p of pages) {
    const bodyText = truncate(stripHtml(p.body || ""), 500);
    lines.push(
      `- "${p.title}" → /${p.slug}`,
      `  SEO: ${p.seoTitle || p.title} | ${truncate(p.seoDesc || "", 140)}`,
      p.seoKeywords ? `  Keywords: ${truncate(p.seoKeywords, 100)}` : "",
      bodyText ? `  Summary: ${bodyText}` : "",
    );
  }

  lines.push("", "=== CATEGORIES ===");
  for (const c of categories) {
    lines.push(`- ${c.name} (/category/${c.slug})${c.seoTitle ? ` — ${c.seoTitle}` : ""}`);
  }

  lines.push("", "=== RECENT BLOG POSTS ===");
  for (const b of blogs) {
    lines.push(`- "${b.title}" (/blogs/${b.slug})${b.excerpt ? `: ${truncate(b.excerpt, 100)}` : ""}`);
  }

  if (coupons.length) {
    lines.push("", "=== ACTIVE OFFERS ===");
    for (const c of coupons) {
      const disc = c.discountType === "percentage" ? `${c.value}% off` : `€${c.value} off`;
      lines.push(`- Code ${c.code}: ${disc}`);
    }
  }

  if (existingFaqs.length) {
    lines.push("", "=== EXISTING FAQs (do not duplicate) ===");
    for (const f of existingFaqs.slice(0, 15)) {
      if (f.q) lines.push(`- Q: ${f.q}`);
    }
  }

  const homepage = homepageRow?.value as Record<string, unknown> | undefined;
  if (homepage && typeof homepage === "object") {
    const heroTitle = String(homepage.heroTitle || homepage.title || "").trim();
    if (heroTitle) lines.push("", "=== HOMEPAGE ===", `- Hero: ${heroTitle}`);
  }

  const hf = headerFooterRow?.value as Record<string, unknown> | undefined;
  if (hf?.footerText) {
    lines.push(`- Footer: ${truncate(stripHtml(String(hf.footerText)), 200)}`);
  }

  const features = featuresRow?.value;
  if (Array.isArray(features) && features.length) {
    lines.push("", "=== STORE FEATURES ===");
    for (const feat of features.slice(0, 6)) {
      const f = feat as { title?: string; description?: string };
      if (f.title) lines.push(`- ${f.title}: ${truncate(String(f.description || ""), 80)}`);
    }
  }

  lines.push("", `=== STATS: ${productCount} products ===`);

  return {
    summary: {
      pageCount: pages.length,
      categoryCount: categories.length,
      productCount,
      blogCount: blogs.length,
      existingFaqCount: existingFaqs.length,
      couponCount: coupons.length,
    },
    contextBlock: lines.filter(Boolean).join("\n"),
  };
}
