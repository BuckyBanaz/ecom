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
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // Only split very large optional deps. Do NOT split react/react-dom —
          // that causes "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED" crashes.
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
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
        },
      },
    },
  },
}));
