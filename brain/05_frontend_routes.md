# 🧭 Frontend Routing Map — Brain File

## Router: React Router DOM v6
## Entry: `frontend/src/App.tsx`

---

## Storefront Routes (wrapped in `<SiteLayout>`)

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Index` | Homepage (CMS-driven hero, featured products) |
| `/categories` | `AllCategories` | All product categories grid |
| `/category` | `Category` | Category listing (no slug) |
| `/category/:slug` | `Category` | Category listing with filters |
| `/deals` | → redirect | Redirects to `/category/deals` |
| `/product/:slug` | `ProductPage` | Product detail page |
| `/cart` | `Cart` | Shopping cart |
| `/checkout` | `Checkout` | Stripe checkout flow |
| `/checkout/success` | `Checkout` | Post-payment success |
| `/checkout/cancel` | `Checkout` | Payment cancelled |
| `/checkout/retry/:orderId` | `CheckoutRetry` | Retry a failed payment |
| `/search` | `Search` | Search results |
| `/account` | `AccountAuth` | Login / Register page |
| `/forgot-password` | `ForgotPassword` | Request password reset |
| `/reset-password` | `ResetPassword` | Set new password (via token) |
| `/dashboard` | `UserDashboard` | Customer account dashboard |
| `/faqs` | `Faqs` | FAQ page |
| `/wishlist` | `Wishlist` | Wishlist page |
| `/blogs` | `Blogs` | Blog listing |
| `/blogs/:slug` | `BlogDetail` | Single blog post |
| `/relief` | `Relief` | Relief product category |
| `/relief/:slug` | `ReliefCategory` | Relief subcategory |
| `/relief/category/:slug` | `Category` | Relief category via slug |
| `/404` | `NotFound` | Explicit 404 page |
| `/:slug` | `DynamicPage` | CMS-driven custom pages (catch-all) |
| `*` | `NotFound` | All other routes → 404 |

---

## Outside `SiteLayout`

| Route | Component | Description |
|-------|-----------|-------------|
| `/invoice` | `InvoicePage` | Printable order invoice |

---

## Admin Routes (wrapped in `<AdminLayout>`)

Base: `/admin`

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin/login` | `AdminLogin` | Admin login page |
| `/admin` (index) | `Dashboard` | Admin dashboard |
| `/admin/analytics` | `AdminAnalytics` | GA4 analytics view |
| `/admin/products` | `AdminProducts` | Product list |
| `/admin/products/new` | `AdminProductForm` | Create new product |
| `/admin/products/:id/edit` | `AdminProductForm` | Edit product |
| `/admin/products/:id/reviews` | `AdminReviews` | Product reviews |
| `/admin/categories` | `AdminCategories` | Category management |
| `/admin/brands` | `AdminBrands` | Brand management |
| `/admin/attributes` | `AdminAttributes` | EAV attributes |
| `/admin/orders` | `AdminOrders` | All orders |
| `/admin/orders/ready-to-ship` | `AdminReadyToShip` | Ready to ship |
| `/admin/orders/in-transit` | `AdminInTransit` | In transit |
| `/admin/orders/delivered` | `AdminDelivered` | Delivered |
| `/admin/orders/returns` | `AdminReturns` | Returns |
| `/admin/orders/labels` | `AdminLabels` | Sendcloud labels |
| `/admin/orders/:id` | `AdminOrderDetails` | Order detail |
| `/admin/offers` | `AdminOffers` | Discount offers |
| `/admin/charges` | `AdminCharges` | Shipping charges |
| `/admin/testimonials` | `AdminTestimonials` | Testimonials |
| `/admin/cms` | → redirect | → `/admin/cms/homepage` |
| `/admin/cms/homepage` | `CMSHomepage` | Homepage block editor |
| `/admin/cms/product-page` | `CMSProductPage` | Product page CMS |
| `/admin/cms/megamenu` | `CMSMegaMenu` | Navigation config |
| `/admin/cms/header-footer` | `CMSHeaderFooter` | Header/footer editor |
| `/admin/cms/faqs` | `CMSFaqs` | FAQ editor |
| `/admin/cms/relief` | `CMSRelief` | Relief section CMS |
| `/admin/cms/:kind` | `CMSLegal` | Privacy, Terms, etc. |
| `/admin/cms/pages` | `CMSPages` | Custom CMS pages |
| `/admin/cms/blogs` | `CMSBlogs` | Blog CMS |
| `/admin/cms/seo` | `CMSSeo` | SEO, sitemap, robots.txt |
| `/admin/cms/email-templates` | `AdminEmailTemplates` | Email templates |
| `/admin/storage` | `MediaLibrary` | File/media library |
| `/admin/users` | `AdminUsers` | Customer users |
| `/admin/manage-users` | `AdminManageUsers` | Admin users |
| `/admin/settings` | `AdminSettings` | Platform settings |
| `/admin/logs` | `AdminLogs` | Server logs |
| `/admin/backups` | `AdminBackups` | DB + file backups |
| `/admin/notifications` | `AdminNotificationsPage` | Push notifications |

---

## Context Providers (Wrapping Order in App.tsx)

```
QueryClientProvider
  └── TooltipProvider
        └── BrowserRouter
              └── WishlistProvider
                    └── CartProvider
                          └── AdminProvider
                                └── ErrorBoundary
                                      └── MaintenanceGuard
                                            └── Suspense (with PageLoader fallback)
                                                  └── Routes
```

## Global Components
- `<ScrollToTop>` — resets scroll on route change
- `<SEOInjector>` — injects dynamic meta tags per page
- `<MaintenanceGuard>` — shows maintenance page if flag is enabled
- `<ErrorBoundary>` — catches render errors gracefully

## Code Splitting
All page components are lazy-loaded via `React.lazy()` for optimal bundle splitting.

---

## TanStack Query Config
```ts
{
  staleTime: 5 * 60_000,      // 5 minutes
  gcTime: 30 * 60_000,        // 30 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
}
```
