import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MediaLibraryCore } from "./MediaLibraryCore";

interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}

export function MediaLibraryDialog({ open, onOpenChange, onSelect }: MediaLibraryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 h-[65vh] overflow-hidden bg-white">
        <MediaLibraryCore 
          isDialog={true} 
          onSelect={(url) => {
            onSelect(url);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
