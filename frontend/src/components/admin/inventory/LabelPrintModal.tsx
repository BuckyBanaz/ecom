import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, Layers, FileText, Check } from 'lucide-react';
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
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: InventoryItem[];
  allItems: InventoryItem[];
}

export const LabelPrintModal: React.FC<Props> = ({ isOpen, onClose, selectedItems, allItems }) => {
  const { t } = useTranslation();
  const [layout, setLayout] = useState<'A4_GRID_24' | 'A4_GRID_30' | 'THERMAL_50x30'>('A4_GRID_24');
  const [targetScope, setTargetScope] = useState<'SELECTED' | 'ALL'>(selectedItems.length > 0 ? 'SELECTED' : 'ALL');
  const [copiesPerItem, setCopiesPerItem] = useState<number>(1);
  const [includePrice, setIncludePrice] = useState<boolean>(true);
  const [includeBin, setIncludeBin] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);

  const targetList = targetScope === 'SELECTED' && selectedItems.length > 0 ? selectedItems : allItems;
  const totalLabelsToPrint = targetList.length * copiesPerItem;

  const handleGeneratePdf = async () => {
    if (targetList.length === 0) {
      toast.error(t('inventory.no_items_selected', 'No items selected to print'));
      return;
    }

    setGenerating(true);
    try {
      toast.loading(t('inventory.generating_pdf', 'Generating HD PDF sticker sheet...'), { id: 'pdf-gen' });

      const printPayload = targetList.map((item) => ({
        inventoryItemId: item.id,
        copies: copiesPerItem,
      }));

      const blob = await inventoryRepository.downloadLabelsPdf({
        layout,
        items: printPayload,
        includePrice,
        includeBin,
      });

      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success(t('inventory.pdf_ready', 'PDF generated! Opening print preview...'), { id: 'pdf-gen' });
      onClose();
    } catch (error: any) {
      toast.error(error.message || t('inventory.pdf_error', 'Failed to generate PDF labels'), { id: 'pdf-gen' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {t('inventory.print_label_center', 'QR & Barcode Label Print Center')}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t('inventory.print_stickers_subtitle', 'Generate high-contrast HD stickers for warehouse boxes')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Target Scope Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {t('inventory.items_to_print', 'Select Items to Print')}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetScope('SELECTED')}
                disabled={selectedItems.length === 0}
                className={`py-2.5 px-3 text-xs font-medium rounded-lg border flex flex-col items-center justify-center transition-all ${
                  targetScope === 'SELECTED' && selectedItems.length > 0
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : selectedItems.length === 0
                    ? 'opacity-50 cursor-not-allowed bg-muted border-border text-muted-foreground'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{t('inventory.selected_items_scope', 'Selected Items Only')}</span>
                <span className="text-[11px] font-mono mt-0.5">({selectedItems.length} items)</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetScope('ALL')}
                className={`py-2.5 px-3 text-xs font-medium rounded-lg border flex flex-col items-center justify-center transition-all ${
                  targetScope === 'ALL'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{t('inventory.all_current_scope', 'All Current Items')}</span>
                <span className="text-[11px] font-mono mt-0.5">({allItems.length} items)</span>
              </button>
            </div>
          </div>

          {/* Paper / Layout Format */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {t('inventory.sticker_format_label', 'Sticker Sheet Format')}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'THERMAL_50x30',
                  title: t('inventory.format_thermal_roll', '50x30 mm'),
                  desc: t('inventory.format_thermal_roll_desc', 'Thermal Roll (Zebra/Dymo)'),
                  icon: Printer,
                },
                {
                  id: 'A4_GRID_24',
                  title: t('inventory.format_a4_24', 'A4 (24/Sheet)'),
                  desc: t('inventory.format_a4_24_desc', '3x8 Stickers per page'),
                  icon: Layers,
                },
                {
                  id: 'A4_GRID_30',
                  title: t('inventory.format_a4_30', 'A4 (30/Sheet)'),
                  desc: t('inventory.format_a4_30_desc', '3x10 Compact stickers'),
                  icon: FileText,
                },
              ].map((fmt) => {
                const Icon = fmt.icon;
                const active = layout === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setLayout(fmt.id as any)}
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      active
                        ? 'border-primary bg-primary/10 text-primary shadow-xs'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">{fmt.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{fmt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Copies & Details */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {t('inventory.copies_per_item', 'Copies per SKU')}
              </Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={copiesPerItem}
                onChange={(e) => setCopiesPerItem(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="h-9 font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {t('inventory.total_stickers_count', 'Total Labels to Generate')}
              </Label>
              <div className="h-9 px-3 rounded-md bg-muted border flex items-center font-mono font-bold text-xs text-foreground">
                {totalLabelsToPrint} {t('inventory.stickers', 'stickers')}
              </div>
            </div>
          </div>

          {/* Toggle Inclusions */}
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t('inventory.include_shelf_bin', 'Print Shelf/Bin location on label')}</span>
              <input
                type="checkbox"
                checked={includeBin}
                onChange={(e) => setIncludeBin(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t('inventory.include_retail_price', 'Print Retail Price (€) on label')}</span>
              <input
                type="checkbox"
                checked={includePrice}
                onChange={(e) => setIncludePrice(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={generating}
              className="text-xs"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleGeneratePdf}
              disabled={generating || targetList.length === 0}
              className="text-xs gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>{generating ? t('inventory.generating_pdf', 'Generating HD PDF...') : t('inventory.generate_labels_btn', 'Generate Print PDF')}</span>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
