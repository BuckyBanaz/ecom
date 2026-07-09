import type { Plugin } from "vite";

const DEFAULTS = {
  title: "Schip & Ster — Light up your moment",
  description:
    "Shop indoor & outdoor lighting, LED bulbs and smart home fixtures. Ordered before 22:00, delivered next day in NL. 30-day free returns.",
  ogImage: "https://schipenster.com/og-image.png",
  canonical: "https://schipenster.com/",
};

function pick(...values: Array<string | undefined>): string {
  for (const v of values) {
    if (v?.trim()) return v.trim();
  }
  return "";
}

function escAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escJson(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Bake admin SEO env vars into index.html at build time so Googlebot sees them without JS. */
export function injectSeoHtml(): Plugin {
  return {
    name: "inject-seo-html",
    transformIndexHtml(html) {
      const siteName = pick(process.env.VITE_SEO_SITE_NAME, process.env.SEO_SITE_NAME) || "Schip & Ster";
      const title = pick(process.env.VITE_SEO_TITLE, process.env.SEO_DEFAULT_TITLE) || DEFAULTS.title;
      const description =
        pick(process.env.VITE_SEO_DESCRIPTION, process.env.SEO_DEFAULT_DESCRIPTION) || DEFAULTS.description;
      const ogImage = pick(process.env.VITE_SEO_OG_IMAGE, process.env.SEO_OG_IMAGE) || DEFAULTS.ogImage;
      const canonical = pick(process.env.VITE_SEO_CANONICAL, process.env.SEO_CANONICAL_URL) || DEFAULTS.canonical;

      let out = html;
      out = out.replace(/<title>[^<]*<\/title>/, `<title>${escAttr(title)}</title>`);
      out = out.replace(
        /(<meta\s+name="description"\s+content=")[^"]*(")/i,
        `$1${escAttr(description)}$2`,
      );
      out = out.replace(
        /(<meta name="application-name" content=")[^"]*(")/,
        `$1${escAttr(siteName)}$2`,
      );
      out = out.replace(/(<meta property="og:site_name" content=")[^"]*(")/, `$1${escAttr(siteName)}$2`);
      out = out.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(title)}$2`);
      out = out.replace(
        /(<meta property="og:description" content=")[^"]*(")/,
        `$1${escAttr(description)}$2`,
      );
      out = out.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${escAttr(canonical)}$2`);
      out = out.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${escAttr(ogImage)}$2`);
      out = out.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escAttr(title)}$2`);
      out = out.replace(
        /(<meta name="twitter:description" content=")[^"]*(")/,
        `$1${escAttr(description)}$2`,
      );
      out = out.replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${escAttr(ogImage)}$2`);
      out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${escAttr(canonical)}$2`);

      // JSON-LD blocks in index.html
      out = out.replace(/"name": "Schip & Ster"/g, `"name": "${escJson(siteName)}"`);
      out = out.replace(
        /"description": "Shop indoor & outdoor lighting[^"]*"/,
        `"description": "${escJson(description)}"`,
      );
      out = out.replace(/"image": "https:\/\/schipenster.com\/og-image.png"/g, `"image": "${escJson(ogImage)}"`);

      return out;
    },
  };
}
