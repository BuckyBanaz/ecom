import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { MediaLibraryCore } from "./MediaLibraryCore";

interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  allowMultiple?: boolean;
  onSelectMultiple?: (urls: string[]) => void;
}

export function MediaLibraryDialog({ open, onOpenChange, onSelect, allowMultiple, onSelectMultiple }: MediaLibraryDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 h-[65vh] overflow-hidden bg-white">
        <MediaLibraryCore 
          isDialog={true} 
          allowMultiple={allowMultiple}
          onSelect={(url) => {
            onSelect(url);
            onOpenChange(false);
          }}
          onSelectMultiple={(urls) => {
            if (onSelectMultiple) onSelectMultiple(urls);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
