# 🧠 Work Memory Log — Antigravity Agent

This file documents the technical memory, files changed, and integration details for the SEO proxy fixes, sitemap hooks, duplicate media cleanup, and product edit lightbox zoom implemented in **v0.6**.

---

## 🔑 Files Modified

### Backend:
1. **[Caddyfile](file:///c:/Users/Parikshit/Desktop/workspace/ecom/Caddyfile)**: Rewrote bot matching regex and static asset exceptions.
2. **[seoPrerender.ts](file:///c:/Users/Parikshit/Desktop/workspace/ecom/backend/src/middlewares/seoPrerender.ts)**: Implemented escaping, dynamic hostnames, dynamic relief page mappings, and fixed Prisma field typo (`seoDesc`).
3. **[adminSettingsController.ts](file:///c:/Users/Parikshit/Desktop/workspace/ecom/backend/src/controllers/adminSettingsController.ts)**: Refactored sitemap logic and added `/relief/:slug` dynamic paths mapping.
4. **[index.ts](file:///c:/Users/Parikshit/Desktop/workspace/ecom/backend/src/index.ts)**: Hooked `rebuildSitemap()` on boot.
5. **[mediaController.ts](file:///c:/Users/Parikshit/Desktop/workspace/ecom/backend/src/controllers/mediaController.ts)**: Added recursive MD5 hash duplicate finder and database references updater.
6. **[mediaRoutes.ts](file:///c:/Users/Parikshit/Desktop/workspace/ecom/backend/src/routes/mediaRoutes.ts)**: Registered `DELETE /api/v1/media/duplicates` route.
7. **[aiService.ts](file:///c:/Users/Parikshit/Desktop/workspace/ecom/backend/src/services/aiService.ts)**: Added `regenerateImagesForProduct` to support AI image regeneration for saved products.
8. **[aiRoutes.ts](file:///c:/Users/Parikshit/Desktop/workspace/ecom/backend/src/routes/aiRoutes.ts)**: Added `POST /api/v1/ai/products/:id/regenerate-images` route.

### Frontend:
1. **[index.html](file:///c:/Users/Parikshit/Desktop/workspace/ecom/frontend/index.html)**: Added default social metadata and normalized description tag.
2. **[vite-plugin-inject-seo.ts](file:///c:/Users/Parikshit/Desktop/workspace/ecom/frontend/vite-plugin-inject-seo.ts)**: Made build-time description replacement regex-resilient.
3. **[apiClient.ts](file:///c:/Users/Parikshit/Desktop/workspace/ecom/frontend/src/client/apiClient.ts)**: Registered `mediaRepository.deleteDuplicates()` API call.
4. **[locales/en/translation.json](file:///c:/Users/Parikshit/Desktop/workspace/ecom/frontend/src/locales/en/translation.json)**: Added English translation keys for media duplicate cleanup.
5. **[locales/nl/translation.json](file:///c:/Users/Parikshit/Desktop/workspace/ecom/frontend/src/locales/nl/translation.json)**: Added Dutch translation keys for media duplicate cleanup.
6. **[MediaLibraryCore.tsx](file:///c:/Users/Parikshit/Desktop/workspace/ecom/frontend/src/components/admin/media/MediaLibraryCore.tsx)**: Added Delete Duplicates action item under the Actions dropdown toolbar.
7. **[AdminProductForm.tsx](file:///c:/Users/Parikshit/Desktop/workspace/ecom/frontend/src/pages/admin/AdminProductForm.tsx)**: Implemented fullscreen zoomable lightbox preview modal, and enabled Sparkles regenerate buttons on both draft and saved product pages (canRegenerate condition).
8. **[AdminProductQuickAdd.tsx](file:///c:/Users/Parikshit/Desktop/workspace/ecom/frontend/src/pages/admin/AdminProductQuickAdd.tsx)**: Integrated the MediaLibraryDialog picker to let users select product images from the storage library.

---

## 🛠️ Feature Overview & Logic

### 1. Bot Prerendering and Proxy
- **Caddybot Named Matcher**: Caddy matches request headers using standard `header_regexp` matching. Multiple UA lines are combined in a regex OR: `(?i)(googlebot|bingbot|yandex|baiduspider|twitterbot|facebookexternalhit|rogerbot|linkedinbot|embedly|quora\ link\ preview|showyoubot|outbrain|pinterest\/0\.|pinterestbot|slackbot|vkShare|W3C_Validator)`.
- **Static Assets Exclusions**: Requests ending with standard file extensions (`.js`, `.css`, `.png`, etc.) bypass the bot check and are routed directly to Nginx.
- **Dynamic Meta Lookup**: When crawlers request a `/relief/:slug` or `/blogs/:slug` or `/product/:slug` path:
  - It resolves the slug and queries database tables.
  - Corrects the typo in `cmsPage` from `seoDescription` (bugged) to `seoDesc` (Postgres database schema representation).
  - Queries `CmsConfig` key `"landing_pages_data"` for CMS MegaMenu category landing pages and extracts dynamic metadata.

### 2. Sitemap Generation
- Generates `sitemap.xml` automatically if it is missing on server boot.
- Fetches all active products, categories, blogs, static pages, published CMS pages, and all landing page keys under `landing_pages_data`.
- Appends all items to a structured `<urlset>` with customized priorities (`1.0` for home, `0.9` for products, `0.8` for categories, `0.7` for blogs/relief pages, `0.6` for general pages) and saves it to the persistent uploads folder `/app/seo/sitemap.xml`.

### 3. Duplicate Media Deletion
- Recursively scans the `/public/uploads/` directory on disk.
- Groups all files by MD5 checksum.
- Keeps the oldest file (`mtimeMs` ascending sort) as the original source of truth.
- For all duplicate paths, scans and updates references in the PostgreSQL database:
  - `Product`: `image` and `images` (array search and replace).
  - `Category`: `image`.
  - `Blog`: `cover`.
  - `CmsPage`: `seoImage`.
  - `User`: `avatar`.
  - `Review`: `images` (array search and replace).
- Deletes the duplicate file from the server disk and returns metrics.

### 4. Interactive Lightbox Preview
- Product form cover photo and gallery thumbnails have a **Maximize** overlay button.
- Clicking the button loads the image in a dark background overlay modal (`Dialog`).
- Round action icons allow zoom-in (+25% steps up to 300%), zoom-out (-25% steps down to 50%), and reset (back to 100%) with smooth transitions.

---

## 🧪 Testing and Verification

### GSC & Sitemap
1. Open GSC and enter the target URL under the URL Inspection tool.
2. Select **TEST LIVE URL** to verify Googlebot hits the live Caddyfile routing and picks up the correct user-specified canonical path.
3. Validate `/sitemap.xml` returns a `200 OK` with valid XML structure.

### Duplicate Media Deletion
- Call `DELETE /api/v1/media/duplicates` (or via Admin -> Storage -> Actions -> Delete Duplicate Photos).
- Confirm files are deleted and the response contains `dbReferencesUpdated` and `bytesSaved`.

### Zoomable Lightbox
- Go to Admin -> Products -> Edit Product.
- Click the top-left Zoom button on the Cover Image or any Gallery thumbnail to verify scale rendering.

### AI Quick Add Media Selector
- Go to Admin -> Products -> Quick Add.
- Click the "Media Library" button in any row, select an image, and verify it is successfully loaded into the row and previewed correctly.

### Saved Product Image Regeneration
- Go to Admin -> Products -> Edit Product (on a saved/published product page).
- Verify the **Regenerate AI Images** button is visible in the Gallery header, and **Sparkles** icons are visible on hover over gallery images.
- Click the regenerate icon, provide an AI prompt, and confirm the new AI photo is generated and instantly loaded/saved.
