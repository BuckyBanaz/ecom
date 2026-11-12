import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { prisma } from "../config/db";
import { getSeoPlaybook } from "../services/seoPlaybookService";

const BRAND_SITE_NAME = "Schip & Ster";
const DEFAULT_TITLE = "Schip & Ster — Light up your moment";
const DEFAULT_DESC = "Shop indoor & outdoor lighting, LED bulbs and smart home fixtures. Ordered before 22:00, delivered next day in NL. 30-day free returns.";
const DEFAULT_IMAGE = "https://schipenster.com/og-image.png";
const NON_INDEXABLE_ROUTES = new Set([
  "account",
  "cart",
  "checkout",
  "dashboard",
  "forgot-password",
  "invoice",
  "reset-password",
  "search",
  "wishlist",
]);
const STATIC_ROUTE_META: Record<string, { title: string; description: string }> = {
  blogs: {
    title: "Lighting Blog & Buying Guides | Schip & Ster",
    description: "Read Schip & Ster lighting guides, LED tips and inspiration for choosing indoor, outdoor and smart lighting.",
  },
  categories: {
    title: "Lighting Categories | Indoor, Outdoor & LED Lamps | Schip & Ster",
    description: "Browse all Schip & Ster lighting categories, including pendant lamps, wall lamps, outdoor lighting, LED bulbs and smart home lighting.",
  },
  faqs: {
    title: "Veelgestelde vragen over lampen bestellen | Schip & Ster",
    description: "Vind antwoorden over bestellen, bezorgen, retourneren, garantie en lampen kopen bij Schip & Ster.",
  },
  relief: {
    title: "Lighting Advice & Category Guides | Schip & Ster",
    description: "Find practical lighting advice and curated Schip & Ster category guides for every room, style and fixture type.",
  },
};

function escAttr(value: string): string {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function absoluteMediaUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://api.schipenster.com${value.startsWith("/") ? value : `/${value}`}`;
}

export const seoPrerender = async (req: Request, res: Response) => {
  // Extract real path by removing the /seo-proxy prefix if present
  let originalUrl = req.originalUrl.replace(/^\/seo-proxy/, "") || "/";
  if (originalUrl === "") originalUrl = "/";
  if (originalUrl === "/categorie" || originalUrl === "/categorie/") {
    res.redirect(301, "/categories");
    return;
  }
  if (originalUrl.startsWith("/categorie/")) {
    res.redirect(301, originalUrl.replace(/^\/categorie\//, "/category/"));
    return;
  }
  const urlParts = originalUrl.split("?")[0].split("/").filter(Boolean);
  
  let title = process.env.SEO_DEFAULT_TITLE || DEFAULT_TITLE;
  let description = process.env.SEO_DEFAULT_DESCRIPTION || DEFAULT_DESC;
  let image = process.env.SEO_OG_IMAGE || DEFAULT_IMAGE;
  let pageSchema: object | null = null;
  let productSchema: object | null = null;
  
  let isNotFound = false;
  const isNonIndexableRoute = urlParts.length > 0 && NON_INDEXABLE_ROUTES.has(urlParts[0]);

  try {
    // Determine route and fetch dynamic SEO data from DB
    if (urlParts[0] === "product" && urlParts[1]) {
      const slug = urlParts[1];
      const product = await prisma.product.findFirst({
        where: { slug },
        include: { brand: { select: { name: true } }, category: { select: { name: true, slug: true } } },
      });
      if (product) {
        title = product.seoTitle || `${product.name} | Schip & Ster`;
        description = product.seoDescription || product.shortDescription || description;
        image = absoluteMediaUrl(product.image) || image;
        const productUrl = `https://schipenster.com/product/${product.slug}`;
        const productImages = [product.image, ...product.images].map(absoluteMediaUrl).filter(Boolean);
        productSchema = {
          "@context": "https://schema.org",
          "@type": "Product",
          "@id": `${productUrl}#product`,
          name: product.name,
          description,
          url: productUrl,
          sku: product.id,
          image: productImages.length ? productImages : [image],
          brand: { "@type": "Brand", name: product.brand?.name || BRAND_SITE_NAME },
          category: product.category?.name,
          offers: {
            "@type": "Offer",
            url: productUrl,
            priceCurrency: "EUR",
            price: product.price.toFixed(2),
            availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@id": "https://schipenster.com/#organization" },
          },
        };
      } else {
        isNotFound = true;
      }
    } else if (urlParts[0] === "category" && urlParts[1]) {
      const slug = urlParts[1];
      const category = await prisma.category.findUnique({ where: { slug } });
      if (category) {
        title = category.seoTitle || `${category.name} | Schip & Ster`;
        description = category.seoDescription || description;
      } else {
        isNotFound = true;
      }
    } else if (urlParts[0] === "blogs" && urlParts[1]) {
      const slug = urlParts[1];
      const blog = await prisma.blog.findUnique({ where: { slug } });
      if (blog) {
        title = blog.seoTitle || `${blog.title} | Schip & Ster`;
        description = blog.seoDescription || blog.excerpt || description;
        image = blog.cover ? `https://api.schipenster.com${blog.cover}` : image;
      } else {
        isNotFound = true;
      }
    } else if (urlParts.length > 0) {
      // Potentially a CMS page (like /relief or /about)
      const slug = urlParts[urlParts.length - 1];
      const cmsPage = await prisma.cmsPage.findUnique({ where: { slug } });
      if (cmsPage) {
        title = cmsPage.seoTitle || `${cmsPage.title} | Schip & Ster`;
        description = cmsPage.seoDesc || description;
        image = absoluteMediaUrl(cmsPage.seoImage) || image;
        pageSchema = {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `https://schipenster.com/${cmsPage.slug}#webpage`,
          name: title,
          description,
          url: `https://schipenster.com/${cmsPage.slug}`,
          isPartOf: { "@id": "https://schipenster.com/#website" },
          publisher: { "@id": "https://schipenster.com/#organization" },
        };
      } else {
        // Look up in landing_pages_data config (for dynamic relief category pages)
        const config = await prisma.cmsConfig.findUnique({ where: { key: "landing_pages_data" } });
        let isLandingPage = false;
        if (config && typeof config.value === "object" && config.value !== null) {
          const pageData = (config.value as Record<string, any>)[slug];
          if (pageData) {
            isLandingPage = true;
            title = pageData.seoTitle || pageData.title || pageData.name || title;
            description = pageData.seoDescription || description;
            pageSchema = {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "@id": `https://schipenster.com/relief/${slug}#webpage`,
              name: title,
              description,
              url: `https://schipenster.com/relief/${slug}`,
              isPartOf: { "@id": "https://schipenster.com/#website" },
              publisher: { "@id": "https://schipenster.com/#organization" },
            };
          }
        }

        if (!isLandingPage) {
          // If it's not in the database and not a known static page, it's a 404!
          const STATIC_ROUTES = new Set([
            "relief", "categories", "category", "deals", "product", "cart", "checkout", "search", 
            "account", "forgot-password", "reset-password", "dashboard", "faqs", "blogs", "wishlist", "404", "invoice"
          ]);
          const staticMeta = urlParts.length === 1 ? STATIC_ROUTE_META[urlParts[0]] : undefined;
          if (staticMeta) {
            title = staticMeta.title;
            description = staticMeta.description;
          }
          if (urlParts.length === 1 && !STATIC_ROUTES.has(urlParts[0])) {
            isNotFound = true;
          }
        }
      }
    }
    
    // Read the built frontend HTML (or fallback to source)
    let html = "";
    let indexPath = path.resolve(__dirname, "../../../frontend/dist/index.html");
    if (!fs.existsSync(indexPath)) {
      indexPath = path.resolve(__dirname, "../../../frontend/index.html");
    }
    
    if (fs.existsSync(indexPath)) {
      html = fs.readFileSync(indexPath, "utf-8");
    } else {
      // In production Docker, backend cannot access frontend files. Fetch from frontend container.
      const targetUrl = process.env.NODE_ENV === "production" ? "http://frontend" : "http://localhost:5173";
      try {
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error("Failed to fetch from frontend container");
        html = await response.text();
      } catch (fetchErr) {
        throw new Error("index.html not found and fetch failed: " + (fetchErr as Error).message);
      }
    }
    
    const baseCanonical = (
      process.env.SEO_CANONICAL_URL ||
      process.env.CLIENT_URL ||
      process.env.STORE_URL ||
      "https://schipenster.com"
    ).replace(/\/$/, "");
    const canonicalUrl = `${baseCanonical}${originalUrl === "/" ? "" : originalUrl}`;

    // Use dynamic site name from admin SEO settings (falls back to hardcoded default)
    const playbook = await getSeoPlaybook().catch(() => null);
    const siteName = playbook?.siteName || process.env.SEO_SITE_NAME || BRAND_SITE_NAME;
    const escTitle = escAttr(title);
    const escDescription = escAttr(description);
    const escImage = escAttr(image);
    const escSiteName = escAttr(siteName);
    const escCanonical = escAttr(canonicalUrl);
    const robotsMeta = isNotFound || isNonIndexableRoute ? "noindex, nofollow" : "index, follow";

    // Inject dynamic Meta Tags by replacing hardcoded values
    html = html.replace(/<title>.*?<\/title>/gi, `<title>${escTitle}</title>`);
    html = html.replace(/<meta\s+name="application-name"\s+content="[^"]*"\s*\/?>/gi, `<meta name="application-name" content="${escSiteName}" />`);
    html = html.replace(/<meta\s+name="description"\s+content="[^"]*"/gi, `<meta name="description" content="${escDescription}"`);
    html = html.replace(/<meta\s+(?:name|property)="(?:robots|og:site_name|og:type|og:url|og:title|og:description|og:image|twitter:card|twitter:title|twitter:description|twitter:image)"\s+content="[^"]*"\s*\/?>/gi, "");
    html = html.replace(/<script\b[^>]*id="(?:organization-schema|website-schema|product-schema|webpage-schema)"[^>]*>[\s\S]*?<\/script>/gi, "");
    
    // Replace hardcoded canonical URL with the actual page URL
    html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/gi, `<link rel="canonical" href="${escCanonical}" />`);
    
    // Inject OG and Twitter tags just before </head>
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": ["Organization", "OnlineStore"],
      "@id": `${baseCanonical}/#organization`,
      name: siteName,
      alternateName: ["Schip en Ster"],
      url: baseCanonical,
      description,
      logo: {
        "@type": "ImageObject",
        url: `${baseCanonical}/favicon-192x192.png`,
        width: 192,
        height: 192,
      },
      image,
    };
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${baseCanonical}/#website`,
      name: siteName,
      alternateName: ["Schipenster", "Schip en Ster"],
      url: baseCanonical,
      description,
      publisher: { "@id": `${baseCanonical}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${baseCanonical}/category?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    };
    const injectedMeta = `
  <meta property="og:site_name" content="${escSiteName}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escCanonical}" />
  <meta property="og:title" content="${escTitle}" />
  <meta property="og:description" content="${escDescription}" />
  <meta property="og:image" content="${escImage}" />
  <meta name="robots" content="${robotsMeta}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escTitle}" />
  <meta name="twitter:description" content="${escDescription}" />
  <meta name="twitter:image" content="${escImage}" />
  <script type="application/ld+json" id="organization-schema">${jsonLd(organizationSchema)}</script>
  <script type="application/ld+json" id="website-schema">${jsonLd(websiteSchema)}</script>
  ${productSchema ? `<script type="application/ld+json" id="product-schema">${jsonLd(productSchema)}</script>` : ""}
  ${pageSchema ? `<script type="application/ld+json" id="webpage-schema">${jsonLd(pageSchema)}</script>` : ""}
</head>`;
    html = html.replace(/<\/head>/i, injectedMeta);

    // Inject SEO body content so Google can validate the site name from visible H1
    // Google requires the WebSite schema "name" to match visible page content
    const seoBodyBlock = `
  <header id="seo-header" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">
    <h1>${escAttr(siteName)}</h1>
    <p>${escAttr(description)}</p>
    <nav>
      <a href="${escAttr(baseCanonical)}/">Home</a>
      <a href="${escAttr(baseCanonical)}/categories">Alle categorieën</a>
      <a href="${escAttr(baseCanonical)}/category/deals">Aanbiedingen</a>
      <a href="${escAttr(baseCanonical)}/category/bestsellers">Bestsellers</a>
      <a href="${escAttr(baseCanonical)}/brands">Merken</a>
      <a href="${escAttr(baseCanonical)}/blogs">Blog</a>
      <a href="${escAttr(baseCanonical)}/faqs">FAQ</a>
    </nav>
  </header>`;
    html = html.replace(/<div id="root"><\/div>/, `<div id="root"></div>${seoBodyBlock}`);
    
    if (isNotFound) {
      res.status(404);
    }
    res.send(html);
  } catch (error) {
    console.error("SEO Prerender Error:", error);
    let indexPath = path.resolve(__dirname, "../../../frontend/dist/index.html");
    if (!fs.existsSync(indexPath)) {
      indexPath = path.resolve(__dirname, "../../../frontend/index.html");
    }
    if (fs.existsSync(indexPath)) {
       res.sendFile(indexPath);
    } else {
       // In Docker, fetch from frontend container
       const targetUrl = process.env.NODE_ENV === "production" ? "http://frontend" : "http://localhost:5173";
       try {
         const response = await fetch(targetUrl);
         if (!response.ok) throw new Error("Failed to fetch");
         const html = await response.text();
         res.send(html);
       } catch (err) {
         res.status(500).send("SEO Prerender Error: index.html not found and fetch failed");
       }
    }
  }
};
