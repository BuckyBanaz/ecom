import { Link } from "react-router-dom";

export function Logo({ className = "", forceLight = false }: { className?: string, forceLight?: boolean }) {
  return (
    <Link to="/" className={`inline-flex min-w-0 items-center gap-2 md:gap-3 ${className}`} aria-label="Schip & Ster home">
      <img src="/favicon.png" alt="Schip & Ster Logo" className="h-8 w-8 md:h-10 md:w-10 object-contain shrink-0" />
      <div className="hidden h-5 w-px shrink-0 bg-[#b17e4a]/70 sm:block md:h-6" />
      <span
        className={`hidden text-lg font-normal tracking-wide text-[#593c28] sm:inline md:text-[21px] ${!forceLight ? 'dark:text-[#f3e8ff]' : ''} truncate leading-none`}
        style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", paddingBottom: "1px" }}
      >
        Schip &amp; Ster
      </span>
    </Link>
  );
}