import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

const CHUNK_RELOAD_KEY = "chunk-reload-once";

function isChunkLoadFailure(message: string): boolean {
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Loading chunk") ||
    message.includes("Loading CSS chunk")
  );
}

function reloadOnceForStaleChunks(): void {
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
}

if (import.meta.env.PROD) {
  window.addEventListener("vite:preloadError", reloadOnceForStaleChunks);

  window.addEventListener(
    "error",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "SCRIPT") {
        reloadOnceForStaleChunks();
        return;
      }
      if (isChunkLoadFailure(event.message || "")) {
        reloadOnceForStaleChunks();
      }
    },
    true,
  );

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      typeof reason === "string" ? reason : (reason as Error | undefined)?.message || "";
    if (isChunkLoadFailure(message)) {
      reloadOnceForStaleChunks();
    }
  });

  window.addEventListener("load", () => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
