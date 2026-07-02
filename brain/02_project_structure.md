# 🗂️ Project Structure — Brain File

## Root Layout
```
ecom/
├── frontend/          # React + Vite storefront + admin
├── backend/           # Node.js + Express + Prisma API
├── docs/              # Architecture docs & plans
├── brain/             # AI memory files (this folder)
├── scripts/           # Utility shell scripts
├── local-scripts/     # Local dev helpers
├── docker-compose.yml        # Local dev (Postgres + Redis + Backend)
├── docker-compose.prod.yml   # Production compose
├── Caddyfile          # Reverse proxy config
├── scripts/deploy.sh  # Production deploy (SSH)
└── .env.production    # Production environment vars
```

---

## Frontend Structure (`frontend/src/`)

```
src/
├── App.tsx            # Root router + providers
├── main.tsx           # Entry point
├── index.css          # Global styles (Tailwind base)
├── App.css            # App-level styles
├── i18n.ts            # i18next configuration
│
├── pages/
│   ├── Index.tsx                  # Homepage
│   ├── NotFound.tsx               # 404 page
│   ├── MaintenancePage.tsx        # Maintenance mode
│   ├── auth/
│   │   ├── AccountAuth.tsx        # Login/Register
│   │   ├── ForgotPassword.tsx
│   │   └── ResetPassword.tsx
│   ├── shop/
│   │   ├── Category.tsx           # Category listing with filters
│   │   ├── AllCategories.tsx      # All categories grid
│   │   ├── Product.tsx            # Product detail page
│   │   ├── Cart.tsx               # Shopping cart
│   │   ├── Checkout.tsx           # Stripe checkout flow
│   │   ├── CheckoutRetry.tsx      # Retry failed payment
│   │   ├── Search.tsx             # Search results
│   │   ├── UserDashboard.tsx      # Customer account area
│   │   ├── Wishlist.tsx           # Saved items
│   │   ├── Blogs.tsx              # Blog listing
│   │   ├── BlogDetail.tsx         # Single blog post
│   │   ├── InvoicePage.tsx        # Order invoice
│   │   ├── Faqs.tsx               # FAQ page
│   │   ├── Relief.tsx             # Relief products section
│   │   ├── ReliefCategory.tsx
│   │   └── DynamicPage.tsx        # CMS-driven pages (/:slug)
│   └── admin/
│       ├── AdminLogin.tsx
│       ├── Dashboard.tsx          # Admin dashboard
│       ├── AdminProducts.tsx      # Product list
│       ├── AdminProductForm.tsx   # Create/Edit product
│       ├── AdminProductQuickAdd.tsx  # AI quick-add (Gemini)
│       ├── AdminProductDrafts.tsx    # AI-generated product drafts
│       ├── AdminCategories.tsx
│       ├── AdminBrands.tsx
│       ├── AdminAttributes.tsx
│       ├── AdminOrders.tsx
│       ├── AdminReadyToShip.tsx
│       ├── AdminInTransit.tsx
│       ├── AdminDelivered.tsx
│       ├── AdminReturns.tsx
│       ├── AdminPaymentRefunds.tsx
│       ├── AdminOrderDetails.tsx
│       ├── AdminLabels.tsx        # Sendcloud shipping labels
│       ├── AdminUsers.tsx
│       ├── AdminManageUsers.tsx
│       ├── AdminSettings.tsx
│       ├── AdminEmailTemplates.tsx
│       ├── AdminAnalytics.tsx     # GA4 analytics
│       ├── AdminLogs.tsx
│       ├── AdminBackups.tsx
│       ├── AdminTestimonials.tsx
│       ├── AdminNotificationsPage.tsx
│       ├── AdminOffers.tsx
│       ├── AdminCharges.tsx
│       └── cms/
│           ├── CMSHomepage.tsx    # CMS block editor
│           ├── CMSMegaMenu.tsx    # Navigation config
│           ├── CMSRelief.tsx
│           ├── CMSProductPage.tsx
│           ├── CMSLegal.tsx       # Privacy/Terms pages
│           ├── CMSPages.tsx       # Custom pages
│           ├── CMSBlogs.tsx
│           ├── CMSSeo.tsx         # SEO + sitemap + robots.txt
│           ├── CMSHeaderFooter.tsx
│           └── CMSFaqs.tsx
│
├── components/
│   ├── layout/
│   │   ├── SiteLayout.tsx         # Main storefront shell
│   │   ├── ScrollToTop.tsx
│   │   └── SEOInjector.tsx        # Dynamic meta tags
│   ├── admin/
│   │   ├── AdminLayout.tsx        # Admin shell with sidebar
│   │   └── RichTextEditor.tsx     # CMS editor + AI CMS Coder (Sparkles)
│   ├── ui/                        # shadcn/ui components
│   │   └── PageLoader.tsx
│   ├── MaintenanceGuard.tsx       # Maintenance mode gate
│   └── ErrorBoundary.tsx
│
├── context/
│   ├── CartContext.tsx            # Shopping cart state
│   ├── WishlistContext.tsx        # Wishlist state
│   └── AdminContext.tsx          # Admin auth state
│
├── hooks/                         # Custom React hooks
├── services/                      # API service layer (Axios calls)
├── client/                        # API client config
├── config/                        # App config (env vars etc.)
├── lib/                           # Utility library
├── utils/                         # Helper functions
├── data/                          # Static data / constants
├── assets/                        # Images, SVGs
└── locales/
    ├── en/translation.json        # English strings
    └── nl/translation.json        # Dutch strings
```

---

## Backend Structure (`backend/src/`)

```
src/
├── index.ts           # Server entry (starts HTTP server)
├── app.ts             # Express app setup + routes
│
├── routes/            # 25 route files
│   ├── authRoutes.ts
│   ├── productRoutes.ts
│   ├── categoryRoutes.ts
│   ├── brandRoutes.ts
│   ├── seriesRoutes.ts
│   ├── attributeRoutes.ts
│   ├── megaMenuRoutes.ts
│   ├── blogRoutes.ts
│   ├── cmsRoutes.ts
│   ├── mediaRoutes.ts
│   ├── reviewRoutes.ts
│   ├── addressRoutes.ts
│   ├── wishlistRoutes.ts
│   ├── adminSettingsRoutes.ts
│   ├── emailTemplateRoutes.ts
│   ├── couponRoutes.ts
│   ├── chargeRoutes.ts
│   ├── paymentRoutes.ts
│   ├── shippingRoutes.ts
│   ├── aiRoutes.ts              # AI product quick-add + CMS generate
│   ├── orderRoutes.ts
│   ├── webhookRoutes.ts
│   ├── notificationRoutes.ts
│   ├── configRoutes.ts
│   ├── logsRoutes.ts
│   └── backupRoutes.ts
│
├── controllers/       # Route handler functions
├── services/          # Business logic layer
│   ├── aiService.ts           # Gemini product + CMS generation
│   └── sendcloud/             # Sendcloud webhook + shipping
├── middlewares/
│   ├── errorMiddleware.ts      # Global error handler (AppError class)
│   ├── loggerMiddleware.ts     # Winston request logger
│   └── rateLimitMiddleware.ts  # Rate limiter (globalLimiter)
├── config/
│   ├── env.ts          # Type-safe env variables
│   ├── redis.ts        # Redis connection (ioredis)
│   ├── firebase.ts     # Firebase admin SDK
│   └── swagger.ts      # Swagger setup
├── utils/
│   └── seedTemplates.ts # Seeds email templates on startup
└── constants/
```

### Prisma
```
backend/prisma/
├── schema.prisma       # Full DB schema (14,667 bytes)
├── seed.ts             # Full seed data
├── seedMegaMenu.ts     # Mega menu seed
├── seedProduct.ts      # Single product seed
└── seedProductsOnly.ts # Products-only seed
```

---

## Docker Services (Local Dev)

| Service | Container | Port |
|---------|-----------|------|
| PostgreSQL 15 | ecom-postgres | 5432 |
| Redis 7 | ecom-redis | 6379 |
| Backend | ecom-backend | 5000 |

Frontend runs separately via `npm run dev` (port 5173)
