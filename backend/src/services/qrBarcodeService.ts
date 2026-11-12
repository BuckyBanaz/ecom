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
    return data.sku;
  }

  /**
   * Generates a high-contrast base64 Data URL for web UI and downloads.
   * Uses Error Correction Level 'M' for large, crisp blocks that scan instantly.
   */
  public static async generateQrDataUrl(payload: string): Promise<string> {
    return QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 512,
      scale: 8,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }

  /**
   * Generates a high-density PNG Buffer of the QR code for crisp 300+ DPI PDF embedding.
   */
  public static async generateQrBuffer(payload: string, width: number = 600): Promise<Buffer> {
    return QRCode.toBuffer(payload, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: Math.max(600, width),
      scale: 6,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }

  /**
   * Generates a high-density 1D Code-128 Barcode PNG buffer using bwip-js (300 DPI print quality).
   */
  public static async generateBarcodeBuffer(text: string, heightMm: number = 15): Promise<Buffer> {
    return bwipjs.toBuffer({
      bcid: 'code128',
      text: text.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
      scale: 5,
      height: heightMm,
      includetext: true,
      textxalign: 'center',
    });
  }
}
