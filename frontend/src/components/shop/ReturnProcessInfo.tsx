import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ReturnProcessInfo({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                "text-purple-600 hover:bg-purple-100 hover:text-purple-800 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400",
                className,
              )}
              aria-label={t("returns.process_info_title")}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          {t("returns.process_info_tooltip")}
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80 p-4 text-xs" side="top" align="start">
        <p className="font-semibold text-sm mb-2">{t("returns.process_info_title")}</p>
        <p className="text-muted-foreground mb-3">{t("returns.process_info_intro")}</p>
        <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground mb-3">
          <li>{t("returns.return_step_1")}</li>
          <li>{t("returns.return_step_2")}</li>
          <li>{t("returns.return_step_3")}</li>
          <li>{t("returns.return_step_4")}</li>
        </ol>
        <p className="text-muted-foreground border-t pt-2">{t("returns.process_info_refund_note")}</p>
      </PopoverContent>
    </Popover>
  );
}
