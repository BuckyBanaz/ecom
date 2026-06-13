import { AppError } from "../middlewares/errorMiddleware";

/**
 * Service to fetch real-time analytics data from Google Analytics 4
 * using the Google Analytics Data API v1.
 */
export const getGA4Data = async () => {
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

  try {
    // Dynamically require to prevent server crash if module is not installed yet
    const { BetaAnalyticsDataClient } = require("@google-analytics/data");
    
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });

    // Query for multiple reports in parallel
    const [batchResponse] = await analyticsDataClient.batchRunReports({
      property: `properties/${propertyId}`,
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
      topPages: topPagesData
    };
  } catch (error: any) {
    console.error("GA4 Analytics Error:", error);
    throw new AppError("Failed to fetch analytics from Google.", 500);
  }
};
