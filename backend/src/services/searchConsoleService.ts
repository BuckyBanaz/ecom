import { google } from "googleapis";
import { AppError } from "../middlewares/errorMiddleware";
import {
  getGoogleServiceAccountCredentials,
  getGscSiteUrl,
  getGscSiteUrlCandidates,
  getGoogleIntegrationStatus,
} from "../utils/googleCredentials";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

async function resolveSearchConsoleSiteUrl(
  client: ReturnType<typeof google.searchconsole>,
): Promise<string> {
  const candidates = getGscSiteUrlCandidates();
  if (candidates.length === 0) {
    throw new AppError(
      "Search Console not configured — set GSC site URL and GA4 service account credentials in CMS → SEO → Site & Analytics.",
      400,
    );
  }

  let lastError: unknown;
  for (const siteUrl of candidates) {
    try {
      await client.sites.get({ siteUrl });
      return siteUrl;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Search Console connection failed");
}

function getSearchConsoleClient() {
  const creds = getGoogleServiceAccountCredentials();
  if (!creds || !getGscSiteUrl()) {
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

  return { client: google.searchconsole({ version: "v1", auth }) };
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
  const integration = getGoogleIntegrationStatus();
  const base = {
    configured: integration.gscReady,
    siteUrl: integration.siteUrl,
    hasCredentials: integration.hasCredentials,
    hasSiteUrl: integration.hasSiteUrl,
    gscSiteUrlExplicit: integration.gscSiteUrlExplicit,
    connected: false as boolean,
    error: null as string | null,
  };

  if (!integration.hasCredentials) {
    return {
      ...base,
      error: "Add GA4 service account email and private key in Site & Analytics (same as Admin → Analytics).",
    };
  }

  if (!integration.hasSiteUrl) {
    return {
      ...base,
      error: "Set Search Console site URL in Site & Analytics (e.g. https://schipenster.com/ or sc-domain:schipenster.com).",
    };
  }

  if (!integration.gscSiteUrlExplicit) {
    base.error =
      "Using canonical URL as GSC site — set an explicit Search Console site URL in Site & Analytics if this property does not match.";
  }

  try {
    const { client } = getSearchConsoleClient();
    const siteUrl = await resolveSearchConsoleSiteUrl(client);
    return { ...base, configured: true, siteUrl, connected: true, error: null };
  } catch (err: unknown) {
    let message = err instanceof Error ? err.message : "Search Console connection failed";
    const creds = getGoogleServiceAccountCredentials();
    if (message.includes("not a verified Search Console site") && creds?.clientEmail) {
      message = `${message} Add ${creds.clientEmail} as a Full user on the schipenster.com property in Search Console → Settings → Users and permissions.`;
    }
    return { ...base, configured: integration.gscReady, connected: false, error: message };
  }
}

export async function fetchSearchConsoleOverview(days = 28) {
  const { client } = getSearchConsoleClient();
  const siteUrl = await resolveSearchConsoleSiteUrl(client);
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

  const { client } = getSearchConsoleClient();
  const siteUrl = await resolveSearchConsoleSiteUrl(client);
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
