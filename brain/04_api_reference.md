# 🔌 API Reference — Brain File

## Base URL
- **Local Dev**: `http://localhost:5000`
- **Production**: `https://api.schipenster.com`

## All routes prefixed with `/api/v1`

## Auth Headers
- **Customer/Public**: No auth OR `Authorization: Bearer <JWT_TOKEN>`
- **Admin-only routes**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`

---

## 🔑 Auth Routes — `/api/v1/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Register customer |
| POST | `/auth/login` | None | Login (email or phone) |
| POST | `/auth/login-admin` | None | Admin login with role check |
| POST | `/auth/create-admin` | None | Create admin account |
| POST | `/auth/firebase` | None | Firebase/Google OAuth sign-in |
| POST | `/auth/send-otp` | None | Send OTP via Twilio |
| POST | `/auth/verify-otp` | None | Verify OTP |
| POST | `/auth/forgot-password` | None | Send reset email |
| POST | `/auth/reset-password` | None | Reset with token |
| GET | `/auth/me` | JWT | Get current user profile |
| PUT | `/auth/profile` | JWT | Update profile |

### Login Request Body (flexible)
```json
{ "email": "user@example.com", "password": "pass" }
// OR
{ "phone": "9876543210", "password": "pass" }
// OR
{ "emailOrPhone": "user@example.com", "password": "pass" }
```

### Token Response Shape
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer",
    "avatar": "https://api.dicebear.com/..."
  }
}
```

---

## 🏷️ Product Routes — `/api/v1/products`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | None | List with filter + pagination |
| GET | `/products/:slug` | None | Single product by slug |
| GET | `/products/:id/reviews` | None | Product reviews |
| POST | `/products` | Admin | Create product |
| PUT | `/products/:id` | Admin | Update product |
| DELETE | `/products/:id` | Admin | Delete product |

### Product List Query Params
```
?page=1&limit=12
&category=pendant-lamps
&brand=Philips
&search=Rattan
&minPrice=20&maxPrice=150
&sort=price-asc|price-desc|rating|newest
&inStock=true
```

---

## 📂 Category Routes — `/api/v1/categories`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/categories` | None | All categories |
| GET | `/categories/:slug` | None | Single category |
| POST | `/categories` | Admin | Create |
| PUT | `/categories/:id` | Admin | Update |
| DELETE | `/categories/:id` | Admin | Delete |

---

## 🏪 Other Catalog Routes

| Prefix | Description |
|--------|-------------|
| `/api/v1/brands` | Brand CRUD |
| `/api/v1/series` | Product series CRUD |
| `/api/v1/attributes` | EAV attribute definitions CRUD |
| `/api/v1/megamenus` | Mega menu config CRUD |

---

## 📦 Order Routes — `/api/v1/orders`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders` | Optional JWT | Place new order (guest or logged in) |
| GET | `/orders/my-orders` | JWT | Customer's own orders |
| GET | `/orders` | Admin | All orders |
| GET | `/orders/:id` | Admin | Order detail |
| PUT | `/orders/:id/status` | Admin | Update status |
| GET | `/orders/ready-to-ship` | Admin | Ready to ship list |
| GET | `/orders/in-transit` | Admin | In transit list |
| GET | `/orders/delivered` | Admin | Delivered list |
| GET | `/orders/returns` | Admin | Returns list |

### Order Status Values
`pending` → `processing` → `ready_to_ship` → `in_transit` → `delivered`

**Return-related order statuses:** `return_requested` → `returned` (with `paymentStatus: refunded`)

**Return window:** 30 days from `orders.deliveredAt` (enforced on `POST /returns` — frontend pre-check + backend `assertReturnEligible()`)

**Validation (frontend + backend):** reason (enum), 1–5 photos (JPEG/PNG/WebP/GIF), note ≤2000 chars, delivered + no active return + in window; return label weight 0.01–30 kg. Utils: `backend/src/utils/returnValidation.ts`, `frontend/src/utils/returnValidation.ts`

---

## 💳 Payment Routes — `/api/v1/payments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/create-session` | Create Stripe checkout session |
| POST | `/payments/webhook` | Stripe webhook (raw body) |

---

## 🎨 CMS Routes — `/api/v1/cms`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cms/:slug` | None | Get CMS page by slug |
| PUT | `/cms/:slug` | Admin | Update CMS page |
| GET | `/cms/pages` | Admin | List all pages |
| POST | `/cms/pages` | Admin | Create page |

---

## 🖼️ Media Routes — `/api/v1/media`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/media` | Admin | List files/folders |
| POST | `/media/upload` | Admin | Upload file (multipart) |
| DELETE | `/media/:id` | Admin | Delete file |
| POST | `/media/folders` | Admin | Create folder |
| PUT | `/media/:id/rename` | Admin | Rename file |

Uploaded files served at: `/uploads/<filename>`

---

## ⚙️ Admin Settings Routes — `/api/v1/admin/settings`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/settings` | Get all settings |
| PUT | `/admin/settings` | Update settings |
| GET | `/admin/logs` | Server logs |
| GET | `/admin/backups` | List backups |
| POST | `/admin/backups/download` | Download DB backup |

---

## 🛒 Other Routes

| Prefix | Description |
|--------|-------------|
| `/api/v1/reviews` | Product reviews CRUD |
| `/api/v1/addresses` | User saved addresses |
| `/api/v1/wishlists` | Wishlist items |
| `/api/v1/coupons` | Coupon codes |
| `/api/v1/charges` | Shipping charge config |
| `/api/v1/shipping` | Sendcloud shipping (live labels) |
| `/api/v1/ai` | AI tools (admin only — quick-add, CMS generate, drafts) |
| `/api/v1/blogs` | Blog CRUD |
| `/api/v1/notifications` | Push notifications |
| `/api/v1/webhooks/sendcloud` | Sendcloud parcel webhooks (raw body — registered in `app.ts`, not `webhookRoutes`) |
| `/api/v1/config` | Public config (maintenance mode, etc.) |

---

## 🔍 Special Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check (Redis + uptime) |
| `GET /robots.txt` | Dynamic robots.txt (from AdminSettings) |
| `GET /sitemap.xml` | Dynamic sitemap (from AdminSettings) |
| `GET /api-docs` | Swagger UI |

---

## 🤖 AI Routes (Admin JWT required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ai/limits` | AI config limits (bulk count, image count, output language) |
| GET | `/ai/drafts` | List AI-generated product drafts |
| GET | `/ai/drafts/:id` | Get single draft |
| DELETE | `/ai/drafts/:id` | Delete draft |
| PATCH | `/ai/drafts/:id/published` | Mark draft as published |
| POST | `/ai/products/quick-add` | AI product quick-add (multipart: image + hint) |
| POST | `/ai/products/bulk-quick-add` | Bulk quick-add (up to `AI_BULK_LIMIT` rows) |
| PATCH | `/ai/cms/generate` | AI CMS Coder — generate/edit page HTML + SEO |
| GET | `/ai/seo/audit` | Site-wide SEO audit |
| GET/PUT | `/ai/seo/playbook` | SEO playbook + target keywords |
| POST | `/ai/seo/optimize` | AI optimize single entity |
| POST | `/ai/seo/bulk-optimize` | Bulk SEO optimize (queued) |
| GET | `/ai/seo/job` | Background SEO job status |
| GET/PUT | `/ai/seo/autopilot` | Autopilot config |
| POST | `/ai/seo/autopilot/run` | Run autopilot now |
| GET | `/ai/blogs/suggestions` | Blog topic suggestions |
| POST | `/ai/blogs/generate` | AI blog writer (queued) |
| POST | `/ai/faqs/generate` | AI FAQ writer (queued) |
| GET | `/ai/seo/search-console/status` | GSC connection status |
| GET | `/ai/seo/search-console/overview` | GSC clicks/impressions/queries/pages |
| GET | `/ai/seo/rank-tracking` | Stored rank history + trends |
| POST | `/ai/seo/rank-tracking/sync` | Sync playbook keywords from GSC |
| GET | `/ai/seo/internal-links` | Internal linking suggestions |

---

## ↩️ Returns Routes — `/api/v1/returns`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/returns` | Customer JWT | Submit return (multipart photos, max 5). Requires `delivered` order + 30-day window |
| GET | `/returns/my` | Customer JWT | List own return requests |
| GET | `/returns/my/:id/label` | Customer JWT | Download return label PDF (Sendcloud proxy) |
| DELETE | `/returns/:id` | Customer JWT | Cancel while `pending_review` only |
| GET | `/returns` | Admin | List returns — filter `?status=pending_review\|approved\|awaiting_return\|return_received\|refunded\|rejected\|all` |
| GET | `/returns/refunds` | Admin | Processed + pending refunds (no Stripe ID yet) |
| GET | `/returns/:id` | Admin | Return detail |
| GET | `/returns/:id/label` | Admin | Download return label PDF |
| PATCH | `/returns/:id/approve` | Admin | Approve return — **no Stripe refund**; order → `return_requested` |
| PATCH | `/returns/:id/reject` | Admin | Reject (requires `adminNote` in body) |
| POST | `/returns/:id/return-shipment` | Admin | Create Sendcloud return label (optimistic lock + transactional save); status → `awaiting_return` |
| PATCH | `/returns/:id/receive` | Admin | Mark received + process Stripe refund |
| PATCH | `/returns/:id/refund` | Admin | Manual Stripe refund (approved / awaiting_return / return_received) |

### Return request status values
`pending_review` → `approved` → `awaiting_return` → `return_received` → `refunded`  
Terminal: `rejected`, `cancelled` — customer may submit a **new** request after `rejected`

### Refund processing
- Service: `backend/src/services/returnRefundService.ts` → `processReturnRefund()`
- Auto-trigger: Sendcloud webhook on return parcel (`ORD-xxx-RET`) status **11** (delivered to warehouse)
- Idempotent: reuses existing Stripe refund if PI already refunded
- Concurrent-safe: row lock (`FOR UPDATE`) + `refund_processing` before Stripe; 409 on duplicate
- Blocks refund if order has no `stripePaymentId`

### Sendcloud webhook — `/api/v1/webhooks/sendcloud`
| Field | Detail |
|-------|--------|
| Method | `POST` |
| Body parser | `express.raw({ type: "application/json" })` in `app.ts` (before `express.json()`) |
| Signature header | `Sendcloud-Signature` — HMAC-SHA256 of **raw body** using `SENDCLOUD_SECRET_KEY` |
| Outbound parcels | Updates `orders.status`, `shipmentStatus`, `deliveredAt` |
| Return parcels (`*-RET`) | Updates `returnShipmentStatus`; auto-refund on status 11 |

---

## Error Response Shape
```json
{
  "success": false,
  "message": "Route GET /api/v1/xyz not found",
  "statusCode": 404
}
```

## Rate Limiting
- Global rate limit applied via `globalLimiter` middleware
- Redis-backed rate limiting for auth endpoints (brute force protection)
