import { Link } from "react-router-dom";

export function Logo({ className = "", forceLight = false }: { className?: string, forceLight?: boolean }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 md:gap-3 ${className}`} aria-label="Schip & Ster home">
      <img src="/favicon.png" alt="Schip & Ster Logo" className="h-8 w-8 md:h-10 md:w-10 object-contain shrink-0" />
      <div className="h-5 md:h-6 w-px bg-[#b17e4a]/70 shrink-0" />
      <span
        className={`text-lg md:text-[21px] font-normal tracking-wide text-[#593c28] ${!forceLight ? 'dark:text-[#f3e8ff]' : ''} whitespace-nowrap leading-none`}
        style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", paddingBottom: "1px" }}
      >
        Schip &amp; Ster
      </span>
    </Link>
  );
}