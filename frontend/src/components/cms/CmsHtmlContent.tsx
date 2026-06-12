import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { resolveImgUrl } from "@/utils/image";
import {
  getCmsHtmlWrapperClass,
  hashString,
  normalizeCmsHtmlForStorage,
  parseCmsHtml,
  repairCmsHtmlTranslateDamage,
} from "@/utils/cmsHtml";
import { translateCmsHtmlForLocale } from "@/utils/cmsHtmlLocale";

type CmsHtmlContentProps = {
  html: string;
  className?: string;
};

/** Renders CMS HTML — layout stays intact; text translates per TAAL (EN/NL). */
export function CmsHtmlContent({ html, className }: CmsHtmlContentProps) {
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [localizedHtml, setLocalizedHtml] = useState("");

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

  // Translate text nodes only (never the raw HTML string / CSS).
  useEffect(() => {
    let active = true;

    (async () => {
      const next = await translateCmsHtmlForLocale(prepared.html, i18n.language, t);
      if (active) setLocalizedHtml(next);
    })();

    return () => {
      active = false;
    };
  }, [prepared.html, i18n.language, t]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const styleBlock =
      prepared.styles.length > 0
        ? `<style data-cms-page-styles="${prepared.styleKey}">${prepared.styles.join("\n")}</style>`
        : "";

    el.innerHTML = styleBlock + localizedHtml;
    repairCmsHtmlTranslateDamage(el);
  }, [localizedHtml, prepared.styles, prepared.styleKey]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const repair = () => repairCmsHtmlTranslateDamage(el);
    repair();

    const observer = new MutationObserver(repair);
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [localizedHtml, prepared.styleKey]);

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
