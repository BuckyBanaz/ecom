import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import inventoryRoutes from '../routes/inventoryRoutes';
import { errorHandler } from '../middlewares/errorMiddleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runInventoryApiTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING INVENTORY API AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  const app = express();
  app.use(express.json());
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use(errorHandler);

  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`🚀 Test server listening on ${baseUrl}`);

  // 1. Fetch real admin user from DB to satisfy requireAdmin DB lookup
  let adminUser = await prisma.user.findFirst({
    where: { role: { in: ['admin', 'superadmin'] }, status: 'active' },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: 'test-admin@schipenster.com',
        name: 'Test Admin',
        passwordHash: 'dummy',
        role: 'superadmin',
        status: 'active',
      },
    });
  }

  const adminToken = jwt.sign(
    {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    },
    env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(name: string, condition: boolean, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${name}`);
    } else {
      console.error(`❌ [FAIL] ${name} — ${details || 'Assertion failed'}`);
    }
  }

  try {
    // --- Test 1: GET /api/v1/inventory/admin/list ---
    const listRes = await fetch(`${baseUrl}/api/v1/inventory/admin/list?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listData: any = await listRes.json();

    assertTest(
      'GET /api/v1/inventory/admin/list returns 200 & paginated items',
      listRes.status === 200 && Array.isArray(listData?.data?.items) && listData?.data?.items.length > 0,
      `Status: ${listRes.status}, Items: ${listData?.data?.items?.length}`
    );

    assertTest(
      'GET /api/v1/inventory/admin/list returns global summary metrics',
      listData?.data?.summary?.totalOnHand > 0 &&
        listData?.data?.summary?.totalWebshop >= 0 &&
        listData?.data?.summary?.totalSkus > 0,
      `Summary: ${JSON.stringify(listData?.data?.summary)}`
    );

    const testItem = listData?.data?.items[0];
    if (!testItem) {
      console.error('❌ No test item found to continue further tests.');
      return;
    }

    const itemId = testItem.id;
    const itemSku = testItem.variant.sku;
    console.log(`\n📌 Target Test SKU: "${itemSku}" (Item ID: ${itemId})`);
    console.log(`   Initial Storage Stock: ${testItem.quantityOnHand}, Webshop Stock: ${testItem.webshopAllocated}\n`);

    // --- Test 2: GET /api/v1/inventory/admin/by-sku/:sku (Scanner Lookup) ---
    const skuRes = await fetch(`${baseUrl}/api/v1/inventory/admin/by-sku/${encodeURIComponent(itemSku)}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const skuData: any = await skuRes.json();

    assertTest(
      `GET /api/v1/inventory/admin/by-sku/:sku resolves correct item for scanner`,
      skuRes.status === 200 && skuData?.data?.id === itemId,
      `Status: ${skuRes.status}, SKU: ${skuData?.data?.variant?.sku}`
    );

    // --- Test 3: POST /api/v1/inventory/admin/adjust-storage (+10 count adjustment) ---
    const adjustRes = await fetch(`${baseUrl}/api/v1/inventory/admin/adjust-storage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inventoryItemId: itemId,
        quantityChange: 50,
        reason: 'Automated test storage delivery inspection',
        binLocation: 'Rack-TEST-1',
      }),
    });
    const adjustData: any = await adjustRes.json();

    assertTest(
      'POST /api/v1/inventory/admin/adjust-storage increments quantityOnHand',
      adjustRes.status === 200 && adjustData?.data?.quantityOnHand === testItem.quantityOnHand + 50,
      `Status: ${adjustRes.status}, New Stock: ${adjustData?.data?.quantityOnHand}`
    );

    // --- Test 4: POST /api/v1/inventory/admin/allocate-webshop ---
    const allocateRes = await fetch(`${baseUrl}/api/v1/inventory/admin/allocate-webshop`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inventoryItemId: itemId,
        webshopAllocated: 22,
        isPublishedWebshop: true,
        reason: 'Allocating test quota to webshop',
      }),
    });
    const allocateData: any = await allocateRes.json();

    assertTest(
      'POST /api/v1/inventory/admin/allocate-webshop updates webshop quota',
      allocateRes.status === 200 && allocateData?.data?.webshopAllocated === 22,
      `Status: ${allocateRes.status}, Webshop: ${allocateData?.data?.webshopAllocated}`
    );

    // --- Test 5: PUT /api/v1/inventory/admin/items/:id/location ---
    const locationRes = await fetch(`${baseUrl}/api/v1/inventory/admin/items/${itemId}/location`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        binLocation: 'Rack-A-Shelf-04',
      }),
    });
    const locationData: any = await locationRes.json();

    assertTest(
      'PUT /api/v1/inventory/admin/items/:id/location updates binLocation',
      locationRes.status === 200 && locationData?.data?.binLocation === 'Rack-A-Shelf-04',
      `Status: ${locationRes.status}, Location: ${locationData?.data?.binLocation}`
    );

    // --- Test 6: GET /api/v1/inventory/admin/qr-code/:id ---
    const qrRes = await fetch(`${baseUrl}/api/v1/inventory/admin/qr-code/${itemId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const qrData: any = await qrRes.json();

    assertTest(
      'GET /api/v1/inventory/admin/qr-code/:id returns valid base64 PNG data URL',
      qrRes.status === 200 &&
        typeof qrData?.data?.qrDataUrl === 'string' &&
        qrData?.data?.qrDataUrl.startsWith('data:image/png;base64,'),
      `Status: ${qrRes.status}`
    );

    // --- Test 7: POST /api/v1/inventory/admin/labels/pdf (Thermal 50x30) ---
    const thermalPdfRes = await fetch(`${baseUrl}/api/v1/inventory/admin/labels/pdf`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        layout: 'THERMAL_50x30',
        items: [{ inventoryItemId: itemId, copies: 1 }],
        includePrice: true,
        includeBin: true,
      }),
    });
    const thermalPdfBuffer = await thermalPdfRes.arrayBuffer();

    assertTest(
      'POST /api/v1/inventory/admin/labels/pdf streams Thermal 50x30mm PDF',
      thermalPdfRes.status === 200 &&
        thermalPdfRes.headers.get('content-type') === 'application/pdf' &&
        thermalPdfBuffer.byteLength > 500,
      `Status: ${thermalPdfRes.status}, Content-Type: ${thermalPdfRes.headers.get('content-type')}, Length: ${thermalPdfBuffer.byteLength}`
    );

    // --- Test 8: POST /api/v1/inventory/admin/labels/pdf (A4 Grid 24) ---
    const a4PdfRes = await fetch(`${baseUrl}/api/v1/inventory/admin/labels/pdf`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        layout: 'A4_GRID_24',
        items: [{ inventoryItemId: itemId, copies: 3 }],
        includePrice: true,
        includeBin: true,
      }),
    });
    const a4PdfBuffer = await a4PdfRes.arrayBuffer();

    assertTest(
      'POST /api/v1/inventory/admin/labels/pdf streams A4 Grid 24 PDF',
      a4PdfRes.status === 200 &&
        a4PdfRes.headers.get('content-type') === 'application/pdf' &&
        a4PdfBuffer.byteLength > 1000,
      `Status: ${a4PdfRes.status}, Content-Type: ${a4PdfRes.headers.get('content-type')}, Length: ${a4PdfBuffer.byteLength}`
    );

    // --- Test 9: GET /api/v1/inventory/admin/movements ---
    const movementsRes = await fetch(`${baseUrl}/api/v1/inventory/admin/movements?inventoryItemId=${itemId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const movementsData: any = await movementsRes.json();

    assertTest(
      'GET /api/v1/inventory/admin/movements queries stock movements audit ledger',
      movementsRes.status === 200 &&
        Array.isArray(movementsData?.data?.movements) &&
        movementsData?.data?.movements.length >= 2,
      `Status: ${movementsRes.status}, Movements count: ${movementsData?.data?.movements?.length}`
    );

    // --- Test 10: Unauthorized Request Guard ---
    const unauthRes = await fetch(`${baseUrl}/api/v1/inventory/admin/list`);

    assertTest(
      'Unauthorized request without token returns 401 Unauthorized',
      unauthRes.status === 401,
      `Status: ${unauthRes.status}`
    );

    console.log('\n======================================================');
    console.log(`🏁 TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('======================================================\n');
  } finally {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  }
}

runInventoryApiTests().catch((err) => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
