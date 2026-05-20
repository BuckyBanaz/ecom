# Mega Menu & Advanced Catalog Architecture

Based on the visual analysis of the Lampgigant reference screenshots, the top navigation mega menus are not simple 1-to-1 mappings of Database Categories. They are curated UI layouts that group links by different logical entities (Categories, Rooms, Styles, Features).

## 1. Visual Structure Analysis

When hovering over a main group (e.g., **Interior Lighting**), the menu expands into a grid of columns:
*   **Column 1: Categories** (Pendant lights, Ceiling lights, Wall lamps...) -> *Maps to strict Database Categories.*
*   **Column 2: Rooms** (Living room, Dining table, Kitchen...) -> *Maps to Product Attributes or Tags.*
*   **Column 3: Styles** (Industrial, Modern, Vintage...) -> *Maps to Product Attributes or Tags.*
*   **Column 4: Featured** (Smart LED lamps, Offers...) -> *Maps to curated collections or promotional pages.*

## 2. Recommended Implementation Strategy

To implement this dynamically without creating a chaotic, deeply nested relational database for every single link, we should use a **Headless CMS / JSON Configuration** approach for the Navigation UI, combined with **Attribute-based filtering** for the actual products.

### A. The Database Schema (Product & Attributes)

Instead of making "Living Room" a category, it should be an attribute on the Product.

```prisma
// Example updates to schema.prisma
model Product {
  id           String     @id @default(uuid())
  slug         String     @unique
  name         String
  categorySlug String     // "pendant-lights"
  
  // New Relational/Array fields for Mega Menu filtering
  rooms        String[]   // ["living-room", "kitchen"]
  styles       String[]   // ["industrial", "modern"]
  
  // ... existing fields
}
```

### B. The Navigation Menu Structure (CMS Config)

The actual UI structure of the Mega Menu should be stored as a JSON object in our existing `CmsConfig` table. This allows Admins to easily re-arrange columns, add promotional links, or change labels without altering the core database schema.

**Stored in `CmsConfig` table under key: `mega_menu_config`**
```json
[
  {
    "id": "interior-lighting",
    "label": "Interior lighting",
    "columns": [
      {
        "title": "Categories",
        "links": [
          { "label": "Pendant lights", "url": "/category/pendant-lights" },
          { "label": "Ceiling lights", "url": "/category/ceiling-lights" }
        ]
      },
      {
        "title": "Rooms",
        "links": [
          { "label": "Living room", "url": "/search?room=living-room" },
          { "label": "Kitchen", "url": "/search?room=kitchen" }
        ]
      },
      {
        "title": "Styles",
        "links": [
          { "label": "Industrial lamps", "url": "/search?style=industrial" },
          { "label": "Modern lamps", "url": "/search?style=modern" }
        ]
      }
    ]
  }
]
```

## 3. Frontend Implementation Plan

1.  **Header Component Upgrade**: 
    Modify `Header.tsx` to fetch the `mega_menu_config` JSON from the backend instead of just fetching `Groups`.
2.  **Mega Menu Dropdown**: 
    Use Tailwind CSS Grid (`grid-cols-4`) inside a dropdown or Shadcn UI `NavigationMenu` component to render the nested arrays (Columns -> Links) when hovering over the main group labels.
3.  **Dynamic Routing**:
    *   Links going to `/category/...` will hit the existing Category products page.
    *   Links going to `/search?room=...` will hit the Search page, which we will upgrade to read URL parameters and filter the backend products by the `rooms` or `styles` array.

## 4. Why this is the best approach?
*   **Flexibility**: Admins can add a "Featured" column that links directly to a specific product or a promotional page without needing to write new backend code.
*   **Clean Database**: Products only need to belong to ONE Category (e.g. Wall Lamps), but can be tagged with MULTIPLE Rooms or Styles.
*   **Performance**: The entire menu structure can be fetched in one single lightweight API call and cached in Redis/Local Storage instantly.

---

## 5. Product Specs (Attributes) Dictionary
Based on the advanced filter sidebar, the JSON `specs` column on the **Product** model should support the following key-value pairs. Frontend forms should pass these during Product Creation (`POST`) and Update (`PUT`).

```json
{
  "offer": boolean,            // true/false
  "outlet": boolean,           // true/false
  "typeOfLamp": string[],      // ["Dome lamps", "Smart pendant lights", "Bathroom pendant lights"]
  "color": string[],           // ["Black", "White", "Gold"]
  "material": string[],        // ["Acrylic", "Aluminum", "Concrete", "Filigree", "Glass", "Plaster"]
  "style": string[],           // ["Design", "Industrial", "Modern", "Nationwide", "Retro", "Vintage"]
  "form": string[],            // ["Peer", "Cylinder", "Ball"]
  "room": string[],            // ["Bathroom", "Kitchen", "Living room", "Dining table"]
  "dimensions": {
    "length": number,          // in cm
    "height": number,          // in cm
    "width": number,           // in cm
    "diameter": number         // in cm
  },
  "typeOfFitting": string,     // "E27", "GU10", "LED"
  "numberOfLights": number,    // 1, 2, 3, etc.
  "includesLight": boolean,    // true/false
  "lightColor": string[],      // ["Warm white", "Cool white", "RGB"]
  "dimmable": boolean,         // true/false
  "dimmerType": string,        // "Wall switch", "Remote control", "App"
  "ipRating": string,          // "IP20", "IP44", "IP65" (Crucial for outdoor/bathroom)
  "withSwitch": boolean,       // true/false
  "switchType": string,        // "Cord switch", "Touch switch", "Pull switch"
  "special": string[],         // ["Smart home", "Handmade", "Sale"]
  "action": string[]           // Promotional tags
}
```
*(Note: **Price** and **Brand** are existing top-level columns in the database, so they are not included inside the `specs` JSON object, but they will still be used as filters in the sidebar).*

### URL Filtering Example
When a user clicks "Black" under "Colour", the frontend will call:
`GET /api/v1/catalog/products?color=Black`

The backend query (Prisma) will look like this:
```typescript
const products = await prisma.product.findMany({
  where: {
    specs: {
      path: ['color'],
      array_contains: 'Black'
    }
  }
});
```
