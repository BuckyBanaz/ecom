import React from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { IconPicker } from "../IconPicker";

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface FeaturesBlockFormProps {
  features: FeatureItem[];
  onAddFeature: () => void;
  onRemoveFeature: (index: number) => void;
  onUpdateFeature: (index: number, key: keyof FeatureItem, value: string) => void;
}

export function FeaturesBlockForm({ features, onAddFeature, onRemoveFeature, onUpdateFeature }: FeaturesBlockFormProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Features Items</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAddFeature}>
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </Button>
      </div>
      {features.map((feat, index) => (
        <div key={index} className="grid grid-cols-12 gap-3 items-start border-b pb-4 last:border-0 last:pb-0">
          <div className="col-span-12 sm:col-span-3">
            <Label className="text-xs mb-1 block">Icon</Label>
            <IconPicker value={feat.icon} onChange={(val) => onUpdateFeature(index, "icon", val)} />
          </div>
          <div className="col-span-12 sm:col-span-4">
            <Label className="text-xs mb-1 block">Title</Label>
            <Input value={feat.title} onChange={(e) => onUpdateFeature(index, "title", e.target.value)} placeholder="Fast delivery" />
          </div>
          <div className="col-span-12 sm:col-span-4">
            <Label className="text-xs mb-1 block">Description</Label>
            <Input value={feat.description} onChange={(e) => onUpdateFeature(index, "description", e.target.value)} placeholder="Short desc..." />
          </div>
          <div className="col-span-12 sm:col-span-1 flex items-end justify-end h-full mt-6">
            <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => onRemoveFeature(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
