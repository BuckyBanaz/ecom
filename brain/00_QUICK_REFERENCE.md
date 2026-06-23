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
| CI/CD | `Jenkinsfile` |
| Docs folder | `docs/` |

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
| Jenkins | https://jenkins.schipenster.com |
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
| **Sendcloud** | Shipping labels | `SENDCLOUD_*` env vars (pending activation) |
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
```

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

1. **Sendcloud live labels** — billing + carrier contracts needed
2. **AI features** — see `docs/ai_powered_ecommerce_plan.md`
3. **Easy product adding** — see `docs/easy_product_adding_plan.md`
4. **Returns AI triage** — see `docs/returns-system-architecture.md`
