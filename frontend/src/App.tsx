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
import Wishlist from "./pages/shop/Wishlist.tsx";
import { SiteLayout } from "./components/layout/SiteLayout.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import { WishlistProvider } from "./context/WishlistContext.tsx";
import { AdminProvider } from "./context/AdminContext.tsx";
import { AdminLayout } from "./components/admin/AdminLayout.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import AdminProducts from "./pages/admin/AdminProducts.tsx";
import AdminProductForm from "./pages/admin/AdminProductForm.tsx";
import AdminCategories from "./pages/admin/AdminCategories.tsx";
import AdminBrands from "./pages/admin/AdminBrands.tsx";
import AdminAttributes from "./pages/admin/AdminAttributes.tsx";
import AdminOrders from "./pages/admin/AdminOrders.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import CMSHomepage from "./pages/admin/cms/CMSHomepage.tsx";
import CMSMegaMenu from "./pages/admin/cms/CMSMegaMenu.tsx";
import CMSRelief from "./pages/admin/cms/CMSRelief.tsx";
import CMSLegal from "./pages/admin/cms/CMSLegal.tsx";
import CMSPages from "./pages/admin/cms/CMSPages.tsx";
import CMSBlogs from "./pages/admin/cms/CMSBlogs.tsx";
import CMSSeo from "./pages/admin/cms/CMSSeo.tsx";
import { Navigate } from "react-router-dom";
import UserDashboard from "./pages/shop/UserDashboard.tsx";

import Relief from "./pages/shop/Relief.tsx";
import ReliefCategory from "./pages/shop/ReliefCategory.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
                  <Route path="/category/:slug" element={<Category />} />
                  <Route path="/product/:slug" element={<ProductPage />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/account" element={<UserDashboard />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* Admin */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="products/new" element={<AdminProductForm />} />
                  <Route path="products/:id/edit" element={<AdminProductForm />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="brands" element={<AdminBrands />} />
                  <Route path="attributes" element={<AdminAttributes />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="cms" element={<Navigate to="/admin/cms/homepage" replace />} />
                  <Route path="cms/homepage" element={<CMSHomepage />} />
                  <Route path="cms/megamenu" element={<CMSMegaMenu />} />
                  <Route path="cms/relief" element={<CMSRelief />} />
                  <Route path="cms/:kind" element={<CMSLegal />} />
                  <Route path="cms/pages" element={<CMSPages />} />
                  <Route path="cms/blogs" element={<CMSBlogs />} />
                  <Route path="cms/seo" element={<CMSSeo />} />
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
