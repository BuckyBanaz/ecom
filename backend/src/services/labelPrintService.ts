import PDFDocument from 'pdfkit';
import { QrBarcodeService } from './qrBarcodeService';

export interface LabelItemInput {
  name: string;
  sku: string;
  binLocation?: string | null;
  qrPayload: string;
  price?: number | null;
  copies?: number;
}

export type LabelLayoutType = 'THERMAL_50x30' | 'A4_GRID_24' | 'A4_GRID_30';

export class LabelPrintService {
  /**
   * Generates a printable PDF Buffer for inventory stickers.
   */
  public static async generateLabelsPdf(
    items: LabelItemInput[],
    layout: LabelLayoutType = 'A4_GRID_24',
    options: { includePrice?: boolean; includeBin?: boolean } = { includePrice: false, includeBin: true }
  ): Promise<Buffer> {
    // Flatten items according to copies
    const flattenedItems: LabelItemInput[] = [];
    for (const item of items) {
      const count = Math.max(1, item.copies || 1);
      for (let i = 0; i < count; i++) {
        flattenedItems.push(item);
      }
    }

    if (layout === 'THERMAL_50x30') {
      return this.generateThermalLabels(flattenedItems, options);
    } else if (layout === 'A4_GRID_30') {
      return this.generateA4GridLabels(flattenedItems, 3, 10, options);
    } else {
      // Default: A4_GRID_24 (3 cols x 8 rows)
      return this.generateA4GridLabels(flattenedItems, 3, 8, options);
    }
  }

  /**
   * Generates continuous single-label thermal roll PDF (50mm x 30mm per page)
   * 1 mm = ~2.83465 points in PDFKit
   */
  private static async generateThermalLabels(
    items: LabelItemInput[],
    options: { includePrice?: boolean; includeBin?: boolean }
  ): Promise<Buffer> {
    const widthPt = 50 * 2.83465; // ~141.7 pt
    const heightPt = 30 * 2.83465; // ~85 pt

    return new Promise(async (resolve, reject) => {
      const doc = new PDFDocument({
        size: [widthPt, heightPt],
        margin: 4,
        autoFirstPage: false,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      for (const item of items) {
        doc.addPage({ size: [widthPt, heightPt], margin: 4 });

        // Title
        doc.font('Helvetica-Bold').fontSize(7).text(item.name.slice(0, 24), 4, 4, { width: widthPt - 8, ellipsis: true });

        // Generate QR code buffer
        try {
          const qrBuffer = await QrBarcodeService.generateQrBuffer(item.qrPayload, 60);
          doc.image(qrBuffer, 4, 18, { width: 50, height: 50 });
        } catch {
          // Fallback if QR generation fails
        }

        // Details right of QR
        doc.font('Helvetica-Bold').fontSize(7).text(item.sku, 58, 20, { width: widthPt - 62, ellipsis: true });

        if (options.includeBin && item.binLocation) {
          doc.font('Helvetica').fontSize(6).text(`Bin: ${item.binLocation}`, 58, 34, { width: widthPt - 62 });
        }

        if (options.includePrice && item.price != null) {
          doc.font('Helvetica-Bold').fontSize(7).text(`€${item.price.toFixed(2)}`, 58, 48, { width: widthPt - 62 });
        }
      }

      doc.end();
    });
  }

  /**
   * Generates A4 Sheet Labels with Grid (e.g. 3x8 or 3x10)
   * A4 size = 595.28 x 841.89 pt
   */
  private static async generateA4GridLabels(
    items: LabelItemInput[],
    cols: number,
    rows: number,
    options: { includePrice?: boolean; includeBin?: boolean }
  ): Promise<Buffer> {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const marginX = 20;
    const marginY = 25;
    const labelWidth = (pageWidth - marginX * 2) / cols;
    const labelHeight = (pageHeight - marginY * 2) / rows;
    const labelsPerPage = cols * rows;

    return new Promise(async (resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        autoFirstPage: false,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      for (let i = 0; i < items.length; i++) {
        const itemIndexOnPage = i % labelsPerPage;

        if (itemIndexOnPage === 0) {
          doc.addPage({ size: 'A4', margin: 0 });
        }

        const col = itemIndexOnPage % cols;
        const row = Math.floor(itemIndexOnPage / cols);

        const x = marginX + col * labelWidth;
        const y = marginY + row * labelHeight;

        const item = items[i];

        // Draw light label border
        doc.roundedRect(x + 2, y + 2, labelWidth - 4, labelHeight - 4, 3)
          .lineWidth(0.5)
          .strokeColor('#e2e8f0')
          .stroke();

        // Product Name
        doc.fillColor('#0f172a')
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(item.name.slice(0, 30), x + 6, y + 6, {
            width: labelWidth - 12,
            ellipsis: true,
          });

        // Insert QR code image
        try {
          const qrSize = Math.min(labelHeight - 32, 50);
          const qrBuffer = await QrBarcodeService.generateQrBuffer(item.qrPayload, Math.round(qrSize * 2));
          doc.image(qrBuffer, x + 6, y + 20, { width: qrSize, height: qrSize });

          // SKU & Details
          const textX = x + qrSize + 12;
          const textWidth = labelWidth - (qrSize + 18);

          doc.fillColor('#1e293b')
            .font('Helvetica-Bold')
            .fontSize(7.5)
            .text(item.sku, textX, y + 22, { width: textWidth, ellipsis: true });

          if (options.includeBin && item.binLocation) {
            doc.fillColor('#64748b')
              .font('Helvetica')
              .fontSize(7)
              .text(`Bin: ${item.binLocation}`, textX, y + 36, { width: textWidth });
          }

          if (options.includePrice && item.price != null) {
            doc.fillColor('#059669')
              .font('Helvetica-Bold')
              .fontSize(8)
              .text(`€${item.price.toFixed(2)}`, textX, y + 48, { width: textWidth });
          }
        } catch {
          // Ignore QR render errors
        }
      }

      if (items.length === 0) {
        doc.addPage({ size: 'A4', margin: 0 });
        doc.fontSize(12).text('No items selected for label printing.', 50, 50);
      }

      doc.end();
    });
  }
}
