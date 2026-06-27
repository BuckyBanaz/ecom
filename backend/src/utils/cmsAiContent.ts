/** Sanitize AI-generated CMS HTML before saving to the editor / database. (Node-safe — no DOMParser) */
import { buildAiLanguageInstruction, type AiOutputLanguage } from "./aiLanguage";

export function sanitizeCmsAiHtml(raw: string): string {
  if (!raw?.trim()) return "";

  let html = raw.trim();

  if (/&lt;(p|div|h[1-6]|section|style|\[)/i.test(html) && !/<(p|div|h[1-6]|section|style)/i.test(html)) {
    html = html
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  }

  html = html.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) html = bodyMatch[1].trim();

  html = html
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .trim();

  // Remove tags that never work on the storefront CMS renderer
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s>][^>]*>/gi, "")
    .replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  return html.trim();
}

export function buildCmsPageSystemPrompt(
  extraInstructions?: string,
  outputLanguage?: AiOutputLanguage,
): string {
  const custom = extraInstructions?.trim() ? `\nAdditional store instructions:\n${extraInstructions.trim()}\n` : "";
  const languageBlock = buildAiLanguageInstruction(outputLanguage);

  return `You are an expert CMS page builder for Schip & Ster (schipenster.com) — a premium lighting e-commerce store in the Netherlands/EU.

Your job: generate page content for a Rich Text CMS that renders on a React storefront with Tailwind CSS.

${languageBlock}

${custom}
=== STRICT RULES (violations break the live page) ===
1. NEVER output <script>, JavaScript, onclick handlers, or external .js/.css files.
2. NEVER output <!DOCTYPE>, <html>, <head>, or <body> — only fragment HTML + shortcodes.
3. DO NOT use React/Vue components or Tailwind utility classes — use INLINE STYLES for custom HTML sections.
4. For product grids, heroes, categories, reviews — use SHORTCODES (see below), NOT hand-built product cards.
5. Attribute values in shortcodes MUST use double quotes. Escape inner quotes as &quot;.
6. Separate blocks with <p><br/></p> between shortcodes and HTML sections.
7. Images: use /uploads/ paths or https://images.unsplash.com/photo-... (lighting/interior photos only).
8. Links: use internal paths like /category/pendant-lights, /category/deals, /blogs — not javascript:void.

=== AVAILABLE SHORTCODES (copy syntax exactly) ===

[text-hero title="Page Title" subtitle="Optional subtitle" description="1-2 sentence intro"][/text-hero]

[hero-banner count="1" title_1="Headline" subtitle_1="Subheadline" background_image_1="https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1200" primary_button_text_1="Shop Now" primary_button_link_1="/category/deals"][/hero-banner]

[features-block count="3" icon_1="truck-fast" title_1="Fast delivery" desc_1="Order before 22:00" icon_2="rotate-left" title_2="Easy returns" desc_2="30-day policy" icon_3="shield" title_3="2-year warranty" desc_3="Quality guaranteed"][/features-block]

[category-block title="Shop by Category" categories="pendant-lights,wall-lights,floor-lamps"][/category-block]

[menu-category title="Interior Lighting" menu_slug="interior-lighting" show_label="true"][/menu-category]

[product-block title="Bestsellers" type="bestsellers"][/product-block]
(product-block type: bestsellers | deals | featured | new-arrivals | sale | or category slug like pendant-lights)

[brands-block title="Popular Brands"][/brands-block]

[reviews-block title="Customer Reviews"][/reviews-block]

[blogs-block title="Lighting Tips" description="Latest articles from our journal"][/blogs-block]

=== CUSTOM HTML (between shortcodes) ===
Use simple semantic HTML with INLINE styles only:
- <h2 style="font-size:1.75rem;font-weight:700;margin:1.5rem 0 0.75rem;color:#111827">
- <p style="font-size:1rem;line-height:1.7;color:#374151;margin:0 0 1rem">
- <ul style="padding-left:1.25rem;margin:0 0 1rem;color:#374151">
Optional: one <style> block scoped to .cms-page-section { ... } for grid layouts (NO JS).

=== EXAMPLE (lighting landing page) ===
[text-hero title="Modern Pendant Lights" subtitle="Elevate every room" description="Discover hand-picked pendant lamps."][/text-hero]
<p><br/></p>
[hero-banner count="1" title_1="New Collection" subtitle_1="Up to 40% off" background_image_1="https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=1200" primary_button_text_1="Shop pendants" primary_button_link_1="/category/pendant-lights"][/hero-banner]
<p><br/></p>
<h2 style="font-size:1.5rem;font-weight:700;margin:1rem 0;color:#111827">Why our lighting?</h2>
<p style="font-size:1rem;line-height:1.7;color:#374151">Quality fixtures for every room...</p>
<p><br/></p>
[product-block title="Bestselling Pendants" type="bestsellers"][/product-block]

Return ONLY valid JSON (no markdown fences):
{
  "htmlContent": "...",
  "seoTitle": "max 60 chars",
  "seoDesc": "max 160 chars",
  "seoKeywords": "comma, separated, keywords"
}`;
}
