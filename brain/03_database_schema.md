# 🗃️ Database Schema — Brain File

## ORM: Prisma v5 | DB: PostgreSQL 15
Schema file: `backend/prisma/schema.prisma`

---

## Core Entities

### Product
```prisma
model Product {
  id               String   (PK, UUID)
  name             String
  slug             String   (UNIQUE)
  brand_id         String?  (FK → Brand)
  category_id      String?  (FK → Category)
  series_id        String?  (FK → Series)
  price            Float
  old_price        Float?
  rating           Float
  review_count     Int
  image            String
  in_stock         Boolean
  is_new_arrival   Boolean
  is_best_selling  Boolean
  description      String
  short_description String?
  specs            Json     // Flat, non-filterable static features
}
```

### Category
```prisma
model Category {
  id        String   (PK)
  name      String
  slug      String   (UNIQUE)
  image     String
  group     String   // "indoor" | "outdoor" | "bulbs" etc.
  parent_id String?  (FK → Category, self-referencing for subcategories)
}
```

### Brand & Series
```prisma
model Brand {
  id   String (PK)
  name String (UNIQUE)
  logo String
}

model Series {
  id       String (PK)
  name     String
  slug     String (UNIQUE)
  logo     String
  brand_id String (FK → Brand)
}
```

---

## EAV (Entity-Attribute-Value) System
Used for dynamic, filterable product attributes.

```prisma
model Attribute {
  id         String  (PK)
  name       String  // "Color", "Bulb fitting"
  slug       String  (UNIQUE) // "color", "bulb-fitting"
  type       String  // "select" | "multi_select" | "range"
  visibility String  // "admin" | "filter" | "both"
}

model AttributeValue {
  id           String  (PK)
  attribute_id String  (FK → Attribute)
  value        String  // "E27", "Black", "Rattan"
  color_code   String? // HEX for color swatches
}

model ProductAttributeValue {
  id                 String  (PK)
  product_id         String  (FK → Product)
  attribute_id       String  (FK → Attribute)
  attribute_value_id String  (FK → AttributeValue)
}
```

---

## Variants System

```prisma
model ProductVariant {
  id         String  (PK)
  product_id String  (FK → Product)
  sku        String  (UNIQUE)
  stock      Int
  price      Float?  // Overrides base product price if set
}

model VariantAttributeValue {
  id                 String  (PK)
  variant_id         String  (FK → ProductVariant)
  attribute_value_id String  (FK → AttributeValue)
}
```

---

## User & Auth System

```prisma
model User {
  id         String   (PK, UUID)
  firstName  String
  lastName   String
  email      String?  (UNIQUE)
  phone      String?  (UNIQUE)
  password   String   (bcrypt hashed)
  role       String   // "customer" | "admin" | "moderator" | "superadmin"
  avatar     String   // dicebear SVG URL
  firebaseUid String? // for Google OAuth
}
```

### Auth Mechanisms
- **Email/Password** — bcryptjs hashing, JWT tokens
- **Phone/Password** — same JWT flow
- **Google OAuth** — Firebase Auth + firebaseUid linking
- **OTP** — Twilio SMS for phone verification

---

## Orders System

```prisma
model Order {
  id              String   (PK)
  orderNumber     String   (UNIQUE) // Format: "LG-10099"
  userId          String?  (FK → User, nullable for guest orders)
  customerName    String
  customerEmail   String
  shippingAddress String
  paymentMethod   String
  status          String   // "pending" | "processing" | "shipped" | "delivered" | "returned"
  subtotal        Float
  shipping        Float
  total           Float
  stripeSessionId String?
  createdAt       DateTime
}

model OrderItem {
  id           String  (PK)
  orderId      String  (FK → Order)
  productId    String
  productName  String
  productImage String
  quantity     Int
  price        Float
  variant      String?
}
```

Order statuses flow: `pending → processing → ready_to_ship → in_transit → delivered`
Returns tracked separately.

---

## CMS System

```prisma
model CmsPage {
  id      String  (PK)
  slug    String  (UNIQUE) // Matches URL path
  title   String
  blocks  Json    // Array of UI blocks: hero, carousel, text, etc.
}

model MegaMenu {
  id       String  (PK)
  menu     String  // "Main Header"
  slug     String  (UNIQUE)
  sections Json    // Nested array of section links
}
```

---

## Other Entities

| Model | Purpose |
|-------|---------|
| `Blog` | Blog posts (title, slug, content, image) |
| `Review` | Product reviews (rating, text, user) |
| `Wishlist` / `WishlistItem` | Saved products per user |
| `Address` | Saved shipping addresses |
| `Coupon` | Discount codes |
| `Charge` | Shipping charges config |
| `EmailTemplate` | Transactional email HTML templates |
| `AdminSetting` | Key-value admin config store |
| `Notification` | Push notifications |
| `MediaFile` / `MediaFolder` | Media library (uploads) |

---

## Key Data Patterns

1. **Static Specs** (`specs` JSON on Product) — non-filterable details like Warranty, Dimensions
2. **EAV Attributes** — filterable attributes like Color, Material, IP Rating via `ProductAttributeValue`
3. **Guest Checkout** — `userId` is nullable on Order
4. **Self-referencing Categories** — `parent_id` on Category for subcategories tree

---

## Prisma Seeds

```bash
# Full seed (all data)
npm run prisma:seed

# Only products
npm run prisma:seed:products

# Mega menu
npm run prisma:seed:megamenu

# Email templates
npm run prisma:seed:templates
```
