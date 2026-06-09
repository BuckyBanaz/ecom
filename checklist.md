# 🌍 Multilanguage (NL / EN) Implementation Checklist

**Default language:** `nl` (Dutch) · **Secondary:** `en` (English)
**Strategy:**
- **Layer 1 — i18next** → static UI strings (`t('key')` + JSON locales)
- **Layer 2 — Google Translate widget** → dynamic API data (auto translates on cookie flip)

---

## ✅ Infrastructure (DONE)

- [x] `i18next` + `react-i18next` + `LanguageDetector` config — [src/i18n.ts](frontend/src/i18n.ts)
- [x] Dutch + English locale JSON — [src/locales/](frontend/src/locales/)
- [x] `<html lang="nl">` set in [index.html](frontend/index.html)
- [x] Google Translate hidden widget mounted (`googtrans` cookie driven)
- [x] `<meta name="google" content="translate">` for browser auto-popup
- [x] Bootstrapped from [main.tsx](frontend/src/main.tsx)
- [x] `LanguageSwitcher` component — [src/components/layout/LanguageSwitcher.tsx](frontend/src/components/layout/LanguageSwitcher.tsx)
- [x] Header + TopBar + Footer translated

---

## 🛒 Shop Pages (customer-facing)

- [x] `Index.tsx` (Homepage)
- [x] `shop/Category.tsx`
- [x] `shop/Product.tsx`
- [x] `shop/Cart.tsx`
- [x] `shop/Checkout.tsx`
- [x] `shop/CheckoutRetry.tsx`
- [x] `shop/Search.tsx`
- [x] `shop/Account.tsx`
- [x] `shop/UserDashboard.tsx`
- [x] `shop/Wishlist.tsx`
- [x] `shop/Faqs.tsx`
- [x] `shop/Help.tsx`
- [x] `shop/Blogs.tsx`
- [x] `shop/BlogDetail.tsx`
- [x] `shop/InvoicePage.tsx`
- [x] `shop/Relief.tsx`
- [x] `shop/ReliefCategory.tsx`
- [x] `shop/DynamicPage.tsx`
- [x] `NotFound.tsx`

### Shop Components
- [x] `shop/ProductCard.tsx`
- [x] `shop/MapSelector.tsx`
- [x] `layout/MiniCart.tsx`

### Auth Pages
- [x] `auth/AccountAuth.tsx`
- [x] `auth/ForgotPassword.tsx`
- [x] `auth/ResetPassword.tsx`

---

## ⚙️ Admin Panel

- [x] `admin/Dashboard.tsx`
- [x] `admin/AdminLogin.tsx`
- [x] `admin/AdminProducts.tsx`
- [x] `admin/AdminProductForm.tsx`
- [x] `admin/AdminCategories.tsx`
- [x] `admin/AdminBrands.tsx`
- [x] `admin/AdminAttributes.tsx`
- [x] `admin/AdminReviews.tsx`
- [x] `admin/AdminOrders.tsx`
- [x] `admin/AdminOrderDetails.tsx`
- [x] `admin/AdminInTransit.tsx`
- [x] `admin/AdminReadyToShip.tsx`
- [x] `admin/AdminDelivered.tsx`
- [x] `admin/AdminReturns.tsx`
- [x] `admin/AdminInvoices.tsx`
- [x] `admin/AdminLabels.tsx`
- [x] `admin/AdminUsers.tsx`
- [x] `admin/AdminManageUsers.tsx`
- [x] `admin/AdminSettings.tsx`
- [x] `admin/AdminTestimonials.tsx`
- [x] `admin/AdminNotificationsPage.tsx`
- [x] `admin/AdminOffers.tsx`
- [x] `admin/AdminCharges.tsx`
- [x] `admin/AdminEmailTemplates.tsx`
- [x] `admin/AdminAnalytics.tsx`
- [x] `admin/AdminCMS.tsx`
- [x] `admin/cms/CMSHomepage.tsx`
- [x] `admin/cms/CMSMegaMenu.tsx`
- [x] `admin/cms/CMSRelief.tsx`
- [x] `admin/cms/CMSLegal.tsx`
- [x] `admin/cms/CMSPages.tsx`
- [x] `admin/cms/CMSBlogs.tsx`
- [x] `admin/cms/CMSSeo.tsx`
- [x] `admin/cms/CMSHeaderFooter.tsx`
- [x] `admin/cms/CMSFaqs.tsx`
- [x] `admin/media/MediaLibrary.tsx`

### Admin Components
- [x] `admin/AdminHeader.tsx`
- [x] `admin/AdminLayout.tsx`
- [x] `admin/AdminSidebar.tsx`
- [x] `admin/AdminNotifications.tsx`
- [ ] `admin/IconPicker.tsx`
- [ ] `admin/RichTextEditor.tsx`
- [ ] `admin/UIBlocksDialog.tsx`
- [ ] `admin/cms-ui-components/*`
- [ ] `admin/media/MediaLibraryCore.tsx`
- [ ] `admin/media/MediaLibraryDialog.tsx`
