import { Request, Response, NextFunction } from 'express';
import { PrismaClient, StockMovementType } from '@prisma/client';
import { AppError } from '../middlewares/errorMiddleware';
import { QrBarcodeService } from '../services/qrBarcodeService';
import { LabelPrintService, LabelLayoutType } from '../services/labelPrintService';

const prisma = new PrismaClient();

export class InventoryController {
  /**
   * GET /api/v1/inventory/admin/list
   * Returns paginated list of inventory items with search & filters
   */
  public static async getInventoryList(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;

      const search = (req.query.search as string || '').trim();
      const warehouseId = req.query.warehouseId as string;
      const view = (req.query.view as string || 'all').toLowerCase(); // all | storage | webshop
      const lowStockOnly = req.query.lowStock === 'true';

      const where: any = {};

      if (warehouseId) {
        where.warehouseId = warehouseId;
      }

      if (search) {
        where.OR = [
          { variant: { sku: { contains: search, mode: 'insensitive' } } },
          { variant: { product: { name: { contains: search, mode: 'insensitive' } } } },
          { binLocation: { contains: search, mode: 'insensitive' } },
          { customBarcode: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (view === 'webshop') {
        where.isPublishedWebshop = true;
      }

      const [items, total] = await Promise.all([
        prisma.inventoryItem.findMany({
          where,
          skip,
          take: limit,
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    image: true,
                    price: true,
                    inStock: true,
                    category: { select: { id: true, name: true } },
                  },
                },
              },
            },
            warehouse: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.inventoryItem.count({ where }),
      ]);

      // Global Summary Metrics
      const allAggregates = await prisma.inventoryItem.aggregate({
        _sum: {
          quantityOnHand: true,
          webshopAllocated: true,
          quantityReserved: true,
          quantityDamaged: true,
        },
        _count: {
          id: true,
        },
      });

      const totalOnHand = allAggregates._sum.quantityOnHand || 0;
      const totalWebshop = allAggregates._sum.webshopAllocated || 0;
      const totalReserved = allAggregates._sum.quantityReserved || 0;
      const totalDamaged = allAggregates._sum.quantityDamaged || 0;
      const totalReserveBuffer = Math.max(0, totalOnHand - totalWebshop);

      // Low stock count (items where webshop stock <= reorderPoint)
      const lowStockCount = await prisma.inventoryItem.count({
        where: {
          webshopAllocated: { lte: 5 },
          isPublishedWebshop: true,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
          summary: {
            totalOnHand,
            totalWebshop,
            totalReserved,
            totalReserveBuffer,
            totalDamaged,
            totalSkus: allAggregates._count.id,
            lowStockCount,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/inventory/admin/by-sku/:sku
   * Fast lookup for mobile scanner and barcode guns
   */
  public static async getBySku(req: Request, res: Response, next: NextFunction) {
    try {
      const { sku } = req.params;
      const cleanSku = (sku || '').trim();

      const item = await prisma.inventoryItem.findFirst({
        where: {
          OR: [
            { variant: { sku: { equals: cleanSku, mode: 'insensitive' } } },
            { customBarcode: { equals: cleanSku, mode: 'insensitive' } },
            { variantId: cleanSku },
          ],
        },
        include: {
          variant: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  image: true,
                  price: true,
                  inStock: true,
                  category: { select: { id: true, name: true } },
                },
              },
            },
          },
          warehouse: { select: { id: true, name: true, code: true } },
        },
      });

      if (!item) {
        throw new AppError(`No product or inventory record found for SKU/Barcode: ${cleanSku}`, 404);
      }

      res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/inventory/admin/adjust-storage
   * Adjusts physical storage count (delta or exact count) with audit ledger
   */
  public static async adjustStorageStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { inventoryItemId, quantityChange, setExactCount, reason, binLocation } = req.body;

      if (!inventoryItemId) {
        throw new AppError('inventoryItemId is required', 400);
      }

      const item = await prisma.inventoryItem.findUnique({
        where: { id: inventoryItemId },
        include: { variant: { include: { product: true } } },
      });

      if (!item) {
        throw new AppError('Inventory item not found', 404);
      }

      let newOnHand = item.quantityOnHand;
      let changeDelta = 0;

      if (setExactCount != null && typeof setExactCount === 'number') {
        newOnHand = Math.max(0, setExactCount);
        changeDelta = newOnHand - item.quantityOnHand;
      } else if (quantityChange != null && typeof quantityChange === 'number') {
        changeDelta = quantityChange;
        newOnHand = Math.max(0, item.quantityOnHand + changeDelta);
      } else {
        throw new AppError('Either quantityChange or setExactCount must be provided', 400);
      }

      // Update inventory item
      const updatedItem = await prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          quantityOnHand: newOnHand,
          ...(binLocation ? { binLocation: binLocation.trim() } : {}),
        },
      });

      // Record movement
      await prisma.stockMovement.create({
        data: {
          inventoryItemId: item.id,
          type: StockMovementType.MANUAL_STORAGE_ADJUST,
          quantityChange: changeDelta,
          previousOnHand: item.quantityOnHand,
          newOnHand,
          previousWebshop: item.webshopAllocated,
          newWebshop: item.webshopAllocated,
          reason: reason || 'Manual storage adjustment / cycle count',
          referenceType: 'MANUAL_ADJUSTMENT',
          performedBy: (req as any).user?.id || null,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Storage stock updated successfully',
        data: updatedItem,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/inventory/admin/allocate-webshop
   * Sets webshop allocated quota from storage reserves
   */
  public static async allocateWebshopStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { inventoryItemId, webshopAllocated, isPublishedWebshop, reason } = req.body;

      if (!inventoryItemId) {
        throw new AppError('inventoryItemId is required', 400);
      }

      const item = await prisma.inventoryItem.findUnique({
        where: { id: inventoryItemId },
      });

      if (!item) {
        throw new AppError('Inventory item not found', 404);
      }

      const targetWebshop = webshopAllocated != null ? Math.max(0, parseInt(webshopAllocated)) : item.webshopAllocated;
      const isPublished = isPublishedWebshop !== undefined ? Boolean(isPublishedWebshop) : item.isPublishedWebshop;

      // Update item
      const updatedItem = await prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          webshopAllocated: targetWebshop,
          isPublishedWebshop: isPublished,
        },
      });

      // Sync product inStock if webshop allocation is changed
      await prisma.product.updateMany({
        where: { variants: { some: { id: item.variantId } } },
        data: { inStock: isPublished && targetWebshop > 0 },
      });

      // Record movement
      const delta = targetWebshop - item.webshopAllocated;
      if (delta !== 0) {
        await prisma.stockMovement.create({
          data: {
            inventoryItemId: item.id,
            type: delta > 0 ? StockMovementType.WEBSHOP_ALLOCATION_INC : StockMovementType.WEBSHOP_ALLOCATION_DEC,
            quantityChange: delta,
            previousOnHand: item.quantityOnHand,
            newOnHand: item.quantityOnHand,
            previousWebshop: item.webshopAllocated,
            newWebshop: targetWebshop,
            reason: reason || 'Webshop channel quota allocation update',
            referenceType: 'WEBSHOP_ALLOCATION',
            performedBy: (req as any).user?.id || null,
          },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Webshop quota updated successfully',
        data: updatedItem,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/inventory/admin/items/:id/location
   * Updates Shelf/Bin location
   */
  public static async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { binLocation } = req.body;

      const item = await prisma.inventoryItem.update({
        where: { id },
        data: { binLocation: (binLocation || '').trim() },
      });

      res.status(200).json({
        success: true,
        message: 'Location updated successfully',
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/inventory/admin/qr-code/:id
   * Generates QR Code Data URL for an inventory item
   */
  public static async getQrCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const item = await prisma.inventoryItem.findUnique({
        where: { id },
        include: {
          variant: { include: { product: true } },
          warehouse: true,
        },
      });

      if (!item) {
        throw new AppError('Inventory item not found', 404);
      }

      const payload = item.qrCodePayload || QrBarcodeService.buildPayload({
        sku: item.variant.sku,
        variantId: item.variantId,
        name: item.variant.product.name,
        binLocation: item.binLocation,
        warehouseCode: item.warehouse.code,
      });

      const qrDataUrl = await QrBarcodeService.generateQrDataUrl(payload);

      res.status(200).json({
        success: true,
        data: {
          qrDataUrl,
          payload,
          sku: item.variant.sku,
          productName: item.variant.product.name,
          binLocation: item.binLocation,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/inventory/admin/labels/pdf
   * Generates and streams printable PDF sticker sheets
   */
  public static async generatePdfLabels(req: Request, res: Response, next: NextFunction) {
    try {
      const { layout = 'A4_GRID_24', items = [], includePrice = false, includeBin = true } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('At least one inventory item must be selected for printing', 400);
      }

      const itemIds = items.map((i: any) => i.inventoryItemId).filter(Boolean);

      const dbItems = await prisma.inventoryItem.findMany({
        where: { id: { in: itemIds } },
        include: {
          variant: { include: { product: true } },
          warehouse: true,
        },
      });

      const dbItemsMap = new Map(dbItems.map((i) => [i.id, i]));

      const printInputs = items.map((i: any) => {
        const found = dbItemsMap.get(i.inventoryItemId);
        if (!found) return null;

        const qrPayload = found.qrCodePayload || QrBarcodeService.buildPayload({
          sku: found.variant.sku,
          variantId: found.variantId,
          name: found.variant.product.name,
          binLocation: found.binLocation,
          warehouseCode: found.warehouse.code,
        });

        return {
          name: found.variant.product.name,
          sku: found.variant.sku,
          binLocation: found.binLocation,
          qrPayload,
          price: found.variant.price || found.variant.product.price,
          copies: Math.max(1, parseInt(i.copies) || 1),
        };
      }).filter(Boolean);

      const pdfBuffer = await LabelPrintService.generateLabelsPdf(
        printInputs as any,
        layout as LabelLayoutType,
        { includePrice, includeBin }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="inventory-labels-${layout}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/inventory/admin/movements
   * Returns paginated audit ledger of all stock movements
   */
  public static async getStockMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;

      const inventoryItemId = req.query.inventoryItemId as string;

      const where: any = {};
      if (inventoryItemId) {
        where.inventoryItemId = inventoryItemId;
      }

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          skip,
          take: limit,
          include: {
            inventoryItem: {
              include: {
                variant: {
                  include: {
                    product: { select: { id: true, name: true, image: true } },
                  },
                },
                warehouse: { select: { name: true, code: true } },
              },
            },
            performedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.stockMovement.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          movements,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
