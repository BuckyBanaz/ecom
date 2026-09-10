# 📦 Inventory Management System (Dual-Layer & QR Ecosystem) — Master Roadmap & Progress Tracker

> **Status:** 🟡 Not Started (Architecture & Roadmap Defined)  
> **Target Version:** `v1.0-ims`  
> **Primary Specification:** [docs/inventory-management-system-plan.md](file:///c:/Users/Parikshit/Desktop/workspace/ecom/docs/inventory-management-system-plan.md)  
> **Last Updated:** 2026-09-10

---

## 🎯 High-Level Progress Scoreboard

```
Overall Progress: [--------------------] 0% (0 / 25 Tasks Completed)
```

| Phase | Description | Total Tasks | Completed | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Phase 1** | Database Schema & Dual-Layer Data Migration | 5 | 0 | ⏳ Pending |
| **Phase 2** | QR Code & Barcode Engine (Labels & Printing) | 5 | 0 | ⏳ Pending |
| **Phase 3** | Admin Dashboard & Mobile Warehouse Scanner UI | 5 | 0 | ⏳ Pending |
| **Phase 4** | Webshop Allocation Quota & Redis Concurrency | 5 | 0 | ⏳ Pending |
| **Phase 5** | Procurement (PO), Goods Inward (GRN) & Alerts | 5 | 0 | ⏳ Pending |

---

## 📜 Agent Execution & Progress Rules

> [!IMPORTANT]
> **MANDATORY RULES FOR AGENT EXECUTION:**
> 1. **Live Checkbox Updates:** Whenever an agent finishes any task or file edit, it **MUST immediately update** this file (`brain/12_inventory_management_roadmap.md`), changing `[ ]` to `[x]` and updating the progress scoreboard.
> 2. **Real-time Status Reporting:** Whenever the user asks *"Kitna hua?"*, *"Kya status hai?"*, or requests a progress update, the agent must check this roadmap and respond with:
>    * Current Phase & Percentage completed
>    * Exactly what was just finished (with clickable file links)
>    * What is currently in progress
>    * What the immediate next step is
> 3. **Work Memory Logging:** Log all technical changes in `brain/09_work_memory.md` upon completion of each phase.
> 4. **No Regressions:** Verify TypeScript compiles cleanly (`npm run build` or `tsc --noEmit`) before marking any task as complete.

---

## 🗺️ Detailed Phase-by-Phase Checklist

### Phase 1: Database Schema & Dual-Layer Migration (Foundation)
- [ ] **Task 1.1:** Add `Warehouse`, `WarehouseType`, `StockMovementType`, `POStatus` enums and models to `backend/prisma/schema.prisma`.
- [ ] **Task 1.2:** Add `InventoryItem` with dual-layer metrics (`quantityOnHand`, `webshopAllocated`, `quantityReserved`, `binLocation`, `customBarcode`, `qrCodePayload`) to `schema.prisma`.
- [ ] **Task 1.3:** Add `StockMovement` (audit ledger), `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, and `StockTransfer` models to `schema.prisma`.
- [ ] **Task 1.4:** Generate and apply Prisma migration (`npx prisma migrate dev --name init_dual_layer_inventory_qr`).
- [ ] **Task 1.5:** Create database seed / migration script (`backend/src/utils/seedInventory.ts`) to create default "Main Central Warehouse" and initialize `InventoryItem` records for all existing products/variants.

---

### Phase 2: QR Code & Barcode Engine (Generation & Printing)
- [ ] **Task 2.1:** Install backend barcode/QR dependencies (`qrcode`, `bwip-js`, `pdfkit`).
- [ ] **Task 2.2:** Build QR & Barcode generation utility (`backend/src/services/qrBarcodeService.ts`) to encode deep-links and machine payloads.
- [ ] **Task 2.3:** Build PDF Label Sheet Generator (`backend/src/services/labelPrintService.ts`) supporting:
  - Single Thermal Roll (50x30mm)
  - A4 Sheet (24 labels per page: 3x8 grid)
  - A4 Sheet (30 labels per page: 3x10 grid)
- [ ] **Task 2.4:** Implement QR & Label endpoints in `backend/src/controllers/inventoryController.ts`:
  - `GET /api/v1/admin/inventory/qr-code/:id`
  - `POST /api/v1/admin/inventory/labels/pdf`
- [ ] **Task 2.5:** Create frontend Label Print Modal (`frontend/src/components/admin/inventory/LabelPrintModal.tsx`) with live preview and browser print integration.

---

### Phase 3: Admin Dual-View Dashboard & Mobile Warehouse Scanner
- [ ] **Task 3.1:** Create Admin Inventory Dashboard page (`frontend/src/pages/admin/AdminInventory.tsx`) with 3 View Tabs:
  - `All Inventory (Master)`
  - `Storage / Warehouse Only (Physical & Bin Locations)`
  - `Webshop Channel Only (Live Storefront Stock & Reserves)`
- [ ] **Task 3.2:** Build Top Metric Cards (Total Storage Units, Webshop Active Units, Reserve Buffer, Low Stock Alerts).
- [ ] **Task 3.3:** Integrate camera-based scanner modal (`frontend/src/components/admin/inventory/WarehouseScannerModal.tsx`) using `html5-qrcode` / `zxing-js` with sound/haptic feedback.
- [ ] **Task 3.4:** Build Quick Action Drawer on QR scan:
  - Quick $+1$ / $-1$ Inward/Outward
  - Direct Allocate to Webshop
  - Set Physical Audit Count
  - Change Shelf / Bin Location
- [ ] **Task 3.5:** Build Stock Adjustment Modal (`frontend/src/components/admin/inventory/StockAdjustmentModal.tsx`) with audit notes.

---

### Phase 4: Webshop Channel Allocation Quota & Redis Concurrency Guard
- [ ] **Task 4.1:** Build `AllocateWebshopModal.tsx` allowing admins to transfer stock between Storage Reserve and Webshop live quota.
- [ ] **Task 4.2:** Implement backend atomic allocation endpoint `POST /api/v1/admin/inventory/allocate-webshop`.
- [ ] **Task 4.3:** Build Redis-backed checkout reservation lock service (`backend/src/services/inventoryReservationService.ts`) with 15-minute TTL.
- [ ] **Task 4.4:** Hook checkout reservation into storefront cart & order checkout APIs (`POST /api/v1/orders/checkout-reserve`).
- [ ] **Task 4.5:** Create background worker / cron to automatically release expired cart reservations and log `ORDER_RESERVATION_CANCEL` in the ledger.

---

### Phase 5: Procurement (PO), Goods Inward (GRN) & Automated Alerts
- [ ] **Task 5.1:** Build Supplier Management page & CRUD APIs (`AdminSuppliers.tsx`).
- [ ] **Task 5.2:** Build Purchase Order Management (`AdminPurchaseOrders.tsx`) with PDF PO generation for suppliers.
- [ ] **Task 5.3:** Implement Goods Inward (GRN) scanning workflow: scan PO $\rightarrow$ scan incoming boxes $\rightarrow$ auto-increment Storage physical count $\rightarrow$ prompt to print QR stickers.
- [ ] **Task 5.4:** Build Stock Movement History Ledger page (`AdminStockMovements.tsx`) showing complete audit trail of every unit.
- [ ] **Task 5.5:** Setup automated Low-Stock Alert System (admin dashboard badge + daily email digest for items below reorder threshold).

---

## 📝 Activity & Changelog

| Date | Phase | Description of Change | Completed By |
| :--- | :--- | :--- | :--- |
| **2026-09-10** | Architecture | Initialized master roadmap and set agent execution rules. | Antigravity |
