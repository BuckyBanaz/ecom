import { google } from "googleapis";
import { AppError } from "../middlewares/errorMiddleware";
import {
  getGoogleServiceAccountCredentials,
  getGscSiteUrl,
  isGoogleApiConfigured,
} from "../utils/googleCredentials";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

function getSearchConsoleClient() {
  const creds = getGoogleServiceAccountCredentials();
  const siteUrl = getGscSiteUrl();
  if (!creds || !siteUrl) {
    throw new AppError(
      "Search Console not configured — set GSC site URL and GA4 service account credentials in CMS → SEO → Site & Analytics.",
      400,
    );
  }

  const auth = new google.auth.JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: [GSC_SCOPE],
  });

  return { client: google.searchconsole({ version: "v1", auth }), siteUrl };
}

function formatGscDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export type GscQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscPageRow = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export async function getSearchConsoleStatus() {
  return {
    configured: isGoogleApiConfigured(),
    siteUrl: getGscSiteUrl(),
    hasCredentials: !!getGoogleServiceAccountCredentials(),
  };
}

export async function fetchSearchConsoleOverview(days = 28) {
  const { client, siteUrl } = getSearchConsoleClient();
  const startDate = formatGscDate(days);
  const endDate = formatGscDate(0);

  const [totalsRes, queriesRes, pagesRes] = await Promise.all([
    client.searchanalytics.query({
      siteUrl,
      requestBody: { startDate, endDate },
    }),
    client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 20,
      },
    }),
    client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: 15,
      },
    }),
  ]);

  const totalRow = totalsRes.data.rows?.[0];
  const totals = {
    clicks: totalRow?.clicks ?? 0,
    impressions: totalRow?.impressions ?? 0,
    ctr: totalRow?.ctr ?? 0,
    position: totalRow?.position ?? 0,
  };

  const topQueries: GscQueryRow[] = (queriesRes.data.rows || []).map((row) => ({
    query: row.keys?.[0] || "",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));

  const topPages: GscPageRow[] = (pagesRes.data.rows || []).map((row) => ({
    page: row.keys?.[0] || "",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));

  return {
    siteUrl,
    period: { startDate, endDate, days },
    totals,
    topQueries,
    topPages,
  };
}

export async function fetchKeywordRankings(keywords: string[], days = 28): Promise<GscQueryRow[]> {
  if (keywords.length === 0) return [];

  const { client, siteUrl } = getSearchConsoleClient();
  const startDate = formatGscDate(days);
  const endDate = formatGscDate(0);

  const response = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: 500,
    },
  });

  const rows = response.data.rows || [];
  const normalized = new Map<string, GscQueryRow>();

  for (const row of rows) {
    const query = (row.keys?.[0] || "").toLowerCase();
    if (!query) continue;
    normalized.set(query, {
      query: row.keys![0],
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    });
  }

  return keywords.map((keyword) => {
    const exact = normalized.get(keyword.toLowerCase());
    if (exact) return exact;

    const partial = [...normalized.values()].find((row) =>
      row.query.toLowerCase().includes(keyword.toLowerCase()) ||
      keyword.toLowerCase().includes(row.query.toLowerCase()),
    );
    if (partial) {
      return { ...partial, query: keyword };
    }

    return {
      query: keyword,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    };
  });
}
