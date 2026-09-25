import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { seriesRepository } from "@/client/apiClient";

interface ProductBlockFormProps {
  productType: string;
  setProductType: (val: string) => void;
}

export function ProductBlockForm({ productType, setProductType }: ProductBlockFormProps) {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const [seriesList, setSeriesList] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    setIsMounted(true);
    seriesRepository.getAll().then((res) => {
      if (res.success && res.series) {
        setSeriesList(res.series);
      }
    }).catch((err) => console.error("Failed to load series for product block:", err));
  }, []);

  return (
    <div className="space-y-2">
      <Label>Product Collection Type</Label>
      {isMounted && (
        <Select value={productType} onValueChange={setProductType}>
          <SelectTrigger>
            <SelectValue placeholder="Select collection or list type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Standard Lists</SelectLabel>
              <SelectItem value="bestsellers">Bestsellers</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="new-arrivals">New Arrivals</SelectItem>
              <SelectItem value="sale">On Sale</SelectItem>
            </SelectGroup>
            {seriesList.length > 0 && (
              <SelectGroup>
                <SelectLabel>Collections / Series</SelectLabel>
                {seriesList.map((s) => (
                  <SelectItem key={s.id} value={`series:${s.slug}`}>
                    Collection: {s.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
