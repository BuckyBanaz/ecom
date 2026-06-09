import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/i18n";

/**
 * Sets the `googtrans` cookie that controls the Google Translate widget so the
 * entire page (including dynamic API content) is translated from Dutch into
 * the chosen language. Resetting to Dutch removes the cookie and reloads.
 *
 * `googtrans` cookie format: `/<source>/<target>` (e.g. `/nl/en`).
 * The cookie is written for both the current host and the parent domain so it
 * works on production sub-domains as well.
 */
function setGoogleTranslateCookie(target: SupportedLanguage) {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const parts = hostname.split(".");
  const rootDomain = parts.length > 1 ? "." + parts.slice(-2).join(".") : hostname;

  if (target === DEFAULT_LANGUAGE) {
    // Clear so the Google widget no longer re-translates the page.
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    if (rootDomain) {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${rootDomain}`;
    }
    return;
  }

  const value = `/${DEFAULT_LANGUAGE}/${target}`;
  document.cookie = `googtrans=${value}; path=/`;
  if (rootDomain) {
    document.cookie = `googtrans=${value}; path=/; domain=${rootDomain}`;
  }
}

interface LanguageSwitcherProps {
  /** Compact mode: icon-only trigger (for header). */
  compact?: boolean;
  /** Optional className applied to the trigger button. */
  className?: string;
}

export function LanguageSwitcher({ compact = false, className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const [current, setCurrent] = useState<SupportedLanguage>(
    (i18n.language?.split("-")[0] as SupportedLanguage) || DEFAULT_LANGUAGE,
  );

  useEffect(() => {
    const handler = (lng: string) => {
      const code = lng.split("-")[0] as SupportedLanguage;
      setCurrent(code);
    };
    i18n.on("languageChanged", handler);
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, [i18n]);

  const changeLanguage = (code: SupportedLanguage) => {
    if (code === current) return;
    // 1. Update i18next for static (keyed) UI strings.
    i18n.changeLanguage(code);
    // 2. Drive the Google Translate widget so dynamic API content also gets
    //    translated. A reload is required for the widget to (un)apply.
    setGoogleTranslateCookie(code);
    window.location.reload();
  };

  const active =
    SUPPORTED_LANGUAGES.find((l) => l.code === current) ?? SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("language.select")}
          translate="no"
          className={cn(
            "notranslate gap-1.5 px-2 h-9 rounded-full text-foreground/80 hover:text-foreground hover:bg-muted",
            className,
          )}
        >
          {compact ? (
            <Globe size={18} />
          ) : (
            <>
              <Globe size={16} className="text-muted-foreground" />
              <span className="text-xs font-semibold tracking-wide uppercase">
                {active.code}
              </span>
              <ChevronDown size={14} className="text-muted-foreground -ml-0.5" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[12rem] notranslate p-1.5 rounded-xl shadow-lg"
        translate="no"
      >
        <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
          {t("language.label")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = current === lang.code;
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={cn(
                "flex items-center justify-between gap-3 cursor-pointer rounded-lg px-2.5 py-2 text-sm",
                isActive && "bg-primary/5 text-primary font-medium",
              )}
            >
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="inline-flex h-5 w-5 items-center justify-center text-base leading-none"
                >
                  {lang.flag}
                </span>
                <span>{lang.label}</span>
              </span>
              {isActive && <Check size={15} className="text-primary shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcher;
