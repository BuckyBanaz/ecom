import { PrismaClient, WarehouseType, StockMovementType } from '@prisma/client';
import { QrBarcodeService } from './qrBarcodeService';

const prisma = new PrismaClient();

export class InventoryService {
  /**
   * Retrieves or initializes the default Central Warehouse
   */
  public static async getDefaultWarehouse() {
    let warehouse = await prisma.warehouse.findFirst({
      where: { isDefault: true },
    });

    if (!warehouse) {
      warehouse = await prisma.warehouse.create({
        data: {
          code: 'WH-MAIN',
          name: 'Central Storage Warehouse',
          type: WarehouseType.CENTRAL_WAREHOUSE,
          isDefault: true,
          country: 'NL',
          city: 'Amsterdam',
          addressLine1: 'Central Warehouse Hub 1',
          postalCode: '1012AB',
        },
      });
    }

    return warehouse;
  }

  /**
   * Automatically connects new/edited products with their default variant and InventoryItem
   */
  public static async syncProductInventory(
    productId: string,
    options?: {
      storageStock?: number;
      webshopStock?: number;
      binLocation?: string;
    }
  ) {
    const warehouse = await this.getDefaultWarehouse();

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!product) return;

    let variants = product.variants;

    // Create default variant if product was created without one (e.g. Quick Add)
    if (variants.length === 0) {
      const cleanSlug = product.slug.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const defaultSku = `SKU-${cleanSlug}-${randomSuffix}`;

      const initialStock = options?.storageStock ?? (product.inStock ? 50 : 0);

      const defaultVariant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: defaultSku,
          stock: initialStock,
          price: product.price,
        },
      });

      variants = [defaultVariant];
    }

    for (const variant of variants) {
      const existing = await prisma.inventoryItem.findUnique({
        where: {
          warehouseId_variantId: {
            warehouseId: warehouse.id,
            variantId: variant.id,
          },
        },
      });

      const physicalStock = options?.storageStock ?? (variant.stock > 0 ? variant.stock : product.inStock ? 50 : 0);
      const webshopStock = options?.webshopStock ?? (product.inStock ? Math.min(15, physicalStock) : 0);
      const binLocation = options?.binLocation || 'A-01-1';
      const lowStockPoint = options?.lowStockThreshold ?? 5;

      const qrPayload = QrBarcodeService.buildPayload({
        sku: variant.sku,
        variantId: variant.id,
        name: product.name,
        binLocation,
        warehouseCode: warehouse.code,
      });

      if (!existing) {
        const newItem = await prisma.inventoryItem.create({
          data: {
            warehouseId: warehouse.id,
            variantId: variant.id,
            quantityOnHand: physicalStock,
            webshopAllocated: webshopStock,
            quantityReserved: 0,
            quantityDamaged: 0,
            binLocation,
            reorderPoint: lowStockPoint,
            reorderQuantity: 20,
            customBarcode: variant.sku,
            qrCodePayload: qrPayload,
            isPublishedWebshop: product.inStock,
          },
        });

        if (physicalStock > 0 || webshopStock > 0) {
          await prisma.stockMovement.create({
            data: {
              inventoryItemId: newItem.id,
              type: StockMovementType.PURCHASE_ORDER_RECEIPT,
              quantityChange: physicalStock,
              previousOnHand: 0,
              newOnHand: physicalStock,
              previousWebshop: 0,
              newWebshop: webshopStock,
              referenceType: 'PRODUCT_CREATION',
              referenceId: product.id,
              reason: 'Automatic stock initialization on product creation',
            },
          });
        }
      } else {
        const targetOnHand = options?.storageStock !== undefined ? options.storageStock : existing.quantityOnHand;
        const requestedWebshop = options?.webshopStock !== undefined ? options.webshopStock : existing.webshopAllocated;
        const targetWebshop = Math.min(targetOnHand, requestedWebshop);

        await prisma.inventoryItem.update({
          where: { id: existing.id },
          data: {
            isPublishedWebshop: product.inStock && targetWebshop > 0,
            quantityOnHand: targetOnHand,
            webshopAllocated: targetWebshop,
            ...(options?.binLocation !== undefined ? { binLocation: options.binLocation } : {}),
            ...(options?.lowStockThreshold !== undefined ? { reorderPoint: options.lowStockThreshold } : {}),
          },
        });
      }
    }
  }
}
