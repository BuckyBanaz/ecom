import { Link } from "react-router-dom";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-3 ${className}`} aria-label="Schip & Ster home">
      <img src="/favicon.png" alt="Schip & Ster Logo" className="h-10 w-10 object-contain shrink-0" />
      <div className="h-7 w-[1px] bg-[#b17e4a]/70 self-center"></div>
      <span className="text-[22px] font-normal tracking-wide text-[#593c28] dark:text-[#f3e8ff] whitespace-nowrap" style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif" }}>
        Schip & Ster
      </span>
    </Link>
  );
}