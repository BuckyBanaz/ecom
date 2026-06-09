import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Star, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onSuccess: (review: any) => void;
}

import { reviewRepository } from "@/client/apiClient";

export const ReviewModal = ({ isOpen, onClose, productId, productName, onSuccess }: ReviewModalProps) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // In a real app, you would upload to a server/S3 and get back URLs.
    // Here we'll use a local object URL or base64 for demo purposes, or assuming they are URLs.
    const file = e.target.files?.[0];
    if (file) {
      if (images.length >= 3) {
        toast.error(t("review_modal.toast_max_images"));
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages([...images, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !title || !text) {
      toast.error(t("review_modal.toast_fill_required"));
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await reviewRepository.create(productId, { name, rating, title, text, images });
      
      if (data.success) {
        toast.success(t("review_modal.toast_success"));
        onSuccess(data.review);
        setRating(5);
        setName("");
        setTitle("");
        setText("");
        setImages([]);
        onClose();
      } else {
        toast.error(data.error || t("review_modal.toast_failed"));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t("review_modal.toast_network_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("review_modal.title", { product: productName })}</DialogTitle>
          <DialogDescription className="sr-only">{t("review_modal.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          
          <div className="space-y-2">
            <Label>{t("review_modal.rating")}</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{t("review_modal.your_name")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("review_modal.name_placeholder")} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">{t("review_modal.review_title")}</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("review_modal.title_placeholder")} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="text">{t("review_modal.review_content")}</Label>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("review_modal.content_placeholder")}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t("review_modal.add_photos")}</Label>
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative w-16 h-16 border rounded bg-muted">
                  <img src={img} alt={t("review_modal.image_preview_alt")} className="w-full h-full object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <label className="w-16 h-16 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors text-muted-foreground">
                  <Upload className="h-5 w-5 mb-1" />
                  <span className="text-[10px]">{t("review_modal.upload")}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t mt-6">
            <Button type="button" variant="outline" onClick={onClose}>{t("review_modal.cancel")}</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("review_modal.submitting") : t("review_modal.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
