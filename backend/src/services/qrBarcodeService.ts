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
   * Generates an Ultra-High-Resolution (1024x1024) base64 Data URL for web UI and downloads.
   * Uses Error Correction Level 'H' (High - 30% damage recovery) for maximum scan reliability.
   */
  public static async generateQrDataUrl(payload: string): Promise<string> {
    return QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 1024,
      scale: 10,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }

  /**
   * Generates a high-density (800+ px) PNG Buffer of the QR code for crisp 300+ DPI PDF embedding.
   */
  public static async generateQrBuffer(payload: string, width: number = 800): Promise<Buffer> {
    return QRCode.toBuffer(payload, {
      type: 'png',
      errorCorrectionLevel: 'H',
      margin: 2,
      width: Math.max(800, width),
      scale: 8,
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
