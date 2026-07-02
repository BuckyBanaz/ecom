import { useEffect } from "react";
import apiClient from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";
import {
  absoluteUrl,
  buildStructuredData,
  DEFAULT_OG_IMAGE,
  SITE_ORIGIN,
  setSeoPlaybookCache,
  upsertJsonLd,
  upsertLink,
  upsertMeta,
} from "@/utils/seoMeta";

const cleanId = (raw: unknown): string => {
  if (typeof raw !== "string") return "";
  const v = raw.trim();
  if (!v || v.toLowerCase() === "null" || v.toLowerCase() === "undefined" || v === "0") return "";
  return v;
};

const isValidMetaPixel = (id: string) => /^\d{8,20}$/.test(id);
const isValidTikTokPixel = (id: string) => /^[A-Z0-9]{10,}$/i.test(id);

const isValidGtm = (id: string) => /^GTM-[A-Z0-9]+$/i.test(id);

const injectGtm = (gtmId: string) => {
  if (!gtmId || !isValidGtm(gtmId) || document.getElementById("gtm-script")) return;

  const script = document.createElement("script");
  script.id = "gtm-script";
  script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`;
  document.head.appendChild(script);

  const noscript = document.createElement("noscript");
  noscript.id = "gtm-noscript";
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.prepend(noscript);
};

const injectTrackingScripts = (cfg: {
  ga4: string;
  gtm: string;
  metaPixel: string;
  tiktokPixel: string;
}) => {
  const { ga4, gtm, metaPixel, tiktokPixel } = cfg;

  if (gtm) {
    injectGtm(gtm);
  } else if (ga4 && !document.getElementById("ga4-script")) {
    const script1 = document.createElement("script");
    script1.id = "ga4-script";
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${ga4}`;
    document.head.appendChild(script1);

    const script2 = document.createElement("script");
    script2.id = "ga4-init";
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${ga4}');
    `;
    document.head.appendChild(script2);
  }

  if (metaPixel && isValidMetaPixel(metaPixel) && !document.getElementById("meta-pixel")) {
    const script = document.createElement("script");
    script.id = "meta-pixel";
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${metaPixel}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);
  }

  if (tiktokPixel && isValidTikTokPixel(tiktokPixel) && !document.getElementById("tiktok-pixel")) {
    const script = document.createElement("script");
    script.id = "tiktok-pixel";
    script.innerHTML = `
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
        ttq.load('${tiktokPixel}');
        ttq.page();
      }(window, document, 'ttq');
    `;
    document.head.appendChild(script);
  }
};

const deferTrackingScripts = (cfg: Parameters<typeof injectTrackingScripts>[0]) => {
  const run = () => injectTrackingScripts(cfg);
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(run, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }
  const timer = window.setTimeout(run, 2000);
  return () => window.clearTimeout(timer);
};

export const SEOInjector = () => {
  useEffect(() => {
    let cancelTracking: (() => void) | undefined;

    const fetchAndInjectSEO = async () => {
      try {
        const res = await apiClient.get<{ data: any }>(ENDPOINTS.PUBLIC_SEO_CONFIG);
        const cfg = res.data || {};
        const siteName = cfg.siteName || "Schip & Ster";
        const defaultTitle = cfg.defaultTitle || "Schip & Ster — Light up your moment";
        const defaultDescription =
          cfg.defaultDescription ||
          "Shop indoor & outdoor lighting, light bulbs, smart home and more. Ordered before 22:00, delivered next day. 30-day returns.";
        const canonical = absoluteUrl(cfg.canonical || SITE_ORIGIN);
        const ogImage = absoluteUrl(cfg.ogImage || DEFAULT_OG_IMAGE);
        const ga4 = cleanId(cfg.ga4);
        const gtm = cleanId(cfg.gtm);
        const metaPixel = cleanId(cfg.metaPixel);
        const tiktokPixel = cleanId(cfg.tiktokPixel);

        setSeoPlaybookCache({
          siteName,
          titleTemplate: cfg.titleTemplate || "%s | Schip & Ster",
          globalKeywords: cfg.globalKeywords || cfg.defaultKeywords || "",
          descriptionCta: cfg.descriptionCta || "",
          mergeGlobalKeywords: cfg.mergeGlobalKeywords !== false,
        });

        document.title = defaultTitle;
        upsertMeta("name", "description", defaultDescription);
        if (cfg.defaultKeywords) upsertMeta("name", "keywords", cfg.defaultKeywords);

        upsertLink("canonical", canonical);
        upsertMeta("property", "og:type", "website");
        upsertMeta("property", "og:site_name", siteName);
        upsertMeta("property", "og:title", defaultTitle);
        upsertMeta("property", "og:description", defaultDescription);
        upsertMeta("property", "og:url", canonical);
        upsertMeta("property", "og:image", ogImage);
        upsertMeta("property", "og:image:width", "1200");
        upsertMeta("property", "og:image:height", "630");
        upsertMeta("name", "twitter:card", "summary_large_image");
        upsertMeta("name", "twitter:title", defaultTitle);
        upsertMeta("name", "twitter:description", defaultDescription);
        upsertMeta("name", "twitter:image", ogImage);
        if (cfg.twitterHandle) upsertMeta("name", "twitter:site", cfg.twitterHandle);

        if (cfg.indexable === false) {
          upsertMeta("name", "robots", "noindex, nofollow");
        }

        const structured = buildStructuredData({
          siteName,
          siteUrl: canonical.replace(/\/$/, "") || SITE_ORIGIN,
          description: defaultDescription,
          ogImageUrl: ogImage,
          supportEmail: cfg.supportEmail,
        });
        upsertJsonLd("organization-schema", structured.organization);
        upsertJsonLd("website-schema", structured.website);
        upsertJsonLd("navigation-schema", structured.navigation);

        cancelTracking = deferTrackingScripts({ ga4, gtm, metaPixel, tiktokPixel });
      } catch (err) {
        console.error("Failed to load SEO config", err);
      }
    };

    fetchAndInjectSEO();
    return () => cancelTracking?.();
  }, []);

  return null;
};
