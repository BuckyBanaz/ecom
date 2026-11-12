import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Minus, Warehouse, Check } from 'lucide-react';
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

export const StockAdjustmentModal: React.FC<Props> = ({ item, isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'DELTA' | 'EXACT'>('DELTA');
  const [delta, setDelta] = useState<number>(0);
  const [exactCount, setExactCount] = useState<number>(item?.quantityOnHand || 0);
  const [reason, setReason] = useState<string>('Cycle count correction');
  const [customNote, setCustomNote] = useState<string>('');
  const [binLocation, setBinLocation] = useState<string>(item?.binLocation || '');
  const [submitting, setSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (item) {
      setExactCount(item.quantityOnHand);
      setDelta(0);
      setBinLocation(item.binLocation || '');
    }
  }, [item]);

  if (!item) return null;

  const calculatedNewTotal = mode === 'DELTA' ? Math.max(0, item.quantityOnHand + delta) : exactCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fullReason = customNote ? `${reason}: ${customNote}` : reason;
      await inventoryRepository.adjustStorage({
        inventoryItemId: item.id,
        quantityChange: mode === 'DELTA' ? delta : undefined,
        setExactCount: mode === 'EXACT' ? exactCount : undefined,
        reason: fullReason,
        binLocation: binLocation.trim() || undefined,
      });

      toast.success(t('inventory.adjust_success', 'Storage stock adjusted successfully'));
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || t('inventory.adjust_error', 'Failed to adjust stock'));
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
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {t('inventory.adjust_storage_title', 'Adjust Physical Storage Stock')}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">
                {item.variant.product.name} ({item.variant.sku})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Stock Preview Card */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/30 border">
            <div>
              <span className="text-xs text-muted-foreground font-medium">
                {t('inventory.current_storage_count', 'Current Storage Count')}
              </span>
              <p className="text-xl font-bold text-foreground mt-0.5">
                {item.quantityOnHand} <span className="text-xs font-normal text-muted-foreground">{t('inventory.units', 'units')}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground font-medium">
                {t('inventory.new_storage_total', 'New Calculated Total')}
              </span>
              <p className={`text-xl font-bold mt-0.5 ${calculatedNewTotal !== item.quantityOnHand ? 'text-primary' : 'text-foreground'}`}>
                {calculatedNewTotal} <span className="text-xs font-normal text-muted-foreground">{t('inventory.units', 'units')}</span>
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('DELTA')}
              className={`py-1.5 rounded-md transition-all ${
                mode === 'DELTA'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('inventory.mode_delta', 'Relative Change (+ / -)')}
            </button>
            <button
              type="button"
              onClick={() => setMode('EXACT')}
              className={`py-1.5 rounded-md transition-all ${
                mode === 'EXACT'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('inventory.mode_exact', 'Set Exact Physical Count')}
            </button>
          </div>

          {/* Input Based on Mode */}
          {mode === 'DELTA' ? (
            <div className="space-y-2">
              <Label className="text-xs">{t('inventory.quantity_delta_label', 'Quantity to Add / Remove')}</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setDelta((d) => d - 10)}
                  className="h-9 w-9 text-xs"
                >
                  -10
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setDelta((d) => d - 1)}
                  className="h-9 w-9"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={delta}
                  onChange={(e) => setDelta(parseInt(e.target.value, 10) || 0)}
                  className="text-center font-bold h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setDelta((d) => d + 1)}
                  className="h-9 w-9"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setDelta((d) => d + 10)}
                  className="h-9 w-9 text-xs"
                >
                  +10
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs">{t('inventory.exact_count_label', 'Exact Physical Storage Count')}</Label>
              <Input
                type="number"
                min="0"
                value={exactCount}
                onChange={(e) => setExactCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="font-bold h-9"
              />
            </div>
          )}

          {/* Rack Location */}
          <div className="space-y-2">
            <Label className="text-xs">{t('inventory.shelf_location_label', 'Warehouse Shelf / Rack Bin Location')}</Label>
            <Input
              type="text"
              value={binLocation}
              onChange={(e) => setBinLocation(e.target.value)}
              placeholder="e.g. Rack-A-Shelf-04"
              className="font-mono text-xs h-9"
            />
          </div>

          {/* Reason Preset */}
          <div className="space-y-2">
            <Label className="text-xs">{t('inventory.reason_label', 'Reason for Adjustment')}</Label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Cycle count correction">{t('inventory.reason_cycle_count', 'Cycle count correction')}</option>
              <option value="Purchase order arrival (Inward)">{t('inventory.reason_po_arrival', 'Purchase order arrival (Inward)')}</option>
              <option value="Damaged / Broken in warehouse">{t('inventory.reason_damaged', 'Damaged / Broken in warehouse')}</option>
              <option value="Customer return restocked">{t('inventory.reason_return_restock', 'Customer return restocked')}</option>
              <option value="Internal transfer">{t('inventory.reason_transfer', 'Internal warehouse transfer')}</option>
              <option value="Other / Manual adjustment">{t('inventory.reason_other', 'Other / Custom reason')}</option>
            </select>
          </div>

          {/* Custom Note */}
          <div className="space-y-2">
            <Label className="text-xs">{t('inventory.notes_label', 'Additional Notes (Optional)')}</Label>
            <Input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder={t('inventory.notes_placeholder', 'Add ref number or details...')}
              className="text-xs h-9"
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
              disabled={submitting || (mode === 'DELTA' && delta === 0 && binLocation === (item.binLocation || ''))}
              className="text-xs gap-1.5"
            >
              <Check className="h-4 w-4" />
              <span>{submitting ? t('common.saving', 'Saving...') : t('inventory.apply_adjustment', 'Apply Adjustment')}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
