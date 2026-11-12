import { prisma } from '../config/db';

async function main() {
  const productCount = await prisma.product.count();
  const variantCount = await prisma.productVariant.count();
  const inventoryCount = await prisma.inventoryItem.count();

  console.log(`Total Products in DB: ${productCount}`);
  console.log(`Total ProductVariants in DB: ${variantCount}`);
  console.log(`Total InventoryItems in DB: ${inventoryCount}`);

  // Check if there are inventory items belonging to deleted products
  const allItems = await prisma.inventoryItem.findMany({
    include: {
      variant: {
        include: {
          product: true,
        },
      },
    },
  });

  const productsMap = new Map<string, number>();
  for (const item of allItems) {
    const pName = item.variant?.product?.name || 'ORPHANED (No Product)';
    const sku = item.variant?.sku || 'NO SKU';
    productsMap.set(pName, (productsMap.get(pName) || 0) + 1);
    console.log(`- Item ID: ${item.id} | Product: "${pName}" | SKU: ${sku} | Storage: ${item.quantityOnHand} | Webshop: ${item.webshopAllocated}`);
  }

  console.log('\n--- SKUs per Product summary ---');
  for (const [pName, count] of productsMap.entries()) {
    console.log(`Product "${pName}": ${count} SKU(s)/variants`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
