# 📦 Inventory Management System (Dual-Layer & QR Ecosystem) — Master Roadmap & Step-by-Step Execution Plan

> **Status:** 🟡 Not Started (Architecture, Manual & Phased Roadmap Defined)  
> **Target Version:** `v1.0-ims`  
> **Technical Plan:** [docs/inventory-management-system-plan.md](file:///c:/Users/Parikshit/Desktop/workspace/ecom/docs/inventory-management-system-plan.md)  
> **Operational Manual & Process Flow:** [docs/inventory-user-manual-and-flow.md](file:///c:/Users/Parikshit/Desktop/workspace/ecom/docs/inventory-user-manual-and-flow.md)  
> **Last Updated:** 2026-09-10

---

## 🎯 High-Level Progress Scoreboard

```
Overall Progress: [█████████████------] 66% (20 / 30 Tasks Completed)
```

| Phase | Focus Area | Total Tasks | Completed | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Phase 1** | **Database Schema, Dual-Layer Models & Migration** | 5 | 5 | ✅ Completed |
| **Phase 2** | **Backend Core Services, QR/Barcode Engine & APIs** | 5 | 5 | ✅ Completed |
| **Phase 3** | **Frontend Admin UI, Product Form Hook & Translations** | 5 | 5 | ✅ Completed |
| **Phase 4** | **Mobile Camera Scanner, Laser Gun & Label Print Center** | 5 | 5 | ✅ Completed |
| **Phase 5** | **Storefront Concurrency Guard & Auto-Sync Engine** | 5 | 0 | ⏳ Ready to Start |
| **Phase 6** | **Integration Testing, Stress Tests & Audit Reconciliation** | 5 | 0 | ⏳ Queued |

---

## 📜 Mandatory Step-by-Step Agent Execution Protocol

> [!IMPORTANT]
> **STRICT USER-DRIVEN AUDIT RULES:**
> 1. **No Auto-Advancing:** The AI agent **MUST NOT** proceed to subsequent tasks or phases autonomously. After finishing a step, the agent must present the exact changes, test results, and audit checklist, then **STOP and WAIT for the user's explicit command** (e.g. *"Next step karo"*) before starting the next task.
> 2. **Live Checkbox Updates:** Every time a task or file is modified, the agent **MUST immediately update** this roadmap file, changing `[ ]` to `[x]` and updating the progress scoreboard.
> 3. **Real-time Status Reporting:** Whenever the user asks *"Kitna hua?"*, *"Kya status hai?"*, or requests an update, the agent must respond with:
>    * Current Phase & Percentage completed
>    * Exactly what was just finished (with clickable file links)
>    * Current audit/verification status
>    * What the immediate next step is waiting on approval
> 4. **Strict Bilingual Translations (English & Dutch):** EVERY single UI component, modal, button, table header, toast notification, and scanner text **MUST** have complete translation keys in BOTH:
>    * [locales/en/translation.json](file:///c:/Users/Parikshit/Desktop/workspace/ecom/frontend/src/locales/en/translation.json) (English)
>    * [locales/nl/translation.json](file:///c:/Users/Parikshit/Desktop/workspace/ecom/frontend/src/locales/nl/translation.json) (Dutch)
>    * *Zero hardcoded text strings in UI!*
> 5. **Work Memory Logging:** All technical decisions and files touched must be logged in `brain/09_work_memory.md` upon completion of each phase.
> 6. **Zero Regressions:** Strict TypeScript verification (`tsc --noEmit`) before presenting any step for user audit.

---

## 🗺️ Layer-by-Layer Detailed Checklist

### 🗄️ Phase 1: Database Schema, Dual-Layer Models & Migration (Backend DB)
- [x] **Task 1.1:** Add `Warehouse`, `WarehouseType`, `StockMovementType`, and `POStatus` enums and models to `backend/prisma/schema.prisma`.
- [x] **Task 1.2:** Add `InventoryItem` with dual-layer metrics (`quantityOnHand`, `webshopAllocated`, `quantityReserved`, `binLocation`, `customBarcode`, `qrCodePayload`, `reorderPoint`) to `schema.prisma`.
- [x] **Task 1.3:** Add `StockMovement` (immutable ledger), `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, and `StockTransfer` models to `schema.prisma`.
- [x] **Task 1.4:** Generate and execute Prisma migration: `npx prisma db push` and `npx prisma generate` (Prisma Client v5.22.0 synced).
- [x] **Task 1.5:** Create database migration script (`backend/src/utils/migrateExistingProductsToInventory.ts`) to initialize default Central Warehouse and migrate/link all 24 existing real products (38 items/variants) in DB.

---

### ⚙️ Phase 2: Backend Core Services, QR/Barcode Engine & APIs (Backend Logic)
- [x] **Task 2.1:** Install backend barcode, QR and PDF dependencies (`qrcode`, `bwip-js`, `pdfkit`).
- [x] **Task 2.2:** Build QR & Barcode generation utility (`backend/src/services/qrBarcodeService.ts`) to encode deep-links and machine payloads.
- [x] **Task 2.3:** Build PDF Label Sheet Generator (`backend/src/services/labelPrintService.ts`) supporting thermal rolls (50x30mm) and A4 sheets (24/30 labels per page).
- [x] **Task 2.4:** Implement Inventory Controller & routes (`inventoryController.ts`, `inventoryRoutes.ts`) for list, SKU scanner lookup, stock adjustment, webshop quota allocation, QR code data, and PDF label streaming.
- [x] **Task 2.5:** Update Product Controller (`backend/src/controllers/productController.ts`) & `InventoryService` to automatically initialize/sync default variants and `InventoryItem` on product creation and updates.

---

### 🖥️ Phase 3: Frontend Admin UI, Product Form Hook & Translations (Frontend)
- [x] **Task 3.1:** Create Master Admin Inventory Dashboard (`frontend/src/pages/admin/AdminInventory.tsx`) with 3 View Tabs:
  - `All Inventory (Master)`
  - `Storage / Warehouse Only (Physical on-hand & Bin locations)`
  - `Webshop Channel Only (Live online stock & Reserves)`
- [x] **Task 3.2:** Build Metric Summary Cards (Total Storage Units, Webshop Active Units, Reserve Buffer, Low Stock Alerts).
- [x] **Task 3.3:** Integrate **"📦 Inventory & Storage Management"** Card inside `frontend/src/pages/admin/AdminProductForm.tsx` (`/admin/products/:id/edit`) for direct quantity and bin location editing.
- [x] **Task 3.4:** Build Stock Adjustment Modal (`StockAdjustmentModal.tsx`) and Quota Allocation Modal (`AllocateWebshopModal.tsx`).
- [x] **Task 3.5:** Add comprehensive **English & Dutch translations** for all new dashboard tables, metric cards, forms, and toasts in `locales/en/translation.json` and `locales/nl/translation.json`.

---

### 📱 Phase 4: Mobile Camera Scanner, Laser Gun & Label Print Center (Scanner & Print)
- [x] **Task 4.1:** Install frontend camera scanning library (`html5-qrcode` / `zxing-js`).
- [x] **Task 4.2:** Build Mobile Warehouse Scanner Modal (`frontend/src/components/admin/inventory/WarehouseScannerModal.tsx`) with live camera viewfinder, beep audio, and haptic feedback.
- [x] **Task 4.3:** Build Scan Action Drawer (Quick $+1$/$-1$ Inward/Outward, Allocate to Webshop, Set Physical Count, Change Rack/Bin).
- [x] **Task 4.4:** Build Label Print Modal (`frontend/src/components/admin/inventory/LabelPrintModal.tsx`) with layout selector (Thermal Roll / A4 Sheet) and live browser print stream.
- [x] **Task 4.5:** Add **English & Dutch translations** for scanner prompts, audio feedback, print options, and drawer actions.

---

### 🔒 Phase 5: Storefront Concurrency Guard & Auto-Sync Engine (Checkout & Redis)
- [ ] **Task 5.1:** Build Redis-backed checkout reservation service (`backend/src/services/inventoryReservationService.ts`) with 15-minute TTL.
- [ ] **Task 5.2:** Connect Storefront Cart & Order Checkout endpoints (`/api/v1/orders/checkout-reserve`) to verify and lock webshop stock atomically.
- [ ] **Task 5.3:** Connect Stripe payment webhook to convert temporary locks into permanent deductions (`ORDER_FULFILLED`) in both storage and webshop.
- [ ] **Task 5.4:** Create background cron/worker to auto-release expired 15-min reservations and restore webshop quota (`ORDER_RESERVATION_CANCEL`).
- [ ] **Task 5.5:** Smart `inStock` Storefront Sync: Automatically toggle product storefront status to *"Out of Stock"* when webshop quota reaches 0.

---

### 🧪 Phase 6: Procurement (PO), Integration Testing & Audit Reconciliation (QA)
- [ ] **Task 6.1:** Build Supplier & Purchase Order (PO) screens (`AdminSuppliers.tsx`, `AdminPurchaseOrders.tsx`) with Goods Inward (GRN) scanning workflow.
- [ ] **Task 6.2:** Build Stock Movement Audit Ledger page (`AdminStockMovements.tsx`) to view full history of every product.
- [ ] **Task 6.3:** Automated Concurrency Stress Test: 50 virtual users buying 2 units simultaneously (verify zero overselling).
- [ ] **Task 6.4:** Audit Ledger Reconciliation Test: Verify $\text{Physical Stock} \equiv \text{Initial Seed} + \sum (\text{Ledger Movements})$.
- [ ] **Task 6.5:** End-to-End User Flow Verification (Category $\rightarrow$ Product AI Quick Add $\rightarrow$ Edit Quantity $\rightarrow$ QR Scan $\rightarrow$ Webshop Buy $\rightarrow$ Stock Audit).

---

## 📝 Activity & Changelog

| Date | Phase | Description of Change | Completed By | Status |
| :--- | :--- | :--- | :--- | :--- |
| **2026-09-10** | Architecture | Initialized Master Roadmap, User Manual & Phased Architecture. | Antigravity | ✅ Ready |
