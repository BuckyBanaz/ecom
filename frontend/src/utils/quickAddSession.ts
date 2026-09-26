const SESSION_KEY = "admin_quick_add_session";

export type StoredRow = {
  key: string;
  hint: string;
  price: string;
  brand: string;
  imagePreview: string | null;
};

export type StoredProgress = {
  status: string;
  error?: string;
  draftId?: string;
  productName?: string;
  duplicateWarning?: boolean;
  existingMatches?: Array<{ id: string; name: string; slug: string; image: string; price: number }>;
};

export type QuickAddSession = {
  rows: StoredRow[];
  imagePromptOverride: string;
  rowProgress: Record<string, StoredProgress>;
  batchSummary: { ok: number; failed: number; total: number } | null;
  isProcessing?: boolean;
  interrupted?: boolean;
  savedAt: number;
};

export function sanitizeSession(parsed: QuickAddSession): QuickAddSession {
  const age = Date.now() - (parsed.savedAt || 0);
  const progress = parsed.rowProgress || {};
  const rowKeys = Object.keys(progress);

  const allTerminal =
    rowKeys.length > 0 &&
    rowKeys.every((k) => ["done", "failed"].includes(progress[k]?.status));

  // If all rows are finished or session is > 12s old without active generator, batch is done
  if (allTerminal || age > 12000) {
    parsed.isProcessing = false;
    rowKeys.forEach((k) => {
      if (["queued", "analyzing", "images", "saving"].includes(progress[k]?.status)) {
        if (progress[k]?.draftId) {
          progress[k].status = "done";
        } else {
          progress[k].status = "failed";
          progress[k].error = progress[k].error || "Batch completed";
        }
      }
    });
  }

  const ok = rowKeys.filter((k) => progress[k]?.status === "done").length;
  const failed = rowKeys.filter((k) => progress[k]?.status === "failed").length;
  if (rowKeys.length > 0) {
    parsed.batchSummary = { ok, failed, total: rowKeys.length };
  }

  return parsed;
}

export function loadQuickAddSession(): QuickAddSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    let parsed = JSON.parse(raw) as QuickAddSession;
    if (!parsed?.rows?.length) return null;

    const age = Date.now() - (parsed.savedAt || 0);

    // If batch has finished or is not actively generating within last 12s, clear and start clean
    if (parsed.batchSummary || !parsed.isProcessing || age > 12000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    parsed = sanitizeSession(parsed);

    if (!parsed.isProcessing) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveQuickAddSession(data: Omit<QuickAddSession, "savedAt">) {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...data, savedAt: Date.now() }),
    );
  } catch (err: any) {
    if (err.name === "QuotaExceededError" || err.message.includes("quota")) {
      // If quota exceeded (due to large base64 images), try saving without images
      // to prevent restoring stale/wrong images on refresh.
      try {
        const textOnlyData = {
          ...data,
          rows: data.rows.map(r => ({ ...r, imagePreview: null }))
        };
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ ...textOnlyData, savedAt: Date.now() }),
        );
      } catch {
        /* ignore */
      }
    }
  }
}

export function clearQuickAddSession() {
  localStorage.removeItem(SESSION_KEY);
}

/** Restore a File from session-stored data URL (imageFile is not persisted). */
export function fileFromDataUrl(dataUrl: string, filename = "product.jpg"): File | null {
  if (!dataUrl.startsWith("data:")) return null;
  try {
    const [header, base64] = dataUrl.split(",");
    if (!base64) return null;
    const mime = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  } catch {
    return null;
  }
}
