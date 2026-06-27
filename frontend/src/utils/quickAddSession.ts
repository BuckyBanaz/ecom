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
};

export type QuickAddSession = {
  rows: StoredRow[];
  imagePromptOverride: string;
  rowProgress: Record<string, StoredProgress>;
  batchSummary: { ok: number; failed: number; total: number } | null;
  interrupted?: boolean;
  savedAt: number;
};

export function loadQuickAddSession(): QuickAddSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuickAddSession;
    if (!parsed?.rows?.length) return null;
    // Expire after 24h
    if (Date.now() - (parsed.savedAt || 0) > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveQuickAddSession(data: Omit<QuickAddSession, "savedAt">) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...data, savedAt: Date.now() }),
    );
  } catch {
    /* quota — ignore */
  }
}

export function clearQuickAddSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
