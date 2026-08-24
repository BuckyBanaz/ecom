import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Upload, X, Loader2, RotateCcw, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { returnsRepository } from "@/client/apiClient";
import { toast } from "sonner";
import {
  filterReturnPhotoFiles,
  MAX_RETURN_NOTE_LENGTH,
  MAX_RETURN_PHOTOS,
  RETURN_REASONS,
  type ReturnEligibilityResult,
  validateReturnSubmitInput,
} from "@/utils/returnValidation";

interface ReturnRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  returnEligibility: ReturnEligibilityResult;
  onSuccess: () => void;
}

export function ReturnRequestModal({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  returnEligibility,
  onSuccess,
}: ReturnRequestModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reason, setReason] = useState<string>("");
  const [customerNote, setCustomerNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setReason("");
    setCustomerNote("");
    setPhotos([]);
    previews.forEach((p) => URL.revokeObjectURL(p));
    setPreviews([]);
  };

  const handleClose = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted = filterReturnPhotoFiles(Array.from(files));
    if (accepted.length < files.length) {
      toast.error(t("returns.toast_photos_type"));
    }
    const next = [...photos, ...accepted].slice(0, MAX_RETURN_PHOTOS);
    previews.forEach((p) => URL.revokeObjectURL(p));
    setPhotos(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const validationError = validateReturnSubmitInput({
      reason,
      photos,
      customerNote,
      eligibility: returnEligibility,
    });
    if (validationError) {
      toast.error(t(validationError));
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("orderId", orderId);
      formData.append("reason", reason);
      if (customerNote.trim()) formData.append("customerNote", customerNote.trim());
      photos.forEach((file) => formData.append("photos", file));

      await returnsRepository.create(formData);
      toast.success(t("returns.toast_submitted"));
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("returns.toast_submit_failed");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = returnEligibility.allowed;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            {t("returns.modal_title")}
          </DialogTitle>
          <DialogDescription>
            {t("returns.modal_desc", { orderNumber })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("returns.reason_label")}</Label>
            <Select value={reason} onValueChange={setReason} disabled={!canSubmit}>
              <SelectTrigger>
                <SelectValue placeholder={t("returns.reason_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`returns.reasons.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("returns.note_label")}</Label>
            <Textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder={t("returns.note_placeholder")}
              rows={3}
              maxLength={MAX_RETURN_NOTE_LENGTH}
              disabled={!canSubmit}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("returns.photos_label")}</Label>
            <p className="text-xs text-muted-foreground">{t("returns.photos_hint")}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              disabled={!canSubmit}
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative h-20 w-20 rounded-lg overflow-hidden border">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"
                    disabled={!canSubmit}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_RETURN_PHOTOS && canSubmit && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 transition"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-[10px]">{t("returns.add_photo")}</span>
                </button>
              )}
            </div>
            {photos.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg bg-muted/40 p-3">
                <ImageIcon className="h-4 w-4 shrink-0" />
                {t("returns.photos_required_hint")}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            {t("returns.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !canSubmit} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {t("returns.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
