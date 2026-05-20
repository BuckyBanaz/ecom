import { Link } from "react-router-dom";
import { Lightbulb } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`} aria-label="Lampgigant home">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
        <Lightbulb size={20} className="fill-primary-foreground" />
      </span>
      <span className="text-xl font-black tracking-tight">
        <span className="text-primary">LAMP</span>
        <span className="text-foreground">GIGANT</span>
      </span>
    </Link>
  );
}