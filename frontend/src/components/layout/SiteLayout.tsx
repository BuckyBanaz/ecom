import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MiniCart } from "./MiniCart";

export function SiteLayout() {
  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-clip bg-background">
      <TopBar />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <MiniCart />
    </div>
  );
}