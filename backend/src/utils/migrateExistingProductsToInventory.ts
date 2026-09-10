import { PrismaClient, WarehouseType, StockMovementType } from '@prisma/client';

const prisma = new PrismaClient();

export async function migrateExistingProductsToInventory() {
  console.log('🚀 Starting inventory migration for existing products...');

  // 1. Ensure Default Central Warehouse exists
  let defaultWarehouse = await prisma.warehouse.findFirst({
    where: { isDefault: true },
  });

  if (!defaultWarehouse) {
    defaultWarehouse = await prisma.warehouse.create({
      data: {
        code: 'WH-MAIN',
        name: 'Central Storage Warehouse',
        type: WarehouseType.CENTRAL_WAREHOUSE,
        contactName: 'Mutlu / Storage Team',
        email: 'warehouse@schipenster.com',
        phone: '+31 20 000 0000',
        addressLine1: 'Central Warehouse Hub 1',
        city: 'Amsterdam',
        postalCode: '1012AB',
        country: 'NL',
        isDefault: true,
        isActive: true,
      },
    });
    console.log(`✅ Created Default Warehouse: ${defaultWarehouse.name} (${defaultWarehouse.code})`);
  } else {
    console.log(`ℹ️ Found existing Default Warehouse: ${defaultWarehouse.name} (${defaultWarehouse.code})`);
  }

  // 2. Fetch all existing products with their variants
  const products = await prisma.product.findMany({
    include: {
      variants: true,
    },
  });

  console.log(`📦 Found ${products.length} existing products in database.`);

  let variantsCreatedCount = 0;
  let inventoryItemsCreatedCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    let variants = product.variants;

    // If product has no variants, create a default variant for it
    if (variants.length === 0) {
      const cleanSlug = product.slug
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 8);
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const defaultSku = `SKU-${cleanSlug}-${randomSuffix}`;

      const initialStock = product.inStock ? 50 : 0;

      const newVariant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: defaultSku,
          stock: initialStock,
          price: product.price,
        },
      });

      variants = [newVariant];
      variantsCreatedCount++;
    }

    // Attach each variant to the default warehouse
    for (const variant of variants) {
      const existingInventory = await prisma.inventoryItem.findUnique({
        where: {
          warehouseId_variantId: {
            warehouseId: defaultWarehouse.id,
            variantId: variant.id,
          },
        },
      });

      if (!existingInventory) {
        // Physical stock on hand in storage
        const physicalStock = variant.stock > 0 ? variant.stock : product.inStock ? 50 : 0;
        // Quota allocated to webshop (default 15 if inStock, or physical stock if smaller)
        const webshopStock = product.inStock ? Math.min(15, physicalStock) : 0;

        const qrPayload = JSON.stringify({
          typ: 'IMS_PRODUCT',
          sku: variant.sku,
          varId: variant.id,
          name: product.name.slice(0, 40),
          bin: 'A-01-1',
          wh: defaultWarehouse.code,
        });

        const createdItem = await prisma.inventoryItem.create({
          data: {
            warehouseId: defaultWarehouse.id,
            variantId: variant.id,
            quantityOnHand: physicalStock,
            webshopAllocated: webshopStock,
            quantityReserved: 0,
            quantityDamaged: 0,
            binLocation: 'A-01-1',
            reorderPoint: 5,
            reorderQuantity: 20,
            customBarcode: variant.sku,
            qrCodePayload: qrPayload,
            isPublishedWebshop: product.inStock,
          },
        });

        // Record initial ledger movement
        if (physicalStock > 0 || webshopStock > 0) {
          await prisma.stockMovement.create({
            data: {
              inventoryItemId: createdItem.id,
              type: StockMovementType.PURCHASE_ORDER_RECEIPT,
              quantityChange: physicalStock,
              previousOnHand: 0,
              newOnHand: physicalStock,
              previousWebshop: 0,
              newWebshop: webshopStock,
              referenceType: 'CATALOG_MIGRATION',
              referenceId: product.id,
              reason: 'Initial backfill from existing product catalog into IMS',
              performedBy: null,
            },
          });
        }

        inventoryItemsCreatedCount++;
      } else {
        skippedCount++;
      }
    }
  }

  console.log('\n=============================================');
  console.log('🎉 INVENTORY MIGRATION COMPLETED SUCCESSFULLY');
  console.log('=============================================');
  console.log(`Total Products Scanned: ${products.length}`);
  console.log(`New Variants Generated: ${variantsCreatedCount}`);
  console.log(`New Inventory Items Created: ${inventoryItemsCreatedCount}`);
  console.log(`Already Linked / Skipped: ${skippedCount}`);
  console.log('=============================================\n');
}

// Allow direct execution via ts-node
if (require.main === module) {
  migrateExistingProductsToInventory()
    .catch((error) => {
      console.error('❌ Migration failed with error:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
