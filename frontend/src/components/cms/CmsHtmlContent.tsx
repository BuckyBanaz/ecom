import { useEffect, useMemo } from "react";
import { resolveImgUrl } from "@/utils/image";
import {
  getCmsHtmlWrapperClass,
  hashString,
  normalizeCmsHtmlForStorage,
  parseCmsHtml,
} from "@/utils/cmsHtml";

type CmsHtmlContentProps = {
  html: string;
  className?: string;
};

/** Renders CMS HTML on the storefront — supports custom CSS/layout from RichTextEditor source mode. */
export function CmsHtmlContent({ html, className }: CmsHtmlContentProps) {
  const prepared = useMemo(() => {
    const parsed = parseCmsHtml(normalizeCmsHtmlForStorage(html));
    // Resolve upload paths for images/links in fragment
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
      wrapperClass: getCmsHtmlWrapperClass(html),
    };
  }, [html]);

  useEffect(() => {
    if (!prepared.styles.length) return;

    const styleId = `cms-page-style-${hashString(prepared.styles.join("\n"))}`;
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = styleId;
      el.dataset.cmsInjected = "true";
      document.head.appendChild(el);
    }
    el.textContent = prepared.styles.join("\n");

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, [prepared.styles]);

  if (!prepared.html) return null;

  return (
    <div
      className={[prepared.wrapperClass, className].filter(Boolean).join(" ")}
      dangerouslySetInnerHTML={{ __html: prepared.html }}
    />
  );
}
