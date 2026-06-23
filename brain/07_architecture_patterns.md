# 🧠 Architecture & Key Patterns — Brain File

---

## Backend Architecture

### Express App Structure
- **Entry**: `src/index.ts` → starts HTTP server
- **App Setup**: `src/app.ts` → middleware, CORS, routes, swagger, error handling
- **Routing**: 25 route files under `src/routes/`
- **Pattern**: Controller → Service → Prisma

### Middleware Stack (in order)
1. `trust proxy 1` — for Caddy reverse proxy IP fix
2. CORS — allowedOrigins set: localhost + production domains
3. `requestLogger` — Winston HTTP logger
4. `globalLimiter` — Rate limit (Redis-backed)
5. Stripe webhook raw body handler (before json parser)
6. `express.json({ limit: '50mb' })` — JSON body parser
7. `express.urlencoded` — Form body parser
8. `/uploads` static file serving
9. Swagger UI
10. Route handlers
11. 404 catch-all
12. `errorHandler` — global error formatter

### Error Handling
```ts
// Throw like this anywhere in the app:
throw new AppError("Message here", 404);

// All errors go to global errorHandler middleware
// Response shape: { success: false, message: "...", statusCode: 404 }
```

### Redis Usage
- Config: `src/config/redis.ts` (ioredis)
- Enable/disable via `ENABLE_REDIS=true` env var
- Used for: rate limiting, catalog caching, session
- Health check: `GET /health` shows Redis status

---

## Frontend Architecture

### State Management
- **Server state**: TanStack Query (React Query v5)
  - `staleTime: 5min`, `gcTime: 30min`
  - No refetch on focus/mount
- **Client state**: React Context
  - `CartContext` — cart items, add/remove/clear
  - `WishlistContext` — saved products
  - `AdminContext` — admin auth + permissions

### Component Pattern
- **shadcn/ui** for base UI components (Radix primitives + TailwindCSS)
- Located in `src/components/ui/`
- Custom components extend shadcn in `src/components/`

### i18n Setup
- Library: `i18next` + `react-i18next`
- Languages: `en` (English) + `nl` (Dutch)
- Translation files: `src/locales/en/translation.json`, `src/locales/nl/translation.json`
- Config: `src/i18n.ts`
- Browser language auto-detection via `i18next-browser-languagedetector`

### SEO
- `<SEOInjector>` component dynamically injects `<title>` and `<meta>` tags per page
- Sitemap and robots.txt generated from Admin → CMS → SEO panel
- Backend serves them dynamically at `/sitemap.xml` and `/robots.txt`

---

## Database Patterns

### EAV System for Filterable Attributes
When adding filterable product specs (e.g. Color, Bulb Fitting):
1. Create `Attribute` record (name, slug, type, visibility)
2. Create `AttributeValue` records for each option
3. Link to product via `ProductAttributeValue`

### Static Specs JSON
For non-filterable details (Warranty, Dimensions):
- Stored as `specs: Json` on the Product model
- Example: `{ "Warranty": "2 years", "Max wattage": "40W" }`

### Category Tree
- Categories are self-referencing via `parent_id`
- Top-level categories have `parent_id = null`
- Subcategories have `parent_id = <parent_id>`

---

## Auth Flow

### Customer Auth
1. Register: POST `/auth/register` → returns JWT
2. Login: POST `/auth/login` (email/phone/password) → returns JWT
3. Google: POST `/auth/firebase` (Firebase token) → returns JWT
4. Store JWT in localStorage/sessionStorage on frontend

### Admin Auth
1. Login: POST `/auth/login-admin` (email + password + role)
2. Role check: `role` must be `admin` | `moderator` | `superadmin`
3. Same JWT format, different role claim

### Guest Checkout
- No auth required for placing an order
- `userId` is nullable on Order model
- Guest tracks orders via email + orderNumber

---

## Payment Flow (Stripe)

1. Frontend creates order → `POST /api/v1/orders`
2. Backend creates Stripe session → `POST /api/v1/payments/create-session`
3. Frontend redirects to Stripe hosted checkout
4. On success: Stripe redirects to `/checkout/success`
5. Stripe webhook `POST /api/v1/payments/webhook` fires with payment confirmation
6. Backend updates order status from `pending` → `processing`

---

## Shipping Flow (Sendcloud)

> ⚠️ PARTIALLY IMPLEMENTED — live labels blocked pending Sendcloud billing activation

- Routes: `/api/v1/shipping`
- Admin panel: `/admin/orders/labels`
- Integration docs: `docs/sendcloud_integration.md`

---

## CMS System

### How CMS Pages Work
1. Admin edits blocks in CMS editor (Admin → CMS → Homepage)
2. Blocks stored as JSON array in `CmsPage.blocks`
3. Frontend `DynamicPage.tsx` fetches by slug → renders blocks dynamically
4. Block types: hero, carousel, product-grid, text, shortcode, etc.

### MegaMenu
1. Admin configures navigation structure (Admin → CMS → Mega Menu)
2. Stored as JSON in `MegaMenu.sections`
3. Frontend parses JSON to build dropdown navigation

---

## Media Library

- Upload endpoint: `POST /api/v1/media/upload` (multipart)
- Files stored in: `backend/public/uploads/`
- Served at: `https://api.schipenster.com/uploads/<filename>`
- Image optimization: Sharp (auto-compress on upload)
- Admin UI: `/admin/storage`

---

## Email System

- Provider: Nodemailer
- Templates stored in DB (`EmailTemplate` model)
- Seeded on startup via `seedTemplates()` in `app.ts`
- Template types: order confirmation, OTP, password reset, etc.

---

## Logging

- Library: Winston
- Request logging: `requestLogger` middleware
- Admin log viewer: `/admin/logs` (Admin UI)
- API: `GET /api/v1/admin/logs`
