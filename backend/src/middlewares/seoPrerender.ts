import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { prisma } from "../config/db";

const DEFAULT_TITLE = "Schip & Ster — Light up your moment";
const DEFAULT_DESC = "Shop indoor & outdoor lighting, LED bulbs and smart home fixtures. Ordered before 22:00, delivered next day in NL. 30-day free returns.";
const DEFAULT_IMAGE = "https://schipenster.com/og-image.png";

export const seoPrerender = async (req: Request, res: Response) => {
  // Extract real path by removing the /seo-proxy prefix if present
  let originalUrl = req.originalUrl.replace(/^\/seo-proxy/, "") || "/";
  if (originalUrl === "") originalUrl = "/";
  const urlParts = originalUrl.split("?")[0].split("/").filter(Boolean);
  
  let title = process.env.SEO_DEFAULT_TITLE || DEFAULT_TITLE;
  let description = process.env.SEO_DEFAULT_DESCRIPTION || DEFAULT_DESC;
  let image = process.env.SEO_OG_IMAGE || DEFAULT_IMAGE;
  
  try {
    // Determine route and fetch dynamic SEO data from DB
    if (urlParts[0] === "product" && urlParts[1]) {
      const slug = urlParts[1];
      const product = await prisma.product.findFirst({ where: { slug } });
      if (product) {
        title = product.seoTitle || `${product.name} | Schip & Ster`;
        description = product.seoDescription || product.shortDescription || description;
        image = product.image ? `https://api.schipenster.com${product.image}` : image;
      }
    } else if (urlParts[0] === "category" && urlParts[1]) {
      const slug = urlParts[1];
      const category = await prisma.category.findUnique({ where: { slug } });
      if (category) {
        title = category.seoTitle || `${category.name} | Schip & Ster`;
        description = category.seoDescription || category.description || description;
      }
    } else if (urlParts[0] === "blogs" && urlParts[1]) {
      const slug = urlParts[1];
      const blog = await prisma.blog.findUnique({ where: { slug } });
      if (blog) {
        title = blog.seoTitle || `${blog.title} | Schip & Ster`;
        description = blog.seoDescription || blog.excerpt || description;
        image = blog.coverImage ? `https://api.schipenster.com${blog.coverImage}` : image;
      }
    } else if (urlParts.length > 0) {
      // Potentially a CMS page (like /relief or /about)
      const slug = urlParts[urlParts.length - 1];
      const cmsPage = await prisma.cmsPage.findUnique({ where: { slug } });
      if (cmsPage) {
        title = cmsPage.seoTitle || `${cmsPage.title} | Schip & Ster`;
        description = cmsPage.seoDescription || description;
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
    
    // Inject dynamic Meta Tags by replacing hardcoded values
    html = html.replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`);
    html = html.replace(/<meta\s+name="description"\s+content="[^"]*"/gi, `<meta name="description" content="${description}"`);
    
    // Inject OG and Twitter tags just before </head>
    const injectedMeta = `
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
</head>`;
    html = html.replace(/<\/head>/i, injectedMeta);
    
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
