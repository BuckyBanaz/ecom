# Future Tasks & Implementation Backlog

This document tracks pending advanced features and recently completed work.

---

## ✅ Completed (AI & Shipping)

### Sendcloud Live Labels
- Carrier label generation, shipment creation, tracking webhooks, admin label download
- Admin: `/admin/orders/labels`, `/admin/orders/ready-to-ship`
- API: `/api/v1/shipping`

### AI Product Quick Add
- **Admin UI**: `/admin/products/quick-add` (single + bulk), `/admin/products/drafts`
- **API**: `POST /api/v1/ai/products/quick-add`, `POST /api/v1/ai/products/bulk-quick-add`
- Upload photo + short hint → Gemini extracts name, description, attributes, SEO, category
- Generates lifestyle gallery images from reference photo (Gemini image-to-image)
- Saves to `ProductDraft` model; publish flow via `AdminProductForm`
- Config: Admin → Settings → AI (`GOOGLE_API_KEY`, `AI_MODEL`, `AI_IMAGE_COUNT`, etc.)

### AI CMS Coder
- **Admin UI**: Sparkles button in `RichTextEditor` (CMS pages, legal pages, blogs)
- **API**: `POST /api/v1/ai/cms/generate`
- Prompt → HTML fragment with shortcodes + inline styles + SEO meta (title, desc, keywords)
- Edit mode: preserves existing page content and applies targeted updates
- Backend: `backend/src/utils/cmsAiContent.ts` (prompt rules + HTML sanitization)
- Full CMS context injected automatically for smarter page generation

### Returns & Refunds + AI Triage
- **Customer UI**: `/dashboard` → delivered order → "Request Return" (reason + photos, 30 days from delivery)
- **Admin UI**: `/admin/orders/returns` — tabs: Pending / Approved / Awaiting / **Received — Refund Pending** / Completed / Rejected
- **Payment Refunds**: `/admin/orders/refunds` — pending (no Stripe ID) + processed list
- **API**: `/api/v1/returns` — approve **without** refund; label; receive; manual refund; see `brain/04_api_reference.md`
- **Refund timing**: Stripe refund **after** warehouse receive (webhook `-RET` status 11, admin mark received, or manual)
- **DB**: `ReturnRequest` model + `orders.deliveredAt`; order → `return_requested` → `returned` + `paymentStatus: refunded`
- **Docs**: `docs/shipping-and-refund/` (flows, policies, customer UI)
- **Test**: `backend/scripts/reset-order-for-return-test.js`, `backend/scripts/test-return-flow-audit.js`

### Returns Polish + Dual Validation (✅ done)
- **30-day window pre-check (frontend)**: `getReturnEligibility()` hides button + shows expiry message before API call
- **Shared validation utils**: `frontend/src/utils/returnValidation.ts` + `backend/src/utils/returnValidation.ts`
- **Backend enforces** (even if frontend bypassed): delivered status, window, active return, reason, photos (1–5, JPEG/PNG/WebP/GIF), note length (2000), shipment weight (0.01–30 kg)
- **Sendcloud return label**: optimistic DB claim → Sendcloud API → transactional save; rollback + cancel orphan parcel on failure; 409 on concurrent label creation
- **Concurrent refund lock**: `SELECT … FOR UPDATE` + `refund_processing` flag before Stripe; 409 on double manual refund

### AI SEO Expert (v0.1 — branch `v0.1`, implemented locally)
- **Admin UI**: unified **SEO & AI Expert** at `/admin/cms/seo` (merged old `/admin/ai-seo` → redirect)
- **Panels**: Site audit, playbook (target keywords), per-page optimize, bulk optimize, autopilot, background job banner
- **Settings tab**: SEO Autopilot config + hourly check in `backend/src/index.ts`
- **AI Blog writer**: `/admin/cms/blogs` — topic suggestions from offers/products/price drops; Gemini cover (WebP compressed)
- **AI FAQ writer**: `/admin/cms/faqs` — full CMS context
- **Background job queue**: `seoJobQueueService.ts` — bulk SEO, autopilot, blog, FAQ; persists in `CmsConfig` key `seo_job_state`; poll `GET /ai/seo/job`
- **API**: audit, playbook, optimize, bulk-optimize, job status, autopilot, `POST /ai/blogs/generate`, `POST /ai/faqs/generate`
- **DB migration** (local): `20260702120000_seo_fields_blog_category` — Blog + Category SEO columns
- **Fixes**: Real Sendcloud labels in `/admin/orders/labels` (PDF preview/download, not mock barcode)

---

## ⏳ Pending

### 1. Guest Checkout & Login
- **Status**: Pending
- **Tasks**:
  - Make `passwordHash` optional in database (`schema.prisma`)
  - Implement `POST /api/v1/auth/guest-login` in backend
  - Add "Checkout as Guest" form on frontend (`AccountAuth.tsx`)
  - Support guest flow in checkout and order tracking

### 2. Advanced AI Features (Remaining)
- **AI Shopping Assistant**: Storefront RAG Chatbot
- **Meta Pixel & TikTok Live Analytics**: Dashboard integration for real tracking events (AdminAnalytics may still use mock data)

### 3. AI SEO — v0.2+ (not started)
- **Search Console API** — real GSC data for smarter autopilot (suggestions only today)
- Rank tracking, automated internal linking, hreflang
- Live backlink building (by design: AI suggestions only, not auto-created)

### 4. Deploy & Ops (when ready)
- Commit + push `v0.1` branch changes
- Run pending migrations on production:
  - `20260627120000_return_flow_improvements`
  - `20260702120000_seo_fields_blog_category`
- Kill duplicate backend process if `EADDRINUSE :5000`

### 5. Docs sync (optional)
- `brain/04_api_reference.md`, `brain/05_frontend_routes.md` — keep in sync after deploy
- `README.md` — mention unified SEO page

---

*Note: Core platform — Admin panel, Storefront, CMS, Products, Cart, Checkout, Sendcloud, AI Quick Add, AI CMS Coder, Returns & Refunds (with polish), and AI SEO Expert (v0.1) — are implemented on branch `v0.1`. Production deploy + migration run may still be pending.*
