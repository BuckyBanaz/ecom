# Analytics Integration Guide

This document explains how to set up real-time analytics data fetching in the Admin Dashboard for Google Analytics 4, Meta Pixel, and TikTok Pixel.

---

## 1. Google Analytics 4 (GA4) Real-Time Dashboard Integration

> [!IMPORTANT]
> **Measurement ID vs. Property ID: What's the difference?**
> Google Analytics uses two different IDs for different purposes. Please ensure you put the correct ID in the correct place:
>
> 1. **Measurement ID (`G-XXXXXXXXXX`)**: This goes in **Admin > Settings > SEO & Analytics**. It is injected into your website's frontend to track visitor traffic.
> 2. **Property ID (`123456789`)**: This goes in **Admin > Analytics Dashboard > Configure API Keys**. It is used by the backend to fetch reports and show the live graph.

To display live traffic data on the Admin Analytics dashboard, the backend uses the `@google-analytics/data` SDK. This requires a Google Cloud Service Account.

### Step 1: Create a Service Account in Google Cloud
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select your existing one.
3. In the search bar at the top, type **Google Analytics Data API** and click on it. Click **Enable**.
4. Go to **IAM & Admin > Service Accounts** from the left menu.
5. Click **+ CREATE SERVICE ACCOUNT**. Give it a name (e.g., `analytics-proxy`) and click **Create and Continue**, then **Done**.
6. You will see the new Service Account listed with an email address (e.g., `analytics-proxy@your-project-id.iam.gserviceaccount.com`). **Copy this Email Address**, this is your `GA4 Client Email`.

### Step 2: Generate the Private Key
1. Click on the Service Account you just created.
2. Go to the **KEYS** tab at the top.
3. Click **ADD KEY** > **Create new key**.
4. Choose **JSON** format and click **Create**.
5. A `.json` file will download to your computer. Open it in a text editor.
6. Inside the file, look for the `"private_key"` field. It looks like this: `-----BEGIN PRIVATE KEY-----\nMIIEvgIB...\n-----END PRIVATE KEY-----\n`.
7. **Copy this entire string**. This is your `GA4 Private Key`.

### Step 3: Give the Service Account Permission to Read Analytics
Your new Service Account needs permission to view your GA4 data.

1. Go to [Google Analytics](https://analytics.google.com/).
2. Click the **Admin** gear icon in the bottom left.
3. Under the **Property** column, click **Property Access Management**.
4. Click the blue **+** button in the top right and select **Add users**.
5. Paste the Service Account Email (from Step 1).
6. Select **Viewer** role.
7. Click **Add**.

### Step 4: Get your GA4 Property ID
1. Still in the Google Analytics **Admin** panel, under the **Property** column, click **Property Settings**.
2. Look for the **Property ID** in the top right (it's a 9-digit number like `351234567`).
3. **Copy this number**. This is your `GA4 Property ID`.

### Step 5: Configure in Admin Panel
1. Go to `Admin Panel > Analytics`.
2. Click on **Configure API Keys**.
3. Input your `GA4 Property ID`, `GA4 Client Email`, and `GA4 Private Key`.
4. The dashboard will automatically fetch real-time data upon saving.

---

## 2. Meta Pixel & TikTok Integration (Coming Soon)

Currently, Meta Pixel and TikTok integration are designed to inject tracking scripts into the user's frontend. Fetching real-time Ads reporting into the backend Dashboard requires separate API implementations:

- **Meta (Facebook)**: Requires a System User Access Token and the Meta Marketing API.
- **TikTok**: Requires a TikTok Ads Developer App and the TikTok Marketing API token.

*Documentation for these will be added when their backend data fetching services are fully integrated.*
