import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ShoppingBag, Check } from 'lucide-react';
import { InventoryItem, inventoryRepository } from '@/client/inventoryRepository';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Props {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AllocateWebshopModal: React.FC<Props> = ({ item, isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [allocated, setAllocated] = useState<number>(item?.webshopAllocated || 0);
  const [isPublished, setIsPublished] = useState<boolean>(item?.isPublishedWebshop ?? true);
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (item) {
      setAllocated(item.webshopAllocated);
      setIsPublished(item.isPublishedWebshop);
      setReason('');
    }
  }, [item]);

  if (!item) return null;

  const storageReserve = Math.max(0, item.quantityOnHand - allocated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await inventoryRepository.allocateWebshop({
        inventoryItemId: item.id,
        webshopAllocated: allocated,
        isPublishedWebshop: isPublished,
        reason: reason || 'Webshop allocation adjusted by admin',
      });

      toast.success(t('inventory.allocate_success', 'Webshop allocation updated successfully'));
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || t('inventory.allocate_error', 'Failed to update webshop allocation'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {t('inventory.allocate_webshop_title', 'Webshop Channel Quota Allocation')}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">
                {item.variant.product.name} ({item.variant.sku})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Dual-Layer Stock Split Visualizer */}
          <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {t('inventory.total_physical_storage', 'Total Physical in Storage (Warehouse)')}:
              </span>
              <span className="text-sm font-bold text-foreground">
                {item.quantityOnHand} {t('inventory.units', 'units')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 mb-1">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {t('inventory.webshop_for_sale', 'Online Webshop')}
                </div>
                <p className="text-lg font-bold text-emerald-600">
                  {allocated} <span className="text-xs font-normal text-muted-foreground">{t('inventory.units', 'units')}</span>
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {t('inventory.percent_of_warehouse', '{{pct}}% of warehouse stock', {
                    pct: item.quantityOnHand > 0 ? Math.round((allocated / item.quantityOnHand) * 100) : 0,
                  })}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 mb-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  {t('inventory.safety_buffer_reserve', 'Storage Reserve')}
                </div>
                <p className="text-lg font-bold text-foreground">
                  {storageReserve} <span className="text-xs font-normal text-muted-foreground">{t('inventory.units', 'units')}</span>
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {t('inventory.percent_offline_safety', '{{pct}}% offline / safety', {
                    pct: item.quantityOnHand > 0 ? Math.round((storageReserve / item.quantityOnHand) * 100) : 0,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Allocation Slider & Quick Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">{t('inventory.allocate_amount_label', 'Units allocated to online store')}</Label>
              <span className="text-xs font-bold text-emerald-600">{allocated} {t('inventory.units', 'units')}</span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max={item.quantityOnHand}
              value={allocated}
              onChange={(e) => setAllocated(parseInt(e.target.value, 10) || 0)}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            {/* Quick Percentage Presets */}
            <div className="flex gap-1.5 pt-1">
              {[
                { label: '0%', val: 0 },
                { label: '25%', val: Math.floor(item.quantityOnHand * 0.25) },
                { label: '50%', val: Math.floor(item.quantityOnHand * 0.5) },
                { label: '75%', val: Math.floor(item.quantityOnHand * 0.75) },
                { label: t('inventory.all_100', '100% (All)'), val: item.quantityOnHand },
              ].map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAllocated(preset.val)}
                  className="flex-1 text-[11px] h-7 px-0"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Direct Input */}
          <div className="space-y-2">
            <Label className="text-xs">{t('inventory.direct_quota_input', 'Or enter exact quota number')}</Label>
            <Input
              type="number"
              min="0"
              max={item.quantityOnHand}
              value={allocated}
              onChange={(e) => setAllocated(Math.min(item.quantityOnHand, Math.max(0, parseInt(e.target.value, 10) || 0)))}
              className="font-bold h-9"
            />
          </div>

          {/* Publish Channel Toggle */}
          <div className="p-3 rounded-lg border bg-card flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-foreground block">
                {t('inventory.publish_webshop_toggle', 'Publish to Webshop Channel')}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {t('inventory.publish_webshop_toggle_desc', 'When enabled, this SKU is active for online customers')}
              </span>
            </div>
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded border-input text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
          </div>

          <DialogFooter className="pt-4 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="text-xs"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="text-xs gap-1.5"
            >
              <Check className="h-4 w-4" />
              <span>{submitting ? t('common.saving', 'Saving...') : t('inventory.save_allocation', 'Save Allocation')}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
