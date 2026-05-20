import { Star, Truck, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export function TopBar() {
  return (
    <div className="hidden border-b bg-topbar text-xs text-foreground md:block">
      <div className="container-page flex h-9 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/help" className="flex items-center gap-1.5 hover:text-primary">
            <Star size={14} className="fill-primary text-primary" />
            <span>
              <strong>15,000+</strong> reviews
            </span>
          </Link>
          <span className="flex items-center gap-1.5">
            <Truck size={14} className="text-primary" />
            Ordered before <strong>22:00</strong>, delivered next day
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={14} className="text-primary" />
            <strong>30-day</strong> returns
          </span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/help" className="hover:text-primary">Business</Link>
          <Link to="/help" className="hover:text-primary">Customer service</Link>
        </div>
      </div>
    </div>
  );
}