# ⚡ Quick Reference — Brain File (Pinned Cheatsheet)

## This file is for instant lookup of the most common things.

---

## 🔑 Important Paths

| What | Path |
|------|------|
| Frontend entry | `frontend/src/main.tsx` |
| App router | `frontend/src/App.tsx` |
| Global CSS | `frontend/src/index.css` |
| i18n config | `frontend/src/i18n.ts` |
| Backend entry | `backend/src/index.ts` |
| Express app | `backend/src/app.ts` |
| All route files | `backend/src/routes/` |
| DB schema | `backend/prisma/schema.prisma` |
| Environment config | `backend/src/.../env.ts` |
| Docker (local) | `docker-compose.yml` |
| Docker (prod) | `docker-compose.prod.yml` |
| Reverse proxy | `Caddyfile` |
| Deploy | `scripts/deploy.sh` on VPS (`code-deploy` branch) |
| Docs folder | `docs/` |
| Shipping & refund docs | `docs/shipping-and-refund/` |

---

## 🌐 Local Dev URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Swagger Docs | http://localhost:5000/api-docs |
| Health Check | http://localhost:5000/health |
| Prisma Studio | http://localhost:5555 |

---

## 🏭 Production URLs

| Service | URL |
|---------|-----|
| Storefront | https://schipenster.com |
| API | https://api.schipenster.com |
| Swagger | https://api.schipenster.com/api-docs |
| Admin Panel | https://schipenster.com/admin |

---

## 📋 Common Commands

```bash
# Local dev startup
docker-compose up -d          # DB + Redis
cd backend && npm run dev     # Backend
cd frontend && npm run dev    # Frontend

# Prisma
npm run prisma:migrate        # New migration
npm run prisma:generate       # Regenerate client
npm run prisma:studio         # Open DB GUI
npm run prisma:seed           # Seed data

# Tests
cd frontend && npm run test

# Production deploy → just push to code-deploy branch
git push origin code-deploy
```

---

## 🎨 Key Frontend Conventions

| Convention | Detail |
|-----------|---------|
| UI components | shadcn/ui from `src/components/ui/` |
| Styling | TailwindCSS + shadcn tokens |
| API calls | Axios via service layer in `src/services/` |
| Data fetching | TanStack Query (useQuery / useMutation) |
| Forms | React Hook Form + Zod validation |
| Translations | `useTranslation()` hook from react-i18next |
| Icons | `lucide-react` or `@fortawesome/react-fontawesome` |
| Toasts | `sonner` (via `<Sonner />` component) |
| Error display | `AppError` class → global handler |

---

## 🗄️ Key Backend Conventions

| Convention | Detail |
|-----------|---------|
| Error throwing | `throw new AppError("message", statusCode)` |
| Auth middleware | `authenticate` + `authorize(roles)` middleware |
| DB access | Prisma client (imported from `@prisma/client`) |
| Cache | ioredis client from `src/config/redis.ts` |
| Logging | Winston logger from `src/config/logger.ts` |
| Validation | Zod schemas |
| File uploads | Multer → Sharp optimization → `public/uploads/` |
| API prefix | All routes: `/api/v1/...` |
| Response shape | `{ success: true/false, data: {...}, message: "..." }` |

---

## 📦 Important 3rd Party Integrations

| Service | Used For | Config |
|---------|----------|--------|
| **Stripe** | Payments | `STRIPE_SECRET_KEY` env |
| **Firebase** | Google OAuth + Push notif | `backend/src/config/firebase.ts` + `serviceAccountKey.json` |
| **Twilio** | OTP SMS | `TWILIO_*` env vars |
| **Sendcloud** | Shipping labels (live) | `SENDCLOUD_*` env vars |
| **Sendcloud Webhook** | Outbound + return parcel status | `POST https://api.schipenster.com/api/v1/webhooks/sendcloud` — registered in `app.ts` with `express.raw()`; HMAC-SHA256 via `SENDCLOUD_SECRET_KEY` |
| **Google Gemini** | AI product add + CMS coder | `GOOGLE_API_KEY`, `AI_*` env vars |
| **Nodemailer** | Transactional email | `SMTP_*` env vars |
| **Redis** | Caching + Rate limiting | `REDIS_URL` env var |
| **Sharp** | Image optimization | Auto-applied on upload |
| **GA4** | Analytics | Admin → CMS → SEO (frontend config) |

---

## 🚦 Order Status Flow

```
pending → processing → ready_to_ship → in_transit → delivered
                                                        ↓
                                              return_requested → returned
                                                        ↓
                                              paymentStatus: refunded
```

### Return request statuses (`return_requests.status`)

```
pending_review → approved → awaiting_return → return_received → refunded
                    ↓              ↓ (Sendcloud -RET webhook status 11)
                 rejected      manual receive / manual refund
                 cancelled
```

**Refund rule:** Stripe refund runs **after** warehouse receive — not on approve.

---

## ↩️ Return Flow (Quick)

| Who | Action |
|-----|--------|
| Customer | Delivered order → Request Return (photo + reason, 30 days from `deliveredAt`; FE + BE validation) |
| Admin | Approve (no refund) → Create return label → Awaiting Return |
| Customer | Download label (JWT proxy) → drop at PostNL |
| System / Admin | Webhook `-RET` delivered OR Mark received OR Manual refund → Stripe → `refunded` |

**Admin tabs:** Pending · Approved · Awaiting Return · **Received — Refund Pending** · Completed · Rejected

**Test scripts:**
```bash
cd backend
node -r dotenv/config scripts/reset-order-for-return-test.js <order-uuid>
node -r dotenv/config scripts/test-return-flow-audit.js <order-uuid>
```

**Customer docs:** `docs/shipping-and-refund/` · **API:** `brain/04_api_reference.md` § Returns

---

## 👤 User Roles

| Role | Access |
|------|--------|
| `customer` | Shop, cart, orders, dashboard |
| `moderator` | Admin panel (limited) |
| `admin` | Full admin panel |
| `superadmin` | Admin + manage other admins |

---

## 🌍 i18n Languages

| Code | Language | File |
|------|----------|------|
| `en` | English | `src/locales/en/translation.json` |
| `nl` | Dutch (Nederlands) | `src/locales/nl/translation.json` |

---

## ❓ Pending Work

1. **Guest checkout** — see `brain/08_future_tasks.md` §1
2. **AI Shopping Assistant** (storefront RAG chatbot) — see `brain/08_future_tasks.md` §2
3. **Meta Pixel & TikTok live analytics** — see `brain/08_future_tasks.md` §2
4. **SEO v0.2+** — Search Console API, rank tracking, hreflang — see `brain/08_future_tasks.md` §3
5. **Deploy v0.1** — commit, migrations on prod — see `brain/08_future_tasks.md` §4

## ✅ Recently Completed

- **Sendcloud live labels** — carrier label generation, shipment creation, tracking webhooks, admin label download
- **AI Product Quick Add** — image + hint → Gemini auto-fills product form, lifestyle images, drafts (`/admin/products/quick-add`)
- **AI CMS Coder** — Rich Text Editor → generates HTML, shortcodes & SEO (`POST /api/v1/ai/cms/generate`)
- **Returns & Refunds + AI Triage** — refund after receive; Sendcloud return labels; webhook auto-refund on `-RET`; admin manual refund
- **Returns polish** — 30-day UI pre-check, dual FE/BE validation, transactional return labels, refund DB lock
- **AI SEO Expert (v0.1)** — unified `/admin/cms/seo`, job queue, autopilot, AI blog/FAQ writers — see `brain/08_future_tasks.md`
