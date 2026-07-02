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
  const [localizedHtml, setLocalizedHtml] = useState<string | null>(null);

  const prepared = useMemo(() => {
    const parsed = parseCmsHtml(normalizeCmsHtmlForStorage(html));
    const doc = new DOMParser().parseFromString(parsed.html, "text/html");
    doc.querySelectorAll("img").forEach((img, index) => {
      const src = img.getAttribute("src");
      if (src?.includes("/uploads/")) {
        img.setAttribute("src", resolveImgUrl(src));
      }
      const isLcp = index === 0;
      if (!img.getAttribute("loading")) {
        img.setAttribute("loading", isLcp ? "eager" : "lazy");
      }
      if (!img.getAttribute("decoding")) img.setAttribute("decoding", "async");
      if (isLcp && !img.getAttribute("fetchpriority")) {
        img.setAttribute("fetchpriority", "high");
      }
      if (!img.getAttribute("width") && !img.getAttribute("height")) {
        img.setAttribute("width", "1200");
        img.setAttribute("height", "800");
      }
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

  const displayHtml = localizedHtml ?? prepared.html;

  // Dutch shows immediately; EN translates in idle time so CMS paint is not blocked.
  useEffect(() => {
    setLocalizedHtml(null);
    const lang = i18n.language.split("-")[0].toLowerCase();
    if (lang === "nl" || !prepared.html.trim()) return;

    let active = true;
    const runTranslation = () => {
      translateCmsHtmlForLocale(prepared.html, i18n.language, t).then((next) => {
        if (active) setLocalizedHtml(next);
      });
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(runTranslation, { timeout: 2000 });
      return () => {
        active = false;
        window.cancelIdleCallback(id);
      };
    }

    const timer = window.setTimeout(runTranslation, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [prepared.html, i18n.language, t]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const styleBlock =
      prepared.styles.length > 0
        ? `<style data-cms-page-styles="${prepared.styleKey}">${prepared.styles.join("\n")}</style>`
        : "";

    el.innerHTML = styleBlock + displayHtml;
    repairCmsHtmlTranslateDamage(el);
  }, [displayHtml, prepared.styles, prepared.styleKey]);

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
