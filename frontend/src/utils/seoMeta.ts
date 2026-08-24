/** Shared SEO constants & helpers for storefront head tags + JSON-LD. */

export const SITE_ORIGIN =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://schipenster.com";

export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;
export const DEFAULT_FAVICON_48 = `${SITE_ORIGIN}/favicon-48x48.png`;

export const STOREFRONT_NAV_LINKS = [
  { name: "Home", path: "/" },
  { name: "Categories", path: "/categories" },
  { name: "Brands", path: "/brands" },
  { name: "Blog", path: "/blogs" },
  { name: "FAQs", path: "/faqs" },
] as const;

export function absoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return SITE_ORIGIN;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  return `${SITE_ORIGIN}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function upsertMeta(attr: "name" | "property", key: string, content: string) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function upsertLink(rel: string, href: string, extra?: Record<string, string>) {
  if (!href) return;
  const selector = extra?.hreflang
    ? `link[rel="${rel}"][hreflang="${extra.hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  if (extra) {
    Object.entries(extra).forEach(([k, v]) => el!.setAttribute(k, v));
  }
}

export function clearHreflangAlternates() {
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
}

/** Build NL/EN alternate URLs using ?lang= query (storefront has no /nl/ paths). */
export function buildHreflangUrl(path: string, lang: "nl" | "en"): string {
  const url = new URL(absoluteUrl(path));
  if (lang === "en") {
    url.searchParams.set("lang", "en");
  } else {
    url.searchParams.delete("lang");
  }
  return url.toString();
}

export function upsertHreflangAlternates(path: string) {
  if (!path) return;
  clearHreflangAlternates();
  const alternates: Array<{ hreflang: string; href: string }> = [
    { hreflang: "nl", href: buildHreflangUrl(path, "nl") },
    { hreflang: "en", href: buildHreflangUrl(path, "en") },
    { hreflang: "x-default", href: buildHreflangUrl(path, "nl") },
  ];
  alternates.forEach(({ hreflang, href }) => {
    upsertLink("alternate", href, { hreflang });
  });
}

export function upsertJsonLd(id: string, data: object) {
  let script = document.getElementById(id);
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.setAttribute("type", "application/ld+json");
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export function removeJsonLd(...ids: string[]) {
  ids.forEach((id) => document.getElementById(id)?.remove());
}

export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Central SEO playbook — loaded once from API, applied on every page. */
export type SeoPlaybookConfig = {
  siteName: string;
  titleTemplate: string;
  globalKeywords: string;
  descriptionCta: string;
  mergeGlobalKeywords: boolean;
};

let cachedPlaybook: SeoPlaybookConfig | null = null;

export function setSeoPlaybookCache(playbook: SeoPlaybookConfig) {
  cachedPlaybook = playbook;
}

export function getSeoPlaybookCache(): SeoPlaybookConfig | null {
  return cachedPlaybook;
}

function applyTitleTemplate(pageTitle: string, template: string, siteName: string): string {
  const base = (pageTitle || siteName).trim();
  if (!base) return siteName.slice(0, 60);
  if (!template.includes("%s")) return base.slice(0, 60);
  if (base.includes(siteName) && template.includes(siteName)) return base.slice(0, 60);
  return template.replace("%s", base).slice(0, 60);
}

function mergeGlobalKeywords(pageKeywords: string | undefined, globalKeywords: string, merge: boolean): string {
  if (!merge || !globalKeywords.trim()) return (pageKeywords || "").trim();
  const parts = new Set<string>();
  for (const chunk of `${pageKeywords || ""},${globalKeywords}`.split(",")) {
    const k = chunk.trim();
    if (k) parts.add(k);
  }
  return Array.from(parts).join(", ");
}

export function resolvePageSeo(
  page: {
    title?: string;
    seoTitle?: string;
    description?: string;
    seoDescription?: string;
    keywords?: string;
    seoKeywords?: string;
  },
  playbook?: SeoPlaybookConfig | null,
): { title: string; description: string; keywords: string } {
  const pb = playbook || cachedPlaybook;
  if (!pb) {
    return {
      title: page.seoTitle || page.title || "",
      description: page.seoDescription || page.description || "",
      keywords: page.seoKeywords || page.keywords || "",
    };
  }

  const rawTitle = (page.seoTitle || page.title || pb.siteName).trim();
  const title = applyTitleTemplate(rawTitle, pb.titleTemplate, pb.siteName);

  let description = (page.seoDescription || page.description || "").trim();
  if (description && pb.descriptionCta && !description.includes(pb.descriptionCta.slice(0, 20))) {
    const combined = `${description} ${pb.descriptionCta}`.trim();
    description = combined.length <= 160 ? combined : description.slice(0, 160);
  } else if (!description && pb.descriptionCta) {
    description = pb.descriptionCta.slice(0, 160);
  }

  const keywords = mergeGlobalKeywords(
    page.seoKeywords || page.keywords,
    pb.globalKeywords,
    pb.mergeGlobalKeywords,
  );

  return { title, description, keywords };
}

/** Per-page meta tags (title, OG, canonical) — uses global playbook when loaded. */
export function applyPageMeta(opts: {
  title?: string;
  seoTitle?: string;
  description?: string;
  seoDescription?: string;
  keywords?: string;
  seoKeywords?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  skipPlaybook?: boolean;
  hreflangPath?: string;
}) {
  const resolved = opts.skipPlaybook
    ? {
      title: opts.seoTitle || opts.title || "",
      description: opts.seoDescription || opts.description || "",
      keywords: opts.seoKeywords || opts.keywords || "",
    }
    : resolvePageSeo(opts);

  if (resolved.title) document.title = resolved.title;
  if (resolved.description !== undefined) upsertMeta("name", "description", resolved.description);
  if (resolved.keywords !== undefined) upsertMeta("name", "keywords", resolved.keywords);
  if (opts.canonical) {
    upsertLink("canonical", opts.canonical);
    upsertMeta("property", "og:url", opts.canonical);
  }
  const ogTitle = opts.ogTitle || resolved.title;
  const ogDesc = opts.ogDescription || resolved.description;
  if (ogTitle) upsertMeta("property", "og:title", ogTitle);
  if (ogDesc) upsertMeta("property", "og:description", ogDesc);
  if (opts.ogType) upsertMeta("property", "og:type", opts.ogType);
  if (opts.ogImage) {
    const img = absoluteUrl(opts.ogImage);
    upsertMeta("property", "og:image", img);
    upsertMeta("name", "twitter:image", img);
  }
  if (ogTitle) upsertMeta("name", "twitter:title", ogTitle);
  if (ogDesc) upsertMeta("name", "twitter:description", ogDesc);
  if (opts.hreflangPath) upsertHreflangAlternates(opts.hreflangPath);
}

export type BreadcrumbItem = { name: string; url: string };

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function buildProductSchema(
  product: {
    id: string;
    slug?: string;
    name: string;
    brand?: string;
    price: number;
    oldPrice?: number;
    inStock?: boolean;
    image?: string;
    images?: string[];
    description?: string;
    shortDescription?: string;
    seoDescription?: string;
    rating?: number;
    reviewCount?: number;
    category?: string;
  },
  opts?: { reviews?: Array<{ rating?: number }>; currency?: string }
) {
  const slug = product.slug || product.id;
  const url = absoluteUrl(`/product/${slug}`);
  const images = [product.image, ...(product.images ?? [])]
    .filter(Boolean)
    .map((img) => absoluteUrl(img!));

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description:
      product.seoDescription ||
      product.shortDescription ||
      stripHtml(product.description || ""),
    url,
    sku: product.id,
    image: images.length ? images : undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: opts?.currency || "EUR",
      price: Number(product.price).toFixed(2),
      availability:
        product.inStock !== false
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${SITE_ORIGIN}/#organization` },
    },
  };

  const reviews = opts?.reviews ?? [];
  if (reviews.length > 0) {
    const avg = reviews.reduce((sum, r) => sum + (r.rating || 5), 0) / reviews.length;
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(avg.toFixed(1)),
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    };
  } else if (product.rating && product.reviewCount) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}

export function buildFaqPageSchema(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: stripHtml(faq.a),
      },
    })),
  };
}

export function buildBlogPostingSchema(blog: {
  title: string;
  slug: string;
  excerpt?: string;
  body?: string;
  cover?: string;
  author?: string;
  date?: string;
  seoDescription?: string;
}) {
  const url = absoluteUrl(`/blogs/${blog.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: blog.title,
    description: blog.seoDescription || blog.excerpt || stripHtml(blog.body || "").slice(0, 300),
    url,
    image: blog.cover ? absoluteUrl(blog.cover) : undefined,
    datePublished: blog.date || undefined,
    author: {
      "@type": "Person",
      name: blog.author || "Schip & Ster",
    },
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

export function buildItemListSchema(
  name: string,
  items: Array<{ name: string; slug?: string; id?: string; url?: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.slice(0, 20).map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: absoluteUrl(item.url || `/product/${item.slug || item.id}`),
    })),
  };
}

export function buildStructuredData(opts: {
  siteName: string;
  siteUrl?: string;
  description?: string;
  logoUrl?: string;
  ogImageUrl?: string;
  supportEmail?: string;
}) {
  const siteUrl = opts.siteUrl || SITE_ORIGIN;
  const logo = absoluteUrl(opts.logoUrl || DEFAULT_FAVICON_48);
  const ogImage = absoluteUrl(opts.ogImageUrl || DEFAULT_OG_IMAGE);

  const organization = {
    "@context": "https://schema.org",
    "@type": ["Organization", "OnlineStore"],
    "@id": `${siteUrl}/#organization`,
    name: opts.siteName,
    alternateName: ["Schipenster", "Schip en Ster"],
    url: siteUrl,
    description: opts.description,
    logo: {
      "@type": "ImageObject",
      url: logo,
      width: 192,
      height: 192,
    },
    image: ogImage,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: opts.supportEmail || "info@schipenster.com",
      availableLanguage: ["Dutch", "English"],
    },
    areaServed: { "@type": "Country", name: "Netherlands" },
    knowsAbout: [
      "Indoor lighting",
      "Outdoor lighting",
      "LED bulbs",
      "Smart home lighting",
      "Lamps and fixtures",
    ],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: opts.siteName,
    alternateName: ["Schipenster", "Schip en Ster"],
    url: siteUrl,
    description: opts.description,
    publisher: { "@id": `${siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/category?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const navigation = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}/#navigation`,
    name: "Main navigation",
    itemListElement: STOREFRONT_NAV_LINKS.map((link, i) => ({
      "@type": "SiteNavigationElement",
      position: i + 1,
      name: link.name,
      url: `${siteUrl}${link.path}`,
    })),
  };

  return { organization, website, navigation };
}
