// vite.config.ts
import { defineConfig } from "file:///C:/Users/Parikshit/Desktop/workspace/ecom/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Parikshit/Desktop/workspace/ecom/frontend/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";

// vite-plugin-inject-seo.ts
var DEFAULTS = {
  title: "Schip & Ster \u2014 Light up your moment",
  description: "Shop indoor & outdoor lighting, LED bulbs and smart home fixtures. Ordered before 22:00, delivered next day in NL. 30-day free returns.",
  ogImage: "https://schipenster.com/og-image.png",
  canonical: "https://schipenster.com/"
};
function pick(...values) {
  for (const v of values) {
    if (v?.trim()) return v.trim();
  }
  return "";
}
function escAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escJson(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function injectSeoHtml() {
  return {
    name: "inject-seo-html",
    transformIndexHtml(html) {
      const siteName = pick(process.env.VITE_SEO_SITE_NAME, process.env.SEO_SITE_NAME) || "Schip & Ster";
      const title = pick(process.env.VITE_SEO_TITLE, process.env.SEO_DEFAULT_TITLE) || DEFAULTS.title;
      const description = pick(process.env.VITE_SEO_DESCRIPTION, process.env.SEO_DEFAULT_DESCRIPTION) || DEFAULTS.description;
      const ogImage = pick(process.env.VITE_SEO_OG_IMAGE, process.env.SEO_OG_IMAGE) || DEFAULTS.ogImage;
      const canonical = pick(process.env.VITE_SEO_CANONICAL, process.env.SEO_CANONICAL_URL) || DEFAULTS.canonical;
      let out = html;
      out = out.replace(/<title>[^<]*<\/title>/, `<title>${escAttr(title)}</title>`);
      out = out.replace(
        /(<meta\s+name="description"\s+content=")[^"]*(")/i,
        `$1${escAttr(description)}$2`
      );
      out = out.replace(
        /(<meta name="application-name" content=")[^"]*(")/,
        `$1${escAttr(siteName)}$2`
      );
      out = out.replace(/(<meta property="og:site_name" content=")[^"]*(")/, `$1${escAttr(siteName)}$2`);
      out = out.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(title)}$2`);
      out = out.replace(
        /(<meta property="og:description" content=")[^"]*(")/,
        `$1${escAttr(description)}$2`
      );
      out = out.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${escAttr(canonical)}$2`);
      out = out.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${escAttr(ogImage)}$2`);
      out = out.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escAttr(title)}$2`);
      out = out.replace(
        /(<meta name="twitter:description" content=")[^"]*(")/,
        `$1${escAttr(description)}$2`
      );
      out = out.replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${escAttr(ogImage)}$2`);
      out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${escAttr(canonical)}$2`);
      out = out.replace(/"name": "Schip & Ster"/g, `"name": "${escJson(siteName)}"`);
      out = out.replace(
        /"description": "Shop indoor & outdoor lighting[^"]*"/,
        `"description": "${escJson(description)}"`
      );
      out = out.replace(/"image": "https:\/\/schipenster.com\/og-image.png"/g, `"image": "${escJson(ogImage)}"`);
      return out;
    }
  };
}

// vite.config.ts
var __vite_injected_original_dirname = "C:\\Users\\Parikshit\\Desktop\\workspace\\ecom\\frontend";
var vite_config_default = defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true
      },
      "/uploads": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true
      }
    }
  },
  plugins: [react(), injectSeoHtml()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"]
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("fontawesome-admin")) return "fontawesome-full";
          if (id.includes("@fortawesome/free-solid-svg-icons") && !/\/fa[A-Z][A-Za-z0-9-]*\.js/.test(id)) {
            return "fontawesome-full";
          }
          if (id.includes("@fortawesome/free-brands-svg-icons") && !/\/fa[A-Z][A-Za-z0-9-]*\.js/.test(id)) {
            return "fontawesome-full";
          }
          if (id.includes("firebase")) return "firebase";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAidml0ZS1wbHVnaW4taW5qZWN0LXNlby50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXFBhcmlrc2hpdFxcXFxEZXNrdG9wXFxcXHdvcmtzcGFjZVxcXFxlY29tXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxQYXJpa3NoaXRcXFxcRGVza3RvcFxcXFx3b3Jrc3BhY2VcXFxcZWNvbVxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvUGFyaWtzaGl0L0Rlc2t0b3Avd29ya3NwYWNlL2Vjb20vZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgeyBpbmplY3RTZW9IdG1sIH0gZnJvbSBcIi4vdml0ZS1wbHVnaW4taW5qZWN0LXNlb1wiO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCgpID0+ICh7XHJcbiAgc2VydmVyOiB7XHJcbiAgICBob3N0OiBcIjo6XCIsXHJcbiAgICBwb3J0OiA4MDgwLFxyXG4gICAgaG1yOiB7XHJcbiAgICAgIG92ZXJsYXk6IGZhbHNlLFxyXG4gICAgfSxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgIFwiL2FwaVwiOiB7XHJcbiAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6NTAwMFwiLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgXCIvdXBsb2Fkc1wiOiB7XHJcbiAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6NTAwMFwiLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBwbHVnaW5zOiBbcmVhY3QoKSwgaW5qZWN0U2VvSHRtbCgpXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgICBkZWR1cGU6IFtcInJlYWN0XCIsIFwicmVhY3QtZG9tXCIsIFwicmVhY3QvanN4LXJ1bnRpbWVcIiwgXCJyZWFjdC9qc3gtZGV2LXJ1bnRpbWVcIl0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgdGFyZ2V0OiBcImVzMjAyMFwiLFxyXG4gICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxyXG4gICAgc291cmNlbWFwOiBmYWxzZSxcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XHJcbiAgICAgICAgICBpZiAoIWlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzXCIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgLy8gT25seSBzcGxpdCB2ZXJ5IGxhcmdlIG9wdGlvbmFsIGRlcHMuIERvIE5PVCBzcGxpdCByZWFjdC9yZWFjdC1kb20gXHUyMDE0XHJcbiAgICAgICAgICAvLyB0aGF0IGNhdXNlcyBcIl9fU0VDUkVUX0lOVEVSTkFMU19ET19OT1RfVVNFX09SX1lPVV9XSUxMX0JFX0ZJUkVEXCIgY3Jhc2hlcy5cclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcImZvbnRhd2Vzb21lLWFkbWluXCIpKSByZXR1cm4gXCJmb250YXdlc29tZS1mdWxsXCI7XHJcbiAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiQGZvcnRhd2Vzb21lL2ZyZWUtc29saWQtc3ZnLWljb25zXCIpICYmXHJcbiAgICAgICAgICAgICEvXFwvZmFbQS1aXVtBLVphLXowLTktXSpcXC5qcy8udGVzdChpZClcclxuICAgICAgICAgICkge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJmb250YXdlc29tZS1mdWxsXCI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiQGZvcnRhd2Vzb21lL2ZyZWUtYnJhbmRzLXN2Zy1pY29uc1wiKSAmJlxyXG4gICAgICAgICAgICAhL1xcL2ZhW0EtWl1bQS1aYS16MC05LV0qXFwuanMvLnRlc3QoaWQpXHJcbiAgICAgICAgICApIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwiZm9udGF3ZXNvbWUtZnVsbFwiO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiZmlyZWJhc2VcIikpIHJldHVybiBcImZpcmViYXNlXCI7XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJyZWNoYXJ0c1wiKSB8fCBpZC5pbmNsdWRlcyhcImQzLVwiKSkgcmV0dXJuIFwiY2hhcnRzXCI7XHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxufSkpO1xyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXFBhcmlrc2hpdFxcXFxEZXNrdG9wXFxcXHdvcmtzcGFjZVxcXFxlY29tXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxQYXJpa3NoaXRcXFxcRGVza3RvcFxcXFx3b3Jrc3BhY2VcXFxcZWNvbVxcXFxmcm9udGVuZFxcXFx2aXRlLXBsdWdpbi1pbmplY3Qtc2VvLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9QYXJpa3NoaXQvRGVza3RvcC93b3Jrc3BhY2UvZWNvbS9mcm9udGVuZC92aXRlLXBsdWdpbi1pbmplY3Qtc2VvLnRzXCI7aW1wb3J0IHR5cGUgeyBQbHVnaW4gfSBmcm9tIFwidml0ZVwiO1xyXG5cclxuY29uc3QgREVGQVVMVFMgPSB7XHJcbiAgdGl0bGU6IFwiU2NoaXAgJiBTdGVyIFx1MjAxNCBMaWdodCB1cCB5b3VyIG1vbWVudFwiLFxyXG4gIGRlc2NyaXB0aW9uOlxyXG4gICAgXCJTaG9wIGluZG9vciAmIG91dGRvb3IgbGlnaHRpbmcsIExFRCBidWxicyBhbmQgc21hcnQgaG9tZSBmaXh0dXJlcy4gT3JkZXJlZCBiZWZvcmUgMjI6MDAsIGRlbGl2ZXJlZCBuZXh0IGRheSBpbiBOTC4gMzAtZGF5IGZyZWUgcmV0dXJucy5cIixcclxuICBvZ0ltYWdlOiBcImh0dHBzOi8vc2NoaXBlbnN0ZXIuY29tL29nLWltYWdlLnBuZ1wiLFxyXG4gIGNhbm9uaWNhbDogXCJodHRwczovL3NjaGlwZW5zdGVyLmNvbS9cIixcclxufTtcclxuXHJcbmZ1bmN0aW9uIHBpY2soLi4udmFsdWVzOiBBcnJheTxzdHJpbmcgfCB1bmRlZmluZWQ+KTogc3RyaW5nIHtcclxuICBmb3IgKGNvbnN0IHYgb2YgdmFsdWVzKSB7XHJcbiAgICBpZiAodj8udHJpbSgpKSByZXR1cm4gdi50cmltKCk7XHJcbiAgfVxyXG4gIHJldHVybiBcIlwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlc2NBdHRyKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIHJldHVybiB2YWx1ZVxyXG4gICAgLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKVxyXG4gICAgLnJlcGxhY2UoL1wiL2csIFwiJnF1b3Q7XCIpXHJcbiAgICAucmVwbGFjZSgvPC9nLCBcIiZsdDtcIilcclxuICAgIC5yZXBsYWNlKC8+L2csIFwiJmd0O1wiKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZXNjSnNvbih2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICByZXR1cm4gdmFsdWUucmVwbGFjZSgvXFxcXC9nLCBcIlxcXFxcXFxcXCIpLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKTtcclxufVxyXG5cclxuLyoqIEJha2UgYWRtaW4gU0VPIGVudiB2YXJzIGludG8gaW5kZXguaHRtbCBhdCBidWlsZCB0aW1lIHNvIEdvb2dsZWJvdCBzZWVzIHRoZW0gd2l0aG91dCBKUy4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGluamVjdFNlb0h0bWwoKTogUGx1Z2luIHtcclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogXCJpbmplY3Qtc2VvLWh0bWxcIixcclxuICAgIHRyYW5zZm9ybUluZGV4SHRtbChodG1sKSB7XHJcbiAgICAgIGNvbnN0IHNpdGVOYW1lID0gcGljayhwcm9jZXNzLmVudi5WSVRFX1NFT19TSVRFX05BTUUsIHByb2Nlc3MuZW52LlNFT19TSVRFX05BTUUpIHx8IFwiU2NoaXAgJiBTdGVyXCI7XHJcbiAgICAgIGNvbnN0IHRpdGxlID0gcGljayhwcm9jZXNzLmVudi5WSVRFX1NFT19USVRMRSwgcHJvY2Vzcy5lbnYuU0VPX0RFRkFVTFRfVElUTEUpIHx8IERFRkFVTFRTLnRpdGxlO1xyXG4gICAgICBjb25zdCBkZXNjcmlwdGlvbiA9XHJcbiAgICAgICAgcGljayhwcm9jZXNzLmVudi5WSVRFX1NFT19ERVNDUklQVElPTiwgcHJvY2Vzcy5lbnYuU0VPX0RFRkFVTFRfREVTQ1JJUFRJT04pIHx8IERFRkFVTFRTLmRlc2NyaXB0aW9uO1xyXG4gICAgICBjb25zdCBvZ0ltYWdlID0gcGljayhwcm9jZXNzLmVudi5WSVRFX1NFT19PR19JTUFHRSwgcHJvY2Vzcy5lbnYuU0VPX09HX0lNQUdFKSB8fCBERUZBVUxUUy5vZ0ltYWdlO1xyXG4gICAgICBjb25zdCBjYW5vbmljYWwgPSBwaWNrKHByb2Nlc3MuZW52LlZJVEVfU0VPX0NBTk9OSUNBTCwgcHJvY2Vzcy5lbnYuU0VPX0NBTk9OSUNBTF9VUkwpIHx8IERFRkFVTFRTLmNhbm9uaWNhbDtcclxuXHJcbiAgICAgIGxldCBvdXQgPSBodG1sO1xyXG4gICAgICBvdXQgPSBvdXQucmVwbGFjZSgvPHRpdGxlPltePF0qPFxcL3RpdGxlPi8sIGA8dGl0bGU+JHtlc2NBdHRyKHRpdGxlKX08L3RpdGxlPmApO1xyXG4gICAgICBvdXQgPSBvdXQucmVwbGFjZShcclxuICAgICAgICAvKDxtZXRhXFxzK25hbWU9XCJkZXNjcmlwdGlvblwiXFxzK2NvbnRlbnQ9XCIpW15cIl0qKFwiKS9pLFxyXG4gICAgICAgIGAkMSR7ZXNjQXR0cihkZXNjcmlwdGlvbil9JDJgLFxyXG4gICAgICApO1xyXG4gICAgICBvdXQgPSBvdXQucmVwbGFjZShcclxuICAgICAgICAvKDxtZXRhIG5hbWU9XCJhcHBsaWNhdGlvbi1uYW1lXCIgY29udGVudD1cIilbXlwiXSooXCIpLyxcclxuICAgICAgICBgJDEke2VzY0F0dHIoc2l0ZU5hbWUpfSQyYCxcclxuICAgICAgKTtcclxuICAgICAgb3V0ID0gb3V0LnJlcGxhY2UoLyg8bWV0YSBwcm9wZXJ0eT1cIm9nOnNpdGVfbmFtZVwiIGNvbnRlbnQ9XCIpW15cIl0qKFwiKS8sIGAkMSR7ZXNjQXR0cihzaXRlTmFtZSl9JDJgKTtcclxuICAgICAgb3V0ID0gb3V0LnJlcGxhY2UoLyg8bWV0YSBwcm9wZXJ0eT1cIm9nOnRpdGxlXCIgY29udGVudD1cIilbXlwiXSooXCIpLywgYCQxJHtlc2NBdHRyKHRpdGxlKX0kMmApO1xyXG4gICAgICBvdXQgPSBvdXQucmVwbGFjZShcclxuICAgICAgICAvKDxtZXRhIHByb3BlcnR5PVwib2c6ZGVzY3JpcHRpb25cIiBjb250ZW50PVwiKVteXCJdKihcIikvLFxyXG4gICAgICAgIGAkMSR7ZXNjQXR0cihkZXNjcmlwdGlvbil9JDJgLFxyXG4gICAgICApO1xyXG4gICAgICBvdXQgPSBvdXQucmVwbGFjZSgvKDxtZXRhIHByb3BlcnR5PVwib2c6dXJsXCIgY29udGVudD1cIilbXlwiXSooXCIpLywgYCQxJHtlc2NBdHRyKGNhbm9uaWNhbCl9JDJgKTtcclxuICAgICAgb3V0ID0gb3V0LnJlcGxhY2UoLyg8bWV0YSBwcm9wZXJ0eT1cIm9nOmltYWdlXCIgY29udGVudD1cIilbXlwiXSooXCIpLywgYCQxJHtlc2NBdHRyKG9nSW1hZ2UpfSQyYCk7XHJcbiAgICAgIG91dCA9IG91dC5yZXBsYWNlKC8oPG1ldGEgbmFtZT1cInR3aXR0ZXI6dGl0bGVcIiBjb250ZW50PVwiKVteXCJdKihcIikvLCBgJDEke2VzY0F0dHIodGl0bGUpfSQyYCk7XHJcbiAgICAgIG91dCA9IG91dC5yZXBsYWNlKFxyXG4gICAgICAgIC8oPG1ldGEgbmFtZT1cInR3aXR0ZXI6ZGVzY3JpcHRpb25cIiBjb250ZW50PVwiKVteXCJdKihcIikvLFxyXG4gICAgICAgIGAkMSR7ZXNjQXR0cihkZXNjcmlwdGlvbil9JDJgLFxyXG4gICAgICApO1xyXG4gICAgICBvdXQgPSBvdXQucmVwbGFjZSgvKDxtZXRhIG5hbWU9XCJ0d2l0dGVyOmltYWdlXCIgY29udGVudD1cIilbXlwiXSooXCIpLywgYCQxJHtlc2NBdHRyKG9nSW1hZ2UpfSQyYCk7XHJcbiAgICAgIG91dCA9IG91dC5yZXBsYWNlKC8oPGxpbmsgcmVsPVwiY2Fub25pY2FsXCIgaHJlZj1cIilbXlwiXSooXCIpLywgYCQxJHtlc2NBdHRyKGNhbm9uaWNhbCl9JDJgKTtcclxuXHJcbiAgICAgIC8vIEpTT04tTEQgYmxvY2tzIGluIGluZGV4Lmh0bWxcclxuICAgICAgb3V0ID0gb3V0LnJlcGxhY2UoL1wibmFtZVwiOiBcIlNjaGlwICYgU3RlclwiL2csIGBcIm5hbWVcIjogXCIke2VzY0pzb24oc2l0ZU5hbWUpfVwiYCk7XHJcbiAgICAgIG91dCA9IG91dC5yZXBsYWNlKFxyXG4gICAgICAgIC9cImRlc2NyaXB0aW9uXCI6IFwiU2hvcCBpbmRvb3IgJiBvdXRkb29yIGxpZ2h0aW5nW15cIl0qXCIvLFxyXG4gICAgICAgIGBcImRlc2NyaXB0aW9uXCI6IFwiJHtlc2NKc29uKGRlc2NyaXB0aW9uKX1cImAsXHJcbiAgICAgICk7XHJcbiAgICAgIG91dCA9IG91dC5yZXBsYWNlKC9cImltYWdlXCI6IFwiaHR0cHM6XFwvXFwvc2NoaXBlbnN0ZXIuY29tXFwvb2ctaW1hZ2UucG5nXCIvZywgYFwiaW1hZ2VcIjogXCIke2VzY0pzb24ob2dJbWFnZSl9XCJgKTtcclxuXHJcbiAgICAgIHJldHVybiBvdXQ7XHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzVixTQUFTLG9CQUFvQjtBQUNuWCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVOzs7QUNBakIsSUFBTSxXQUFXO0FBQUEsRUFDZixPQUFPO0FBQUEsRUFDUCxhQUNFO0FBQUEsRUFDRixTQUFTO0FBQUEsRUFDVCxXQUFXO0FBQ2I7QUFFQSxTQUFTLFFBQVEsUUFBMkM7QUFDMUQsYUFBVyxLQUFLLFFBQVE7QUFDdEIsUUFBSSxHQUFHLEtBQUssRUFBRyxRQUFPLEVBQUUsS0FBSztBQUFBLEVBQy9CO0FBQ0EsU0FBTztBQUNUO0FBRUEsU0FBUyxRQUFRLE9BQXVCO0FBQ3RDLFNBQU8sTUFDSixRQUFRLE1BQU0sT0FBTyxFQUNyQixRQUFRLE1BQU0sUUFBUSxFQUN0QixRQUFRLE1BQU0sTUFBTSxFQUNwQixRQUFRLE1BQU0sTUFBTTtBQUN6QjtBQUVBLFNBQVMsUUFBUSxPQUF1QjtBQUN0QyxTQUFPLE1BQU0sUUFBUSxPQUFPLE1BQU0sRUFBRSxRQUFRLE1BQU0sS0FBSztBQUN6RDtBQUdPLFNBQVMsZ0JBQXdCO0FBQ3RDLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLG1CQUFtQixNQUFNO0FBQ3ZCLFlBQU0sV0FBVyxLQUFLLFFBQVEsSUFBSSxvQkFBb0IsUUFBUSxJQUFJLGFBQWEsS0FBSztBQUNwRixZQUFNLFFBQVEsS0FBSyxRQUFRLElBQUksZ0JBQWdCLFFBQVEsSUFBSSxpQkFB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
