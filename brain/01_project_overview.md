# 🏪 Ecom Project — Overview (Brain File)

## Project Name
**Schipenster** — E-Commerce Lighting Platform

## Live URLs
| Service | URL |
|---------|-----|
| Storefront | https://schipenster.com |
| API | https://api.schipenster.com |
| Admin Panel | https://schipenster.com/admin |
| Swagger Docs | https://api.schipenster.com/api-docs |
| Jenkins CI/CD | https://jenkins.schipenster.com |

## Deployment
- **VPS Path**: `/opt/ecom`
- **CI/CD**: Jenkins — deploys via `code-deploy` branch push
- **Reverse Proxy**: Caddy (handles HTTPS + routing)
- **Containerization**: Docker + Docker Compose

## Tech Stack

### Frontend
| Layer | Tech |
|-------|------|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Styling | TailwindCSS v3 + shadcn/ui (Radix UI) |
| State/Server Cache | TanStack Query (React Query v5) |
| Routing | React Router DOM v6 |
| Forms | React Hook Form + Zod |
| HTTP Client | Axios |
| Auth | Firebase (Google OAuth) |
| i18n | i18next (Dutch 🇳🇱 + English 🇬🇧) |
| Charts | Recharts |
| Icons | Lucide React + FontAwesome |
| Notifications | Sonner toasts |

### Backend
| Layer | Tech |
|-------|------|
| Runtime | Node.js + Express |
| Language | TypeScript |
| ORM | Prisma v5 |
| Database | PostgreSQL 15 |
| Cache | Redis 7 (ioredis) |
| Auth | JWT + bcryptjs |
| Payments | Stripe |
| OTP/SMS | Twilio |
| Email | Nodemailer |
| File Upload | Multer + Sharp (image optimization) |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express) |
| Logging | Winston |
| Validation | Zod |
| Rate Limiting | express-rate-limit + Redis store |
| Push Notifications | Firebase Admin SDK |

---

## Project Status (v0.0)

### ✅ Completed Features
- Admin Panel full implementation
- Dynamic CMS Pages (UI blocks, hero banners, sliders, category carousels)
- Rich Text Editor with shortcodes
- Category Multi-Select (API-driven)
- Shortcode Rendering Engine
- Storage / Media Library (folders, upload, rename, trash, grid/list view)
- Swagger API Documentation
- Full Storefront (connected to live DB)
- Product Management (products, variants, brands, categories, EAV attributes)
- Cart & Checkout (Stripe payments)
- Order Management (admin orders, shipping statuses)
- User Authentication (customer + admin, OTP, roles & permissions)
- Mobile Responsive Storefront
- CI/CD via Jenkins
- Admin Backups (DB + uploads)
- i18n (Dutch / English)

### ⏳ Pending
- **Sendcloud (live labels)** — Integration code exists; blocked until Sendcloud billing + carrier contracts activated

---

## Niche / Domain
- **Product**: Lighting fixtures (pendant lamps, string lights, chandeliers, etc.)
- **Market**: Netherlands (Dutch + English)
- **Payments**: Stripe (EUR)
- **Shipping**: Sendcloud integration (carrier labels)
