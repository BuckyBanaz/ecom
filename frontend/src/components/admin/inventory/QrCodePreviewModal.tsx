import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, Printer, Copy, Check, Download, Loader2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Props {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPrintThermal?: (item: InventoryItem) => void;
}

export const QrCodePreviewModal: React.FC<Props> = ({ item, isOpen, onClose }) => {
  const { t } = useTranslation();
  const [qrData, setQrData] = useState<{
    qrDataUrl: string;
    payload: string;
    sku: string;
    productName: string;
    binLocation: string | null;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      inventoryRepository
        .getQrCode(item.id)
        .then((res) => setQrData(res.data))
        .catch((err) => toast.error(err.message || 'Failed to load QR code'))
        .finally(() => setLoading(false));
    } else {
      setQrData(null);
    }
  }, [isOpen, item]);

  if (!item) return null;

  const handleCopyPayload = () => {
    if (qrData?.payload) {
      navigator.clipboard.writeText(qrData.payload);
      setCopied(true);
      toast.success(t('inventory.payload_copied', 'QR payload copied to clipboard'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadImage = () => {
    if (qrData?.qrDataUrl) {
      const link = document.createElement('a');
      link.href = qrData.qrDataUrl;
      link.download = `QR-${item.variant.sku}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t('inventory.qr_downloaded', 'High-res QR image downloaded'));
    }
  };

  const handlePrintSingle = async () => {
    try {
      toast.loading(t('inventory.generating_pdf', 'Generating Thermal PDF...'), { id: 'pdf-gen' });
      const blob = await inventoryRepository.downloadLabelsPdf({
        layout: 'THERMAL_50x30',
        items: [{ inventoryItemId: item.id, copies: 1 }],
        includePrice: true,
        includeBin: true,
      });

      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success(t('inventory.pdf_ready', 'PDF ready to print!'), { id: 'pdf-gen' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate PDF', { id: 'pdf-gen' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {t('inventory.qr_label_preview', 'QR & Barcode Label')}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                {item.variant.sku}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs">{t('common.loading', 'Generating Ultra-HD QR...')}</p>
            </div>
          ) : qrData ? (
            <>
              {/* Printable Sticker Box Representation */}
              <div className="w-full max-w-[280px] p-4 bg-card rounded-xl border-2 border-dashed border-border shadow-xs flex flex-col items-center space-y-3">
                <p className="text-xs font-bold text-foreground truncate max-w-full">
                  {item.variant.product.name}
                </p>

                <div className="p-2 bg-white rounded-lg shadow-xs border border-border">
                  <img
                    src={qrData.qrDataUrl}
                    alt="Product QR Code"
                    className="w-48 h-48 object-contain [image-rendering:pixelated]"
                  />
                </div>

                <div className="text-center space-y-1">
                  <Badge variant="secondary" className="font-mono text-xs font-bold">
                    {item.variant.sku}
                  </Badge>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {t('inventory.bin_location_label', 'Shelf/Bin')}:{' '}
                    <span className="font-semibold text-primary">
                      {item.binLocation || 'A-01-1'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-2 pt-1">
                <Button
                  onClick={handlePrintSingle}
                  className="w-full gap-2 text-xs font-semibold h-10"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t('inventory.print_thermal_label', 'Print Thermal Sticker (50x30mm)')}</span>
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDownloadImage}
                    className="gap-1.5 text-xs h-9"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    <span>{t('inventory.download_png', 'Download PNG')}</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleCopyPayload}
                    className="gap-1.5 text-xs h-9"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? t('inventory.copied', 'Copied!') : t('inventory.copy_payload', 'Copy Payload')}</span>
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
