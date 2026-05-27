import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductBlockFormProps {
  productType: string;
  setProductType: (val: string) => void;
}

export function ProductBlockForm({ productType, setProductType }: ProductBlockFormProps) {
  return (
    <div className="space-y-2">
      <Label>Product Collection Type</Label>
      <Select value={productType} onValueChange={setProductType}>
        <SelectTrigger>
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="bestsellers">Bestsellers</SelectItem>
          <SelectItem value="featured">Featured</SelectItem>
          <SelectItem value="new-arrivals">New Arrivals</SelectItem>
          <SelectItem value="sale">On Sale</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
