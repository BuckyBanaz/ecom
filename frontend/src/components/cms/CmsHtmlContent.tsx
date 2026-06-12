import { useLayoutEffect, useMemo, useRef } from "react";
import { resolveImgUrl } from "@/utils/image";
import {
  getCmsHtmlWrapperClass,
  hashString,
  normalizeCmsHtmlForStorage,
  parseCmsHtml,
  repairCmsHtmlTranslateDamage,
} from "@/utils/cmsHtml";

type CmsHtmlContentProps = {
  html: string;
  className?: string;
};

/** Renders CMS HTML — layout must NOT depend on UI language (EN/NL). */
export function CmsHtmlContent({ html, className }: CmsHtmlContentProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const prepared = useMemo(() => {
    const parsed = parseCmsHtml(normalizeCmsHtmlForStorage(html));
    const doc = new DOMParser().parseFromString(parsed.html, "text/html");
    doc.querySelectorAll("img[src^='/uploads/']").forEach((img) => {
      img.setAttribute("src", resolveImgUrl(img.getAttribute("src")!));
    });
    doc.querySelectorAll("a[href^='/uploads/']").forEach((a) => {
      a.setAttribute("href", resolveImgUrl(a.getAttribute("href")!));
    });
    return {
      html: doc.body.innerHTML,
      styles: parsed.styles,
      styleKey: hashString(parsed.styles.join("\n")),
      wrapperClass: getCmsHtmlWrapperClass(html),
    };
  }, [html]);

  // Inject styles + HTML atomically (same as editor source mode). Never tied to i18n.language.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const styleBlock =
      prepared.styles.length > 0
        ? `<style data-cms-page-styles="${prepared.styleKey}">${prepared.styles.join("\n")}</style>`
        : "";

    el.innerHTML = styleBlock + prepared.html;
    repairCmsHtmlTranslateDamage(el);
  }, [prepared.html, prepared.styles, prepared.styleKey]);

  // Undo Chrome Google Translate DOM rewrites that break custom grid/flex layouts.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const repair = () => repairCmsHtmlTranslateDamage(el);
    repair();

    const observer = new MutationObserver(repair);
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [prepared.html, prepared.styleKey]);

  if (!prepared.html && !prepared.styles.length) return null;

  return (
    <div
      ref={rootRef}
      className={[prepared.wrapperClass, "notranslate cms-html-root", className]
        .filter(Boolean)
        .join(" ")}
      translate="no"
    />
  );
}
