import { Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SuggestionActionsProps = {
  onAdd?: () => void;
  onDismiss?: () => void;
  onCopy?: () => void;
  addLabel?: string;
  dismissLabel?: string;
  copyLabel?: string;
  addDisabled?: boolean;
  className?: string;
  size?: "sm" | "default";
};

/** Per-suggestion actions: add/use, copy, dismiss. */
export function SuggestionActions({
  onAdd,
  onDismiss,
  onCopy,
  addLabel = "Add",
  dismissLabel = "Skip",
  copyLabel = "Copy",
  addDisabled,
  className,
  size = "sm",
}: SuggestionActionsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 shrink-0", className)}>
      {onAdd && (
        <Button type="button" size={size} className="gap-1 h-7 px-2 text-xs" disabled={addDisabled} onClick={onAdd}>
          <Check className="h-3 w-3" />
          {addLabel}
        </Button>
      )}
      {onCopy && (
        <Button type="button" size={size} variant="outline" className="gap-1 h-7 px-2 text-xs" onClick={onCopy}>
          <Copy className="h-3 w-3" />
          {copyLabel}
        </Button>
      )}
      {onDismiss && (
        <Button type="button" size={size} variant="ghost" className="gap-1 h-7 px-2 text-xs text-muted-foreground" onClick={onDismiss}>
          <X className="h-3 w-3" />
          {dismissLabel}
        </Button>
      )}
    </div>
  );
}
