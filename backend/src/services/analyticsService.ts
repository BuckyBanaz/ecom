import { AppError } from "../middlewares/errorMiddleware";

/** GA4 Data API client + property, or null when the credentials are not configured */
function getGa4Client(): { client: any; property: string } | null {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  let privateKey = process.env.GA4_PRIVATE_KEY?.trim() || "";

  if (!propertyId || !clientEmail || !privateKey) {
    return null; // Return null if keys are not configured
  }

  // 1. Remove wrapping quotes
  privateKey = privateKey.replace(/^["']|["']$/g, "");
  
  // 2. Reconstruct the PEM format completely
  const beginMarker = "-----BEGIN PRIVATE KEY-----";
  const endMarker = "-----END PRIVATE KEY-----";

  if (privateKey.includes(beginMarker) && privateKey.includes(endMarker)) {
    // Extract base64 payload
    let base64 = privateKey.substring(
      privateKey.indexOf(beginMarker) + beginMarker.length,
      privateKey.indexOf(endMarker)
    );
    // Remove all whitespace, actual newlines, and literal '\n' sequences
    base64 = base64.replace(/\s/g, "").replace(/\\n/g, "").replace(/\\/g, "");
    
    // Split into 64-char chunks
    const chunks = base64.match(/.{1,64}/g) || [];
    privateKey = `${beginMarker}\n${chunks.join("\n")}\n${endMarker}\n`;
  } else {
    // Fallback if missing markers
    privateKey = privateKey.replace(/\\+n/g, "\n").trim();
  }

  // Dynamically require to prevent server crash if module is not installed yet
  const { BetaAnalyticsDataClient } = require("@google-analytics/data");
  const client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
  return { client, property: `properties/${propertyId}` };
}

const toInt = (v: unknown) => parseInt(String(v ?? "0"), 10) || 0;

/** "(not set)" rows are GA4's bucket for visitors it could not place */
const geoRows = (report: any, withCountry: boolean) =>
  (report?.rows || []).map((row: any) => {
    const d = row.dimensionValues || [];
    return {
      name: d[0]?.value || "(not set)",
      ...(withCountry ? { country: d[1]?.value || "", countryCode: d[2]?.value || "" } : { countryCode: d[1]?.value || "" }),
      users: toInt(row.metricValues?.[0]?.value),
      ...(row.metricValues?.[1] ? { sessions: toInt(row.metricValues[1].value) } : {}),
    };
  });

/**
 * Service to fetch analytics data from Google Analytics 4 using the Google Analytics Data API v1.
 */
export const getGA4Data = async () => {
  try {
    const ga = getGa4Client();
    if (!ga) return null;
    const analyticsDataClient = ga.client;

    // Query for multiple reports in parallel (a batch holds at most 5 reports, so geo runs as a second batch)
    const geoBatch = analyticsDataClient.batchRunReports({
      property: ga.property,
      requests: [
        {
          // 0: Visitors by country
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "country" }, { name: "countryId" }],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 15,
        },
        {
          // 1: Visitors by city
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "city" }, { name: "country" }, { name: "countryId" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 15,
        },
      ],
    });
    const mainBatch = analyticsDataClient.batchRunReports({
      property: ga.property,
      requests: [
        {
          // 0: Daily Traffic
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        },
        {
          // 1: Traffic Sources
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "activeUsers" }],
        },
        {
          // 2: Device Breakdown
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "activeUsers" }],
        },
        {
          // 3: Top Pages
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }, { name: "bounceRate" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 5,
        }
      ]
    });
    const [[batchResponse], [geoResponse]] = await Promise.all([mainBatch, geoBatch]);

    const trafficReport = batchResponse.reports?.[0];
    const sourcesReport = batchResponse.reports?.[1];
    const devicesReport = batchResponse.reports?.[2];
    const pagesReport = batchResponse.reports?.[3];

    // Transform Daily Traffic
    const trafficData = trafficReport?.rows?.map((row: any) => {
      const dateStr = row.dimensionValues?.[0]?.value || "";
      let formattedDate = dateStr;
      if (dateStr.length === 8) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const dateObj = new Date(`${year}-${month}-${day}`);
        formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      }
      return {
        date: formattedDate,
        pageViews: parseInt(row.metricValues?.[0]?.value || "0", 10),
        visitors: parseInt(row.metricValues?.[1]?.value || "0", 10),
      };
    }) || [];

    const colors = ["#10b981", "#3b82f6", "#f43f5e", "#f59e0b", "#8b5cf6", "#6366f1", "#14b8a6"];

    // Transform Traffic Sources
    const sourceData = sourcesReport?.rows?.map((row: any, i: number) => ({
      name: row.dimensionValues?.[0]?.value || "Unknown",
      value: parseInt(row.metricValues?.[0]?.value || "0", 10),
      color: colors[i % colors.length]
    })) || [];

    // Transform Devices
    const deviceData = devicesReport?.rows?.map((row: any, i: number) => ({
      name: row.dimensionValues?.[0]?.value || "Unknown",
      value: parseInt(row.metricValues?.[0]?.value || "0", 10),
      color: colors[(i + 2) % colors.length]
    })) || [];

    // Transform Top Pages
    const topPagesData = pagesReport?.rows?.map((row: any) => ({
      path: row.dimensionValues?.[0]?.value || "/",
      views: parseInt(row.metricValues?.[0]?.value || "0", 10).toLocaleString(),
      bounceRate: (parseFloat(row.metricValues?.[1]?.value || "0") * 100).toFixed(0) + "%"
    })) || [];

    return {
      traffic: trafficData,
      sources: sourceData,
      devices: deviceData,
      topPages: topPagesData,
      countries: geoRows(geoResponse.reports?.[0], false),
      cities: geoRows(geoResponse.reports?.[1], true),
    };
  } catch (error: any) {
    console.error("GA4 Analytics Error:", error);
    throw new AppError("Failed to fetch analytics from Google.", 500);
  }
};

/**
 * Visitors on the site right now (GA4 realtime = last 30 minutes), by country and city.
 * Returns null when GA4 is not configured.
 */
export const getGA4Realtime = async () => {
  try {
    const ga = getGa4Client();
    if (!ga) return null;
    const [[byCountry], [byCity], [total]] = await Promise.all([
      ga.client.runRealtimeReport({
        property: ga.property,
        dimensions: [{ name: "country" }, { name: "countryId" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 15,
      }),
      ga.client.runRealtimeReport({
        property: ga.property,
        dimensions: [{ name: "city" }, { name: "country" }, { name: "countryId" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 15,
      }),
      // without dimensions: the de-duplicated total (summing country rows can double count)
      ga.client.runRealtimeReport({ property: ga.property, metrics: [{ name: "activeUsers" }] }),
    ]);
    return {
      activeUsers: toInt(total?.rows?.[0]?.metricValues?.[0]?.value),
      countries: geoRows(byCountry, false),
      cities: geoRows(byCity, true),
      fetchedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("GA4 Realtime Error:", error?.message || error);
    throw new AppError("Failed to fetch realtime analytics from Google.", 500);
  }
};
