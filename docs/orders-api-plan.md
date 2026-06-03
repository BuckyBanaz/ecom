# Orders API & Document Management Implementation Plan

## Goal
Build a comprehensive Orders, Invoice, and Shipping Label system. The backend will manage order lifecycle events, payment confirmations (Stripe), invoice generation (PDF), and shipment carrier labels. The frontend will offer distinct tracking statuses for Admins and Customers.

---

## 1. Database Schema Model (Prisma)
We will expand the `Order` model in [schema.prisma](file:///c:/Users/Parikshit/Desktop/workspace/ecom/backend/prisma/schema.prisma):

```prisma
model Order {
  id              String      @id @default(uuid())
  orderNumber     String      @unique @map("order_number")
  userId          String?     @map("user_id")
  user            User?       @relation(fields: [userId], references: [id], onDelete: SetNull)
  customerName    String      @map("customer_name")
  customerEmail   String      @map("customer_email")
  subtotal        Float
  shipping        Float
  total           Float
  status          String      @default("pending") // Pending, Paid, Processing, Shipped, etc.
  paymentMethod   String      @map("payment_method")
  shippingAddress String      @map("shipping_address")
  
  // Invoice & Documents
  invoiceNumber   String?     @map("invoice_number")
  invoiceUrl      String?     @map("invoice_url")
  labelUrl        String?     @map("label_url")
  
  // Tracking & Sendcloud Integration
  trackingNumber  String?     @map("tracking_number")
  carrier         String?     // e.g. "PostNL", "DHL"
  shippingCost    Float?      @map("shipping_cost")
  shipmentStatus  String?     @map("shipment_status") // Sendcloud status

  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")
  items           OrderItem[]
  trackingEvents  TrackingEvent[]

  @@map("orders")
}

model TrackingEvent {
  id          String   @id @default(uuid())
  orderId     String   @map("order_id")
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status      String
  description String?
  timestamp   DateTime @default(now())

  @@map("tracking_events")
}
```

---

## 2. Order Status Lifecycle Flows

### Admin View (Detailed Tracking)
Admins have restricted manual control to prevent conflicts with Sendcloud webhooks. Statuses are split into two categories:

**MANUAL ADMIN STATUSES:**
1. **Pending**: Order registered in system.
2. **Payment Pending**: Awaiting stripe webhook payment.
3. **Paid**: Invoice generated automatically.
4. **Processing**: Order items being retrieved in warehouse.
5. **Ready To Ship**: Packing complete. Order moves to Ready-to-Ship queue.
- *Cancelled*

**AUTO SHIPPING STATUSES (WEBHOOK-DRIVEN / READ-ONLY):**
6. **Label Generated**: Shipment created in Sendcloud.
7. **Picked Up**: Courier accepted the package.
8. **In Transit**: Traveling through routing nodes.
9. **Out For Delivery**: Package in local delivery truck.
10. **Delivered**: Successfully delivered to client.

**Auto Exceptions**:
- `Returned`, `Delivery Failed`, `Lost In Transit`

#### Sendcloud Workflow Automation
- Manual transitions are only permitted up to `Ready To Ship`.
- Once `Ready To Ship`, admin clicks **[Create Shipment]**, triggering the Sendcloud API.
- Sendcloud returns `{ carrier, tracking_number, tracking_url, label_url, shipment_status }`.
- Status becomes `Label Generated` automatically. All subsequent tracking updates are driven exclusively by Sendcloud webhooks.

### Customer View (Simplified Tracking)
Customers receive a simplified checkout progression:
1. **Order Placed** (corresponds to *Pending*, *Payment Pending*, *Paid*)
2. **Processing** (corresponds to *Processing*, *Ready To Ship*, *Label Generated*)
3. **Shipped** (corresponds to *Picked Up*, *In Transit*)
4. **Out For Delivery**
5. **Delivered**

**Exceptions**:
- `Cancelled`
- `Returned`
- `Refunded`

---

## 3. Documents Workflow

### 1. Invoice (Customer Receipt)
- **Generation Trigger**: Automatically generated on payment success.
- **Invoice Pattern**: `#INV-YYYYMMDD-XXXX`
- **Fields**: Vendor logo (Schip & Ster), Invoice reference, Line items, subtotal, shipping fee, tax details, payment method.
- **Export format**: PDF format for printing.

### 2. Shipping Label (Carrier Routing sticker)
- **Carrier Integration (Primary)**: We will integrate **Sendcloud** API as the default service for generating delivery routing labels and registering shipments.
- **Carrier Architecture**: The backend architecture will be built via an abstract `ShippingProvider` interface to easily plug in multiple carriers in the future alongside Sendcloud (e.g. direct PostNL, DHL, UPS).
- **Generation Trigger**: Manual or automatic when order enters "Ready To Ship" state.
- **Fields**: Carrier name, shipper address, receiver address, barcode/QR code, tracking reference ID, weight.
- **Export format**: PDF format.

---

## 4. Frontend Admin Layout Design
- **Dropdown Navigation**: Submenu under `Orders` inside Sidebar:
  - **All Orders** (`/admin/orders`)
  - **Ready To Ship** (`/admin/orders/ready-to-ship`) - Dedicated queue for pending shipments.
  - **Invoices** (`/admin/orders/invoices`)
  - **Shipping Labels** (`/admin/orders/labels`)
- **Detail Screen**:
  - Split status controls (Manual selection vs Auto-tracked states).
  - Context-aware **[Next Step]** button workflow.
  - **Logistics & Tracking Card**: Shows Carrier, Tracking Number, URL, Label Date, Webhook Timeline.
  - Modal flow for **[Create Shipment]** with carrier pricing (Auto Cheapest, PostNL, DHL, UPS, DPD).
