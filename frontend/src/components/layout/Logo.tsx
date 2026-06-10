import { Link } from "react-router-dom";

export function Logo({ className = "", forceLight = false }: { className?: string, forceLight?: boolean }) {
  return (
    <Link to="/" className={`inline-flex min-w-0 max-w-[11rem] items-center gap-1.5 sm:max-w-none sm:gap-2 md:gap-3 ${className}`} aria-label="Schip & Ster home">
      <img src="/favicon.png" alt="Schip & Ster Logo" className="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8 md:h-10 md:w-10" />
      <div className="h-4 w-px shrink-0 bg-[#b17e4a]/70 sm:h-5 md:h-6" />
      <span
        className={`min-w-0 truncate text-sm font-normal tracking-wide text-[#593c28] sm:text-lg md:text-[21px] ${!forceLight ? 'dark:text-[#f3e8ff]' : ''} leading-none`}
        style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", paddingBottom: "1px" }}
      >
        Schip &amp; Ster
      </span>
    </Link>
  );
}