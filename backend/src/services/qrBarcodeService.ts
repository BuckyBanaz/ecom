import QRCode from 'qrcode';
import bwipjs from 'bwip-js';

export interface QrPayloadInput {
  sku: string;
  variantId: string;
  name: string;
  binLocation?: string | null;
  warehouseCode?: string;
}

export class QrBarcodeService {
  /**
   * Generates a standardized JSON payload string for machine QR scanners.
   */
  public static buildPayload(data: QrPayloadInput): string {
    return JSON.stringify({
      typ: 'IMS_PRODUCT',
      sku: data.sku,
      varId: data.variantId,
      name: data.name.slice(0, 40),
      bin: data.binLocation || 'UNASSIGNED',
      wh: data.warehouseCode || 'WH-MAIN',
    });
  }

  /**
   * Generates a base64 Data URL (data:image/png;base64,...) for web UI rendering.
   */
  public static async generateQrDataUrl(payload: string): Promise<string> {
    return QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }

  /**
   * Generates a PNG Buffer of the QR code for PDF insertion.
   */
  public static async generateQrBuffer(payload: string, width: number = 200): Promise<Buffer> {
    return QRCode.toBuffer(payload, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width,
    });
  }

  /**
   * Generates a 1D Code-128 Barcode PNG buffer using bwip-js.
   */
  public static async generateBarcodeBuffer(text: string, heightMm: number = 10): Promise<Buffer> {
    return bwipjs.toBuffer({
      bcid: 'code128',
      text: text.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
      scale: 3,
      height: heightMm,
      includetext: true,
      textxalign: 'center',
    });
  }
}
