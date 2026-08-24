import { prisma } from "../config/db";
import { getSeoPlaybook } from "./seoPlaybookService";
import { fetchKeywordRankings } from "./searchConsoleService";

export const SEO_RANK_HISTORY_KEY = "seo_rank_history";

export type RankSnapshot = {
  date: string;
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type RankHistory = {
  lastSyncedAt: string | null;
  snapshots: RankSnapshot[];
};

const MAX_SNAPSHOTS = 365;

function parseKeywords(raw: string): string[] {
  return [...new Set(raw.split(",").map((k) => k.trim()).filter(Boolean))];
}

export async function getRankHistory(): Promise<RankHistory> {
  const row = await prisma.cmsConfig.findUnique({ where: { key: SEO_RANK_HISTORY_KEY } });
  const stored = (row?.value || {}) as Partial<RankHistory>;
  return {
    lastSyncedAt: stored.lastSyncedAt ?? null,
    snapshots: Array.isArray(stored.snapshots) ? stored.snapshots : [],
  };
}

export async function syncRankTracking(): Promise<{ synced: number; keywords: string[]; history: RankHistory }> {
  const playbook = await getSeoPlaybook();
  const keywords = parseKeywords(playbook.targetRankKeywords || playbook.globalKeywords);
  if (keywords.length === 0) {
    return { synced: 0, keywords: [], history: await getRankHistory() };
  }

  const rankings = await fetchKeywordRankings(keywords);
  const today = new Date().toISOString().slice(0, 10);
  const history = await getRankHistory();

  const withoutToday = history.snapshots.filter((s) => s.date !== today);
  const todaySnapshots: RankSnapshot[] = rankings.map((row) => ({
    date: today,
    keyword: row.query,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));

  const merged: RankHistory = {
    lastSyncedAt: new Date().toISOString(),
    snapshots: [...withoutToday, ...todaySnapshots]
      .sort((a, b) => b.date.localeCompare(a.date) || a.keyword.localeCompare(b.keyword))
      .slice(0, MAX_SNAPSHOTS),
  };

  await prisma.cmsConfig.upsert({
    where: { key: SEO_RANK_HISTORY_KEY },
    create: { key: SEO_RANK_HISTORY_KEY, value: merged as object },
    update: { value: merged as object },
  });

  return { synced: todaySnapshots.length, keywords, history: merged };
}

export function summarizeRankTrend(snapshots: RankSnapshot[], keyword: string) {
  const rows = snapshots
    .filter((s) => s.keyword.toLowerCase() === keyword.toLowerCase())
    .sort((a, b) => a.date.localeCompare(b.date));

  if (rows.length === 0) {
    return { keyword, latest: null, previous: null, trend: "unknown" as const };
  }

  const latest = rows[rows.length - 1];
  const previous = rows.length > 1 ? rows[rows.length - 2] : null;
  let trend: "up" | "down" | "flat" | "unknown" = "unknown";

  if (previous && latest.position > 0 && previous.position > 0) {
    const delta = previous.position - latest.position;
    if (Math.abs(delta) < 0.3) trend = "flat";
    else if (delta > 0) trend = "up";
    else trend = "down";
  }

  return { keyword, latest, previous, trend };
}
