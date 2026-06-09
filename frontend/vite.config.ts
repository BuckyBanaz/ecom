import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
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
          if (
            id.includes("@fortawesome/free-solid-svg-icons") &&
            !/\/fa[A-Z][A-Za-z0-9-]*\.js/.test(id)
          ) {
            return "fontawesome-full";
          }
          if (
            id.includes("@fortawesome/free-brands-svg-icons") &&
            !/\/fa[A-Z][A-Za-z0-9-]*\.js/.test(id)
          ) {
            return "fontawesome-full";
          }
          if (id.includes("firebase")) return "firebase";
          if (id.includes("lucide-react")) return "lucide";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("@radix-ui")) return "radix-ui";
          if (id.includes("i18next") || id.includes("react-i18next")) return "i18n";
          if (id.includes("react-dom") || id.includes("react-router")) return "react-vendor";
          if (id.includes("@tanstack")) return "query";

          return "vendor";
        },
      },
    },
  },
}));
