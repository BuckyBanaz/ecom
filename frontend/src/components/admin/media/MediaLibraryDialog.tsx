import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { MediaLibraryCore } from "./MediaLibraryCore";

interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onSelect: (url: string) => void;
  allowMultiple?: boolean;
  onSelectMultiple?: (urls: string[]) => void;
}

export function MediaLibraryDialog({ open, onOpenChange, onClose, onSelect, allowMultiple, onSelectMultiple }: MediaLibraryDialogProps) {
  const { t } = useTranslation();
  const handleClose = (isOpen: boolean) => {
    if (onOpenChange) onOpenChange(isOpen);
    if (!isOpen && onClose) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl p-0 h-[65vh] overflow-hidden bg-white">
        <MediaLibraryCore 
          isDialog={true} 
          allowMultiple={allowMultiple}
          onSelect={(url) => {
            onSelect(url);
            handleClose(false);
          }}
          onSelectMultiple={(urls) => {
            if (onSelectMultiple) onSelectMultiple(urls);
            handleClose(false);
          }}
          onCancel={() => handleClose(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
