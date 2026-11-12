import { Router } from 'express';
import { authenticateJWT, requireAdmin } from '../middlewares/authMiddleware';
import { InventoryController } from '../controllers/inventoryController';

const router = Router();

// All inventory management endpoints require Admin authentication
router.use(authenticateJWT, requireAdmin);

// 1. Paginated Inventory List with Filters
router.get('/admin/list', InventoryController.getInventoryList);

// 2. Fast SKU / Barcode Scanner lookup
router.get('/admin/by-sku/:sku', InventoryController.getBySku);

// 3. Storage Stock Adjustment (Physical On-Hand & Bin Location)
router.post('/admin/adjust-storage', InventoryController.adjustStorageStock);

// 4. Webshop Quota Allocation (Storage Reserve <-> Webshop)
router.post('/admin/allocate-webshop', InventoryController.allocateWebshopStock);

// 5. Update Shelf / Bin Location
router.put('/admin/items/:id/location', InventoryController.updateLocation);

// 6. QR Code Data URL preview
router.get('/admin/qr-code/:id', InventoryController.getQrCode);

// 7. Printable PDF Labels generator (Thermal Roll & A4 Grids)
router.post('/admin/labels/pdf', InventoryController.generatePdfLabels);

// 8. Stock Movement Audit Ledger
router.get('/admin/movements', InventoryController.getStockMovements);

export default router;
