import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Trash2, Star, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveImgUrl } from "@/utils/image";
import { toast } from "sonner";
import { SafeImage } from "@/components/ui/SafeImage";
import { reviewRepository, productRepository } from "@/client/apiClient";

const AdminReviews = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<any[]>([]);
  const [productName, setProductName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        if (!id) return;
        const data = await reviewRepository.getByProduct(id);
        if (data.success) {
          setReviews(data.reviews || []);
        } else {
          toast.error(t("admin_reviews.toast_load_failed"));
        }
        
        // Also fetch product name just for display
        const pData = await productRepository.getByIdOrSlug(id);
        if (pData.success && pData.data) {
          setProductName(pData.data.name);
        } else if (pData.success && pData.product) {
          setProductName(pData.product.name);
        }
      } catch (error) {
        console.error(error);
        toast.error(t("admin_reviews.toast_error_loading"));
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchReviews();
    }
  }, [id]);

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm(t("admin_reviews.confirm_delete"))) return;

    try {
      const data = await reviewRepository.delete(reviewId);
      
      if (data.success) {
        toast.success(t("admin_reviews.toast_delete_success"));
        setReviews(prev => prev.filter(r => r.id !== reviewId));
      } else {
        toast.error(data.error || t("admin_reviews.toast_delete_failed"));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t("admin_reviews.toast_delete_error"));
    }
  };

  return (
    <div className="container-page py-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => navigate("/admin/products")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("admin_reviews.title")}</h1>
          <p className="text-muted-foreground">{t("admin_reviews.subtitle", { name: productName || "Product" })}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">{t("admin_reviews.table_customer")}</th>
                <th className="px-4 py-3 font-medium">{t("admin_reviews.table_rating")}</th>
                <th className="px-4 py-3 font-medium">{t("admin_reviews.table_review")}</th>
                <th className="px-4 py-3 font-medium">{t("admin_reviews.table_media")}</th>
                <th className="px-4 py-3 font-medium">{t("admin_reviews.table_date")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("admin_reviews.table_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {t("admin_reviews.loading")}
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {t("admin_reviews.empty")}
                  </td>
                </tr>
              ) : (
                reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 font-medium">{r.name}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center text-yellow-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-current" : "text-gray-300"}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 max-w-xs">
                      <p className="font-semibold">{r.title}</p>
                      <p className="text-muted-foreground line-clamp-2 mt-1">{r.text}</p>
                    </td>
                    <td className="px-4 py-4">
                      {r.images && r.images.length > 0 ? (
                        <div className="flex gap-1">
                          {r.images.slice(0, 3).map((img: string, i: number) => (
                            <SafeImage key={i} src={resolveImgUrl(img)} alt="Review" className="w-10 h-10 object-cover rounded border" />
                          ))}
                          {r.images.length > 3 && (
                            <div className="w-10 h-10 flex items-center justify-center bg-muted rounded border text-xs font-medium">
                              {t("admin_reviews.media_more", { count: r.images.length - 3 })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> {t("admin_reviews.media_none")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(r.id)}
                        title={t("admin_reviews.delete_title")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReviews;
