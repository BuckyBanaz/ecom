import type { TFunction } from "i18next";
import { translateCmsText } from "./translator";

const SKIP_TAGS = new Set(["STYLE", "SCRIPT", "CODE", "PRE", "NOSCRIPT"]);
const TRANSLATABLE_ATTRS = ["alt", "title", "placeholder", "aria-label"] as const;

function collectTextNodes(doc: Document): Text[] {
  const nodes: Text[] = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("style, script")) return NodeFilter.FILTER_REJECT;
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current: Node | null;
  while ((current = walker.nextNode())) nodes.push(current as Text);
  return nodes;
}

/**
 * Translate visible text inside CMS HTML for the active TAAL.
 * Tags, classes, inline styles, and <style> blocks are never modified.
 */
export async function translateCmsHtmlForLocale(
  html: string,
  targetLang: string,
  t: TFunction,
): Promise<string> {
  const lang = targetLang.split("-")[0].toLowerCase();
  if (lang === "nl" || !html.trim()) return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const textNodes = collectTextNodes(doc);

  const uniqueTrimmed = new Set<string>();
  textNodes.forEach((node) => {
    const trimmed = node.textContent?.trim();
    if (trimmed) uniqueTrimmed.add(trimmed);
  });

  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of TRANSLATABLE_ATTRS) {
      const val = el.getAttribute(attr)?.trim();
      if (val) uniqueTrimmed.add(val);
    }
  });

  const translationMap = new Map<string, string>();
  await Promise.all(
    [...uniqueTrimmed].map(async (trimmed) => {
      const translated = await translateCmsText(trimmed, lang, t);
      translationMap.set(trimmed, translated.trim());
    }),
  );

  textNodes.forEach((node) => {
    const raw = node.textContent || "";
    const trimmed = raw.trim();
    const translated = translationMap.get(trimmed);
    if (translated && translated !== trimmed) {
      node.textContent = raw.replace(trimmed, translated);
    }
  });

  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of TRANSLATABLE_ATTRS) {
      const val = el.getAttribute(attr);
      if (!val?.trim()) continue;
      const translated = translationMap.get(val.trim());
      if (translated && translated !== val.trim()) {
        el.setAttribute(attr, val.replace(val.trim(), translated));
      }
    }
  });

  return doc.body.innerHTML;
}
