/** Strip RichTextEditor UI chrome (.cms-block toolbars) before saving or previewing. */
export function stripRichTextEditorArtifacts(html: string): string {
  if (!html?.trim()) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll(".cms-block").forEach((block) => {
    const shortcodeMatch = block.textContent?.match(/\[([a-zA-Z0-9-]+)[^\]]*\]\[\/\1\]/);
    if (shortcodeMatch) {
      block.replaceWith(doc.createTextNode(shortcodeMatch[0]));
      return;
    }
    // Unwrap custom HTML accidentally wrapped in cms-block
    const fragment = doc.createDocumentFragment();
    Array.from(block.childNodes).forEach((child) => {
      if (child instanceof HTMLElement && child.querySelector(".cms-block-edit-btn")) return;
      fragment.appendChild(child.cloneNode(true));
    });
    block.replaceWith(fragment);
  });

  doc
    .querySelectorAll(
      ".cms-block-edit-btn, .cms-block-delete-btn, .cms-block-up-btn, .cms-block-down-btn, .cms-block-above-btn, .cms-block-below-btn",
    )
    .forEach((el) => el.remove());

  return doc.body.innerHTML.trim();
}

export function getCmsHtmlWrapperClass(_html?: string): string {
  // Never use Tailwind `prose` on storefront CMS HTML — it breaks floats, grids, and inline layouts.
  return "cms-rich-html container-page min-w-0 overflow-x-hidden break-words";
}

/** True when author supplied their own layout/CSS — skip auto-normalization. */
export function hasCustomCmsLayout(html: string): boolean {
  if (!html?.trim()) return false;
  const lower = html.toLowerCase();
  return (
    /<style[\s>]/i.test(html) ||
    lower.includes("grid-template") ||
    lower.includes("display:grid") ||
    lower.includes("display: grid") ||
    lower.includes("cms-auto-grid") ||
    lower.includes("cms-hero-grid")
  );
}

/** Normalize editor HTML so side-by-side text+image layouts survive on the live page. */
export function normalizeCmsHtmlForStorage(html: string): string {
  const cleaned = stripRichTextEditorArtifacts(html);
  if (!cleaned) return "";
  if (hasCustomCmsLayout(cleaned)) return cleaned;

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleaned, "text/html");

  // If author floated an image in visual mode, ensure a clearing wrapper exists after it.
  doc.querySelectorAll("img").forEach((img) => {
    const style = (img.getAttribute("style") || "").toLowerCase();
    const hasFloat = style.includes("float:");
    const hasExplicitWidth = /width\s*:/.test(style) || img.hasAttribute("width");
    if (!hasFloat && !hasExplicitWidth) return;

    const next = img.nextElementSibling;
    if (next?.classList.contains("cms-clearfix")) return;

    const clear = doc.createElement("div");
    clear.className = "cms-clearfix";
    clear.setAttribute("style", "clear: both;");
    img.insertAdjacentElement("afterend", clear);
  });

  wrapTextImageHeroGrid(doc);
  wrapDivHeroGrid(doc);

  return doc.body.innerHTML.trim();
}

const TEXT_BLOCK_TAGS = /^(P|H1|H2|H3|H4|H5|H6|DIV|UL|OL|BLOCKQUOTE)$/;

function isTextBlock(el: Element): boolean {
  return TEXT_BLOCK_TAGS.test(el.tagName) && (el.textContent?.trim().length || 0) > 0;
}

function isHeroImage(el: Element): boolean {
  if (el.tagName !== "IMG") return false;
  const src = el.getAttribute("src")?.trim();
  return Boolean(src && !src.startsWith("data:image/svg"));
}

/** Turn stacked text + hero image (common visual-editor save) into a 2-column grid on the live page. */
function wrapTextImageHeroGrid(doc: Document): void {
  if (doc.body.querySelector(".cms-auto-grid, .cms-hero-grid, [style*='grid-template']")) return;

  const children = Array.from(doc.body.children);
  const match = findHeroImageSlot(children);
  if (!match || match.index <= 0) return;

  const before = children.slice(0, match.index);
  const textBlocks = before.filter(isTextBlock);
  if (textBlocks.length < 1) return;

  const textLen = before.reduce((n, el) => n + (el.textContent?.trim().length || 0), 0);
  if (textLen < 24) return;

  const { img, floatedLeft, wrapper } = match;

  const grid = doc.createElement("div");
  grid.className = "cms-auto-grid";

  const textCol = doc.createElement("div");
  textCol.className = "cms-auto-grid-text";
  before.forEach((el) => textCol.appendChild(el));

  const imgCol = doc.createElement("div");
  imgCol.className = "cms-auto-grid-media";
  img.removeAttribute("width");
  img.removeAttribute("height");
  img.style.cssText = "width:100%;max-width:100%;height:auto;display:block;float:none;margin:0;object-fit:cover;border-radius:0.75rem;";

  if (wrapper && wrapper.parentElement) {
    imgCol.appendChild(img);
    wrapper.remove();
  } else {
    imgCol.appendChild(img);
  }

  if (floatedLeft) {
    grid.appendChild(imgCol);
    grid.appendChild(textCol);
  } else {
    grid.appendChild(textCol);
    grid.appendChild(imgCol);
  }

  doc.body.insertBefore(grid, doc.body.firstChild);
}

type HeroImageSlot = {
  img: HTMLImageElement;
  index: number;
  wrapper: Element | null;
  floatedLeft: boolean;
};

function isImageOnlyWrapper(el: Element): HTMLImageElement | null {
  if (!/^(P|DIV|FIGURE|SPAN)$/.test(el.tagName)) return null;
  const imgs = el.querySelectorAll("img");
  if (imgs.length !== 1 || !isHeroImage(imgs[0])) return null;

  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll("img").forEach((node) => node.remove());
  if (clone.textContent?.trim()) return null;

  return imgs[0] as HTMLImageElement;
}

function findHeroImageSlot(children: Element[]): HeroImageSlot | null {
  for (let i = 0; i < children.length; i++) {
    const el = children[i];

    if (el.tagName === "IMG" && isHeroImage(el)) {
      const style = (el.getAttribute("style") || "").toLowerCase();
      return {
        img: el as HTMLImageElement,
        index: i,
        wrapper: null,
        floatedLeft: style.includes("float:left") || style.includes("float: left"),
      };
    }

    const wrappedImg = isImageOnlyWrapper(el);
    if (wrappedImg) {
      const style = (wrappedImg.getAttribute("style") || "").toLowerCase();
      return {
        img: wrappedImg,
        index: i,
        wrapper: el,
        floatedLeft: style.includes("float:left") || style.includes("float: left"),
      };
    }
  }

  return null;
}

/** Single wrapper div with text + image columns (common custom HTML without inline grid). */
function wrapDivHeroGrid(doc: Document): void {
  if (doc.body.querySelector(".cms-auto-grid")) return;

  const topDiv =
    doc.body.children.length === 1 && doc.body.firstElementChild?.tagName === "DIV"
      ? (doc.body.firstElementChild as HTMLElement)
      : null;
  if (!topDiv || topDiv.classList.contains("cms-auto-grid")) return;

  const style = (topDiv.getAttribute("style") || "").toLowerCase();
  if (/grid-template|display:\s*grid/.test(style)) return;

  const imgs = Array.from(topDiv.querySelectorAll("img")).filter(isHeroImage);
  if (imgs.length !== 1) return;
  const img = imgs[0] as HTMLImageElement;

  const textOnly = (topDiv.textContent || "").replace(img.alt || "", "").trim();
  if (textOnly.length < 24) return;

  const textCol = doc.createElement("div");
  textCol.className = "cms-auto-grid-text";
  const imgCol = doc.createElement("div");
  imgCol.className = "cms-auto-grid-media";

  Array.from(topDiv.childNodes).forEach((node) => {
    if (node === img) return;
    if (node instanceof Element && node.contains(img)) return;
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) return;
    textCol.appendChild(node);
  });

  imgCol.appendChild(img);
  topDiv.classList.add("cms-auto-grid");
  topDiv.append(textCol, imgCol);

  img.style.cssText =
    "width:100%;max-width:100%;height:auto;display:block;float:none;margin:0;object-fit:cover;border-radius:0.75rem;";
}

export type ParsedCmsHtml = {
  html: string;
  styles: string[];
};

/** Pull <style> tags out so they apply on the live page (innerHTML alone often ignores them). */
export function parseCmsHtml(html: string): ParsedCmsHtml {
  if (!html?.trim()) return { html: "", styles: [] };

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const styles: string[] = [];

  doc.querySelectorAll("style").forEach((node) => {
    const css = node.textContent?.trim();
    if (css) styles.push(css);
    node.remove();
  });

  // Scripts are stripped on the storefront for safety; keep in editor source only.
  doc.querySelectorAll("script").forEach((node) => node.remove());

  return { html: doc.body.innerHTML.trim(), styles };
}

export function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/** Chrome GT wraps text in <font> tags and breaks custom CSS grid/flex layouts. */
export function repairCmsHtmlTranslateDamage(root: ParentNode): void {
  root.querySelectorAll("font").forEach((font) => {
    const parent = font.parentNode;
    if (!parent) return;
    while (font.firstChild) parent.insertBefore(font.firstChild, font);
    font.remove();
  });

  root.querySelectorAll(".cms-auto-grid, [style*='grid-template'], [style*='display: grid'], [style*='display:grid']").forEach((el) => {
    if (el instanceof HTMLElement) {
      const style = el.getAttribute("style") || "";
      if (/grid-template|display:\s*grid/i.test(style)) {
        el.style.display = "grid";
      }
    }
  });
}
