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

### Returns & Refunds + AI Triage
- **Customer UI**: `/dashboard` → delivered order → "Request Return" (reason + photos, 30 days from delivery)
- **Admin UI**: `/admin/orders/returns` — tabs: Pending / Approved / Awaiting / **Received — Refund Pending** / Completed / Rejected
- **Payment Refunds**: `/admin/orders/refunds` — pending (no Stripe ID) + processed list
- **API**: `/api/v1/returns` — approve **without** refund; label; receive; manual refund; see `brain/04_api_reference.md`
- **Refund timing**: Stripe refund **after** warehouse receive (webhook `-RET` status 11, admin mark received, or manual)
- **DB**: `ReturnRequest` model + `orders.deliveredAt`; order → `return_requested` → `returned` + `paymentStatus: refunded`
- **Docs**: `docs/shipping-and-refund/` (flows, policies, customer UI)
- **Test**: `backend/scripts/reset-order-for-return-test.js`, `backend/scripts/test-return-flow-audit.js`

---

## 1. Guest Checkout & Login
- **Status**: Pending
- **Tasks**:
  - Make `passwordHash` optional in database (`schema.prisma`)
  - Implement `POST /api/v1/auth/guest-login` in backend
  - Add "Checkout as Guest" form on frontend (`AccountAuth.tsx`)
  - Support guest flow in checkout and order tracking

## 2. Advanced AI Features (Remaining)
- **Status**: Partially complete — see ✅ Completed section above
- **Still pending**:
  - **AI Shopping Assistant**: Storefront RAG Chatbot
  - **Meta Pixel & TikTok Live Analytics**: Dashboard integration for tracking events

## 3. Returns — Optional polish (non-blocking)
- Frontend pre-check for 30-day return window before showing "Request Return" button (backend already enforces)
- Transactional wrap for `createReturnShipment` + Sendcloud API call
- DB-level lock for concurrent manual refund calls

---
*Note: The core platform including Admin panel, Storefront, CMS, Product Management, Cart, Checkout, Sendcloud Live Labels, AI Product Quick Add, AI CMS Coder, and Returns & Refunds are fully implemented and deployed.*
