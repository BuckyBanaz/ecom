import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteLayout } from "./components/layout/SiteLayout.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import { WishlistProvider } from "./context/WishlistContext.tsx";
import { AdminProvider } from "./context/AdminContext.tsx";
import { ScrollToTop } from "./components/layout/ScrollToTop.tsx";
import { SEOInjector } from "./components/layout/SEOInjector.tsx";
import { MaintenanceGuard } from "./components/MaintenanceGuard.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { PageLoader } from "./components/ui/PageLoader.tsx";

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Category = lazy(() => import("./pages/shop/Category.tsx"));
const ProductPage = lazy(() => import("./pages/shop/Product.tsx"));
const Cart = lazy(() => import("./pages/shop/Cart.tsx"));
const Checkout = lazy(() => import("./pages/shop/Checkout.tsx"));
const CheckoutRetry = lazy(() => import("./pages/shop/CheckoutRetry.tsx"));
const Search = lazy(() => import("./pages/shop/Search.tsx"));
const AccountAuth = lazy(() => import("./pages/auth/AccountAuth.tsx"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword.tsx"));
const UserDashboard = lazy(() => import("./pages/shop/UserDashboard.tsx"));
const Faqs = lazy(() => import("./pages/shop/Faqs.tsx"));
const Wishlist = lazy(() => import("./pages/shop/Wishlist.tsx"));
const Blogs = lazy(() => import("./pages/shop/Blogs.tsx"));
const BlogDetail = lazy(() => import("./pages/shop/BlogDetail.tsx"));
const InvoicePage = lazy(() => import("./pages/shop/InvoicePage.tsx"));
const Relief = lazy(() => import("./pages/shop/Relief.tsx"));
const ReliefCategory = lazy(() => import("./pages/shop/ReliefCategory.tsx"));
const DynamicPage = lazy(() => import("./pages/shop/DynamicPage.tsx"));

const AdminLayout = lazy(() => import("./components/admin/AdminLayout.tsx"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.tsx"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard.tsx"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts.tsx"));
const AdminProductForm = lazy(() => import("./pages/admin/AdminProductForm.tsx"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews.tsx"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories.tsx"));
const AdminBrands = lazy(() => import("./pages/admin/AdminBrands.tsx"));
const AdminAttributes = lazy(() => import("./pages/admin/AdminAttributes.tsx"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders.tsx"));
const AdminInTransit = lazy(() => import("./pages/admin/AdminInTransit.tsx"));
const AdminReadyToShip = lazy(() => import("./pages/admin/AdminReadyToShip.tsx"));
const AdminDelivered = lazy(() => import("./pages/admin/AdminDelivered.tsx"));
const AdminReturns = lazy(() => import("./pages/admin/AdminReturns.tsx"));
const AdminOrderDetails = lazy(() => import("./pages/admin/AdminOrderDetails.tsx"));
const AdminLabels = lazy(() => import("./pages/admin/AdminLabels.tsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.tsx"));
const AdminManageUsers = lazy(() => import("./pages/admin/AdminManageUsers.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));
const AdminTestimonials = lazy(() => import("./pages/admin/AdminTestimonials.tsx"));
const AdminNotificationsPage = lazy(() => import("./pages/admin/AdminNotificationsPage.tsx"));
const AdminOffers = lazy(() => import("./pages/admin/AdminOffers.tsx"));
const AdminCharges = lazy(() => import("./pages/admin/AdminCharges.tsx"));
const CMSHomepage = lazy(() => import("./pages/admin/cms/CMSHomepage.tsx"));
const CMSMegaMenu = lazy(() => import("./pages/admin/cms/CMSMegaMenu.tsx"));
const CMSRelief = lazy(() => import("./pages/admin/cms/CMSRelief.tsx"));
const CMSLegal = lazy(() => import("./pages/admin/cms/CMSLegal.tsx"));
const CMSPages = lazy(() => import("./pages/admin/cms/CMSPages.tsx"));
const CMSBlogs = lazy(() => import("./pages/admin/cms/CMSBlogs.tsx"));
const CMSSeo = lazy(() => import("./pages/admin/cms/CMSSeo.tsx"));
const CMSHeaderFooter = lazy(() => import("./pages/admin/cms/CMSHeaderFooter.tsx"));
const CMSFaqs = lazy(() => import("./pages/admin/cms/CMSFaqs.tsx"));
const AdminEmailTemplates = lazy(() => import("./pages/admin/AdminEmailTemplates.tsx"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics.tsx"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs.tsx"));
const AdminBackups = lazy(() => import("./pages/admin/AdminBackups.tsx"));
const MediaLibrary = lazy(() => import("./pages/admin/media/MediaLibrary.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="notranslate" translate="no">
            <ScrollToTop />
            <SEOInjector />
            <WishlistProvider>
              <CartProvider>
                <AdminProvider>
                  <ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold mb-4">Oops! Something went wrong</h1><p className="text-gray-600 mb-4">Please refresh the page to continue.</p><button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-white rounded">Refresh Page</button></div></div>}>
                    <MaintenanceGuard>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route element={<SiteLayout />}>
                            <Route path="/" element={<Index />} />
                            <Route path="/relief" element={<Relief />} />
                            <Route path="/relief/category/:slug" element={<Category />} />
                            <Route path="/relief/:slug" element={<ReliefCategory />} />
                            <Route path="/category" element={<Category />} />
                            <Route path="/category/:slug" element={<Category />} />
                            <Route path="/deals" element={<Navigate to="/category/deals" replace />} />
                            <Route path="/product/:slug" element={<ProductPage />} />
                            <Route path="/cart" element={<Cart />} />
                            <Route path="/checkout" element={<Checkout />} />
                            <Route path="/checkout/success" element={<Checkout />} />
                            <Route path="/checkout/cancel" element={<Checkout />} />
                            <Route path="/checkout/retry/:orderId" element={<CheckoutRetry />} />
                            <Route path="/search" element={<Search />} />
                            <Route path="/account" element={<AccountAuth />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/dashboard" element={<UserDashboard />} />
                            <Route path="/faqs" element={<Faqs />} />
                            <Route path="/blogs" element={<Blogs />} />
                            <Route path="/blogs/:slug" element={<BlogDetail />} />
                            <Route path="/wishlist" element={<Wishlist />} />
                            <Route path="/:slug" element={<DynamicPage />} />
                            <Route path="*" element={<NotFound />} />
                          </Route>

                          <Route path="/invoice" element={<InvoicePage />} />

                          <Route path="/admin/login" element={<AdminLogin />} />
                          <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<Dashboard />} />
                            <Route path="analytics" element={<AdminAnalytics />} />
                            <Route path="products" element={<AdminProducts />} />
                            <Route path="products/new" element={<AdminProductForm />} />
                            <Route path="products/:id/edit" element={<AdminProductForm />} />
                            <Route path="products/:id/reviews" element={<AdminReviews />} />
                            <Route path="categories" element={<AdminCategories />} />
                            <Route path="brands" element={<AdminBrands />} />
                            <Route path="attributes" element={<AdminAttributes />} />
                            <Route path="orders" element={<AdminOrders />} />
                            <Route path="orders/ready-to-ship" element={<AdminReadyToShip />} />
                            <Route path="orders/in-transit" element={<AdminInTransit />} />
                            <Route path="orders/delivered" element={<AdminDelivered />} />
                            <Route path="orders/returns" element={<AdminReturns />} />
                            <Route path="orders/labels" element={<AdminLabels />} />
                            <Route path="orders/:id" element={<AdminOrderDetails />} />
                            <Route path="offers" element={<AdminOffers />} />
                            <Route path="charges" element={<AdminCharges />} />
                            <Route path="testimonials" element={<AdminTestimonials />} />
                            <Route path="cms" element={<Navigate to="/admin/cms/homepage" replace />} />
                            <Route path="cms/homepage" element={<CMSHomepage />} />
                            <Route path="cms/megamenu" element={<CMSMegaMenu />} />
                            <Route path="cms/header-footer" element={<CMSHeaderFooter />} />
                            <Route path="cms/faqs" element={<CMSFaqs />} />
                            <Route path="cms/relief" element={<CMSRelief />} />
                            <Route path="cms/:kind" element={<CMSLegal />} />
                            <Route path="cms/pages" element={<CMSPages />} />
                            <Route path="cms/blogs" element={<CMSBlogs />} />
                            <Route path="cms/seo" element={<CMSSeo />} />
                            <Route path="cms/email-templates" element={<AdminEmailTemplates />} />
                            <Route path="storage" element={<MediaLibrary />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route path="manage-users" element={<AdminManageUsers />} />
                            <Route path="settings" element={<AdminSettings />} />
                            <Route path="logs" element={<AdminLogs />} />
                            <Route path="backups" element={<AdminBackups />} />
                            <Route path="notifications" element={<AdminNotificationsPage />} />
                          </Route>
                        </Routes>
                      </Suspense>
                    </MaintenanceGuard>
                  </ErrorBoundary>
                </AdminProvider>
              </CartProvider>
            </WishlistProvider>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
