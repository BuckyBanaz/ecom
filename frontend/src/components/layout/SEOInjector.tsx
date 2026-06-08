import { useEffect } from "react";
import apiClient from "@/client/apiClient";
import { ENDPOINTS } from "@/utils/endpoints";

export const SEOInjector = () => {
  useEffect(() => {
    const fetchAndInjectSEO = async () => {
      try {
        const res = await apiClient.get<{ data: any }>(ENDPOINTS.PUBLIC_SEO_CONFIG);
        if (res.data) {
          const { siteName, defaultTitle, defaultDescription, ga4, gtm, metaPixel, tiktokPixel } = res.data;

          // Update Document Title and Meta
          if (defaultTitle) document.title = defaultTitle;
          if (defaultDescription) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
              metaDesc = document.createElement("meta");
              metaDesc.setAttribute("name", "description");
              document.head.appendChild(metaDesc);
            }
            metaDesc.setAttribute("content", defaultDescription);
          }

          // Inject GA4
          if (ga4 && !document.getElementById(`ga4-script`)) {
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

          // Inject Meta Pixel
          if (metaPixel && !document.getElementById(`meta-pixel`)) {
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

          // Inject TikTok Pixel
          if (tiktokPixel && !document.getElementById(`tiktok-pixel`)) {
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
        }
      } catch (err) {
        console.error("Failed to load SEO config", err);
      }
    };

    fetchAndInjectSEO();
  }, []);

  return null;
};
