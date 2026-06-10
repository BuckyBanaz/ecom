# E-Commerce Lighting Platform Architecture

## 🎯 Overall Project Status & Progress (v0.1)

### ✅ Completed Features
- [x] **Admin Panel & Architecture:** Full setup of the E-commerce backend using Node.js, Express, Prisma, PostgreSQL.
- [x] **Dynamic Pages (CMS):** A flexible CMS with UI Blocks (Hero banners, Sliders, Category carousels).
- [x] **Rich Text Editor Fixes:** Solved focus and selection loss issues when adding shortcodes to dynamic pages.
- [x] **Category Multi-Select:** Built API-driven category multi-select dropdown for CMS blocks (with search and "All Categories" toggle).
- [x] **Shortcode Rendering Engine:** Added mixed-content rendering capability so dynamic pages can cleanly interleave HTML content with block shortcodes.
- [x] **Storage / Media Library:** Built a professional Google Drive-style file manager within the Admin Panel. Features include folder navigation, file uploads, rename, bulk delete to trash, URL copying, and a visual grid/list layout.
- [x] **Swagger Documentation:** API documentation integration available at `/api-docs`.

### 🚧 Pending Features
- [ ] **Frontend Shop Implementation:** Integrating the actual user-facing E-commerce storefront with the database.
- [ ] **Product Management:** Full CRUD for Products, Variants, and EAV Attributes in the admin panel.
- [ ] **Cart & Checkout Flow:** User cart state management and payment gateway integration.
- [ ] **Order Management:** Tracking and updating order statuses from the admin panel.
- [ ] **User Authentication:** Robust login/registration and role-based access for customers and admins.

---

This document provides a visual and structured walkthrough of the platform's routing flow and database schema relationships.

![E-Commerce Catalog Architecture](file:///C:/Users/Parikshit/.gemini/antigravity-ide/brain/44536a3f-c458-4e66-a52f-24c9733d9503/ecom_architecture_diagram_1779272280064.png)

---

## 1. Catalog & Navigation Flow

The following flowchart explains how a user navigates from the **Mega Menu** dynamic navigation configuration to **Categories**, **Products**, and down to their dynamic **Attributes/Specifications**.

```mermaid
graph TD
    subgraph Navigation & Menu Layer
        M[MegaMenu Config JSON] -->|Contains nested Sections & Links| L[Section Link / Category Slug]
    end

    subgraph Categories & Subcategories
        L -->|Matches unique slug| C[Category Entity]
        C -->|Self-referencing parent_id| SC[Subcategories / Children]
    end

    subgraph Products Catalog
        C & SC -->|Mapped via category_id| P[Product Entity]
        P -->|Optional brand_id| B[Brand Entity]
        P -->|Optional series_id| S[Series Entity]
        B -->|Has Series collections| S
    end

    subgraph Dynamic Specs & EAV Attributes
        P -->|Has specifications JSON| SP[Specs - e.g., Warranty, Dimensions]
        P -->|Many-to-Many attributes mapping| PAV[Product Attribute Value]
        PAV -->|Links to| A[Attribute - e.g., Color, Material]
        PAV -->|Links to| AV[Attribute Value - e.g., Black, Glass]
    end

    subgraph Skus & Variations
        P -->|Has variants| PV[Product Variant]
        PV -->|Many-to-Many attributes mapping| VAV[Variant Attribute Value]
        VAV -->|Links to| AV
    end
```

---

## 2. Entity Relationship Diagram (ERD)

The database uses a relational database model (PostgreSQL) managed by Prisma. The dynamic filtering system is implemented using an **Entity-Attribute-Value (EAV)** pattern via `attributes`, `attribute_values`, and mapping tables.

```mermaid
erDiagram
    MEGAMENU {
        string id PK
        string menu "e.g., Main Header"
        string slug UK
        json sections "Array of links and headers"
    }

    CATEGORY {
        string id PK
        string name
        string slug UK
        string image
        string group "indoor/outdoor/bulbs..."
        string parent_id FK "Category self-relation"
    }

    PRODUCT {
        string id PK
        string name
        string slug UK
        string brand_id FK
        string category_id FK
        float price
        float old_price
        float rating
        int review_count
        string image
        boolean in_stock
        boolean is_new_arrival
        boolean is_best_selling
        string description
        string short_description
        json specs "Flat static features"
    }

    BRAND {
        string id PK
        string name UK
        string logo
    }

    SERIES {
        string id PK
        string name
        string slug UK
        string logo
        string brand_id FK
    }

    ATTRIBUTE {
        string id PK
        string name "e.g., Bulb fitting"
        string slug UK "e.g., bulb-fitting"
        string type "select/multi_select/range"
        string visibility "admin/filter/both"
    }

    ATTRIBUTE_VALUE {
        string id PK
        string attribute_id FK
        string value "e.g., E27"
        string color_code "HEX color code"
    }

    PRODUCT_ATTRIBUTE_VALUE {
        string id PK
        string product_id FK
        string attribute_id FK
        string attribute_value_id FK
    }

    PRODUCT_VARIANT {
        string id PK
        string product_id FK
        string sku UK
        int stock
        float price "Overrides product base price"
    }

    VARIANT_ATTRIBUTE_VALUE {
        string id PK
        string variant_id FK
        string attribute_value_id FK
    }

    CATEGORY ||--o{ CATEGORY : "has subcategories"
    CATEGORY ||--o{ PRODUCT : "contains"
    BRAND ||--o{ PRODUCT : "manufactures"
    BRAND ||--o{ SERIES : "contains"
    PRODUCT ||--o{ PRODUCT_ATTRIBUTE_VALUE : "has dynamic attributes"
    ATTRIBUTE ||--o{ ATTRIBUTE_VALUE : "has values"
    ATTRIBUTE ||--o{ PRODUCT_ATTRIBUTE_VALUE : "linked attribute"
    ATTRIBUTE_VALUE ||--o{ PRODUCT_ATTRIBUTE_VALUE : "linked value"
    PRODUCT ||--o{ PRODUCT_VARIANT : "has variants"
    PRODUCT_VARIANT ||--o{ VARIANT_ATTRIBUTE_VALUE : "has variant attributes"
    ATTRIBUTE_VALUE ||--o{ VARIANT_ATTRIBUTE_VALUE : "linked variant value"
```

---

## 3. Data Schema & Parameters Map

1. **Mega Menu Config**: Stored as a JSON array defining categories and section groupings. The frontend parses this configuration to build the dropdown menus dynamically.
2. **EAV dynamic attributes**:
   - `Attribute` holds the definition of a parameter (like *Material*, *IP Rating*).
   - `AttributeValue` holds the allowed values (like *Rattan*, *IP44*).
   - `ProductAttributeValue` links a specific `Product` to its selected `Attribute` and `AttributeValue`.
3. **Static Specifications**: Mapped as a JSON object `specs` on the `Product` model for flat, non-filterable details like *Warranty* and *Product Dimensions*.

3. **Static Specifications**: Mapped as a JSON object `specs` on the `Product` model for flat, non-filterable details like *Warranty* and *Product Dimensions*.
📲 [DEMO SMS] OTP for 9876543210 is: 123456