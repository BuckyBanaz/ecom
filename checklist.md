# Frontend Translation Checklist

This checklist tracks the progress of migrating hardcoded strings in frontend files to the i18n system (`en.json` and `nl.json`).

## System / Setup
- [ ] Install `i18ne t` and `react-i18ne t`
- [ ] Create `i18n.ts` config file
- [ ] Create `en.json` (English Dictionary)
- [ ] Create `nl.json` (Dutch Dictionary)
- [ ] Add `I18ne tProvider` to `App.ts ` or `main.ts `

## Components
- [ ] `src/components/layout/TopBar.ts `
- [ ] `src/components/layout/Header.ts ` (Navbar)
- [ ] `src/components/layout/Footer.ts `
- [ ] `src/components/layout/Layout.ts `
- [ ] `src/components/layout/SEOInjector.ts `
- [ ] `src/components/ui/*` (Buttons, Dialogs, etc if they have hardcoded te t)

## Shop Pages
- [ ] `src/pages/shop/Home.ts `
- [ ] `src/pages/shop/Product.ts `
- [ ] `src/pages/shop/Products.ts ` (Shop List)
- [ ] `src/pages/shop/Cart.ts `
- [ ] `src/pages/shop/Checkout.ts `
- [ ] `src/pages/shop/CheckoutRetry.ts `
- [ ] `src/pages/shop/OrderSuccess.ts `
- [ ] `src/pages/shop/TrackOrder.ts `
- [ ] `src/pages/shop/Contact.ts `
- [ ] `src/pages/shop/Help.ts `
- [ ] `src/pages/shop/Faqs.ts `
- [ ] `src/pages/shop/InvoicePage.ts `
- [ ] `src/pages/shop/Search.ts `
- [ ] `src/pages/shop/Wishlist.ts `
- [ ] `src/pages/shop/UserDashboard.ts `
- [ ] `src/pages/shop/Account.ts `
- [ ] `src/pages/shop/Relief.ts `
- [ ] `src/pages/shop/ReliefCategory.ts `
- [ ] `src/pages/shop/Blogs.ts `
- [ ] `src/pages/shop/BlogDetail.ts `
- [ ] `src/pages/shop/DynamicPage.ts ` (Dynamic routes)

## Conte ts
- [ ] `src/conte t/CartConte t.ts ` (Toast messages, etc)
- [ ] `src/conte t/WishlistConte t.ts `

## Admin Pages (Optional / If Needed)
- [ ] `src/pages/admin/Dashboard.ts `
- [ ] `src/pages/admin/AdminOrders.ts `
- [ ] `src/pages/admin/AdminOrderDetails.ts `
- [ ] `src/pages/admin/AdminProducts.ts `
- [ ] `src/pages/admin/AdminSettings.ts `
- [ ] `src/pages/admin/AdminAnalytics.ts `
- [ ] `src/pages/admin/AdminAttributes.ts `
- [ ] `src/pages/admin/AdminBrands.ts `
- [ ] `src/pages/admin/AdminCMS.ts `
- [ ] `src/pages/admin/AdminCategories.ts `
- [ ] `src/pages/admin/AdminCharges.ts `
- [ ] `src/pages/admin/AdminDelivered.ts `
- [ ] `src/pages/admin/AdminEmailTemplates.ts `
- [ ] `src/pages/admin/AdminInTransit.ts `
- [ ] `src/pages/admin/AdminInvoices.ts `
- [ ] `src/pages/admin/AdminLabels.ts `
- [ ] `src/pages/admin/AdminLogin.ts `
- [ ] `src/pages/admin/AdminManageUsers.ts `
- [ ] `src/pages/admin/AdminNotificationsPage.ts `
- [ ] `src/pages/admin/AdminOffers.ts `
- [ ] `src/pages/admin/AdminProductForm.ts `
- [ ] `src/pages/admin/AdminReadyToShip.ts `
- [ ] `src/pages/admin/AdminReturns.ts `
- [ ] `src/pages/admin/AdminReviews.ts `
- [ ] `src/pages/admin/AdminTestimonials.ts `
- [ ] `src/pages/admin/AdminUsers.ts `

---
*How to use: As we convert a file to use `useTranslation()`, we will mark the checkbo  with ` `.*
