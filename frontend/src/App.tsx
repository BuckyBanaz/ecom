import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Category from "./pages/shop/Category.tsx";
import ProductPage from "./pages/shop/Product.tsx";
import Cart from "./pages/shop/Cart.tsx";
import Checkout from "./pages/shop/Checkout.tsx";
import Search from "./pages/shop/Search.tsx";
import Account from "./pages/shop/Account.tsx";
import Help from "./pages/shop/Help.tsx";
import Faqs from "./pages/shop/Faqs.tsx";
import Wishlist from "./pages/shop/Wishlist.tsx";
import Blogs from "./pages/shop/Blogs.tsx";
import BlogDetail from "./pages/shop/BlogDetail.tsx";
import { SiteLayout } from "./components/layout/SiteLayout.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import { WishlistProvider } from "./context/WishlistContext.tsx";
import { AdminProvider } from "./context/AdminContext.tsx";
import { AdminLayout } from "./components/admin/AdminLayout.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import AdminProducts from "./pages/admin/AdminProducts.tsx";
import AdminProductForm from "./pages/admin/AdminProductForm.tsx";
import AdminReviews from "./pages/admin/AdminReviews.tsx";
import AdminCategories from "./pages/admin/AdminCategories.tsx";
import AdminBrands from "./pages/admin/AdminBrands.tsx";
import AdminAttributes from "./pages/admin/AdminAttributes.tsx";
import AdminOrders from "./pages/admin/AdminOrders.tsx";
import AdminInTransit from "./pages/admin/AdminInTransit.tsx";
import AdminReadyToShip from "./pages/admin/AdminReadyToShip.tsx";

import AdminDelivered from "./pages/admin/AdminDelivered.tsx";
import AdminReturns from "./pages/admin/AdminReturns.tsx";
import AdminOrderDetails from "./pages/admin/AdminOrderDetails.tsx";
import AdminInvoices from "./pages/admin/AdminInvoices.tsx";
import AdminLabels from "./pages/admin/AdminLabels.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminTestimonials from "./pages/admin/AdminTestimonials.tsx";
import AdminOffers from "./pages/admin/AdminOffers.tsx";
import AdminCharges from "./pages/admin/AdminCharges.tsx";
import CMSHomepage from "./pages/admin/cms/CMSHomepage.tsx";
import CMSMegaMenu from "./pages/admin/cms/CMSMegaMenu.tsx";
import CMSRelief from "./pages/admin/cms/CMSRelief.tsx";
import CMSLegal from "./pages/admin/cms/CMSLegal.tsx";
import CMSPages from "./pages/admin/cms/CMSPages.tsx";
import CMSBlogs from "./pages/admin/cms/CMSBlogs.tsx";
import CMSSeo from "./pages/admin/cms/CMSSeo.tsx";
import CMSHeaderFooter from "./pages/admin/cms/CMSHeaderFooter.tsx";
import CMSFaqs from "./pages/admin/cms/CMSFaqs.tsx";
import AdminEmailTemplates from "./pages/admin/AdminEmailTemplates.tsx";
import MediaLibrary from "./pages/admin/media/MediaLibrary.tsx";
import { Navigate } from "react-router-dom";
import UserDashboard from "./pages/shop/UserDashboard.tsx";
import InvoicePage from "./pages/shop/InvoicePage.tsx";

import Relief from "./pages/shop/Relief.tsx";
import ReliefCategory from "./pages/shop/ReliefCategory.tsx";
import DynamicPage from "./pages/shop/DynamicPage.tsx";
import AccountAuth from "./pages/auth/AccountAuth.tsx";
import ForgotPassword from "./pages/auth/ForgotPassword.tsx";
import ResetPassword from "./pages/auth/ResetPassword.tsx";
import { ScrollToTop } from "./components/layout/ScrollToTop.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <WishlistProvider>
          <CartProvider>
            <AdminProvider>
              <Routes>
                {/* Storefront */}
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
                  <Route path="/search" element={<Search />} />
                  <Route path="/account" element={<AccountAuth />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<UserDashboard />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/faqs" element={<Faqs />} />
                  <Route path="/blogs" element={<Blogs />} />
                  <Route path="/blogs/:slug" element={<BlogDetail />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/:slug" element={<DynamicPage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* Standalone Route for Print/Invoice */}
                <Route path="/invoice" element={<InvoicePage />} />

                {/* Admin */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
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
                  <Route path="orders/invoices" element={<AdminInvoices />} />
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
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
              </Routes>
            </AdminProvider>
          </CartProvider>
        </WishlistProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
