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
  
  // Tracking
  trackingNumber  String?     @map("tracking_number")
  carrier         String?     // e.g. "PostNL", "DHL"
  
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")
  items           OrderItem[]

  @@map("orders")
}
```

---

## 2. Order Status Lifecycle Flows

### Admin View (Detailed Tracking)
Admins have full visibility over payment, packaging, carrier pickup, and delivery stages:
1. **Pending**: Order registered in system.
2. **Payment Pending**: Awaiting stripe webhook payment.
3. **Paid**: Invoice generated automatically.
4. **Processing**: Order items being retrieved in warehouse.
5. **Ready To Ship**: Packing complete.
6. **Label Generated**: Shipping label PDF generated.
7. **Picked Up**: Courier accepted the package.
8. **In Transit**: Traveling through routing nodes.
9. **Out For Delivery**: Package in local delivery truck.
10. **Delivered**: Successfully delivered to client.

**Exceptions**:
- `Cancelled`
- `Payment Failed`
- `Returned`
- `Refunded`
- `Delivery Failed`
- `Lost In Transit`

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
  - **Invoices** (`/admin/orders/invoices`)
  - **Shipping Labels** (`/admin/orders/labels`)
- **Detail Screen**:
  - Interactive status dropdown with the 15+ tracking states.
  - Quick action buttons to **Generate/Print Invoice** and **Generate/Print Shipping Label**.
  - Interactive customer logs and timeline history tracker.
