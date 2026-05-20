import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube, CreditCard, Truck, ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

const cols = [
  {
    title: "Customer service",
    links: ["Contact", "Shipping & delivery", "Returns", "Payment methods", "Warranty", "FAQ"],
  },
  {
    title: "Shop",
    links: ["Indoor lighting", "Outdoor lighting", "Light bulbs", "Smart home", "Business lighting", "Deals"],
  },
  {
    title: "About Lampgigant",
    links: ["Our story", "Showroom", "Sustainability", "Careers", "Press", "Blog"],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 bg-secondary text-secondary-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo className="text-secondary-foreground [&_span:nth-child(2)>span:nth-child(2)]:text-secondary-foreground" />
          <p className="mt-4 max-w-sm text-sm text-secondary-foreground/70">
            Lampgigant — light up your moment. We carry over 10,000 lighting products with same-day shipping
            and 30-day returns.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <a href="#" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-primary"><Facebook size={18} /></a>
            <a href="#" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-primary"><Instagram size={18} /></a>
            <a href="#" aria-label="Youtube" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-primary"><Youtube size={18} /></a>
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">{c.title}</h3>
            <ul className="space-y-2 text-sm text-secondary-foreground/75">
              {c.links.map((l) => (
                <li key={l}>
                  <Link to="/help" className="hover:text-primary">{l}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-6 text-xs text-secondary-foreground/70 md:flex-row">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><Truck size={14}/> Free shipping over €75</span>
            <span className="flex items-center gap-2"><ShieldCheck size={14}/> Secure checkout</span>
            <span className="flex items-center gap-2"><CreditCard size={14}/> iDEAL · Card · PayPal</span>
          </div>
          <p>© {new Date().getFullYear()} Lampgigant. Demo clone for educational purposes.</p>
        </div>
      </div>
    </footer>
  );
}