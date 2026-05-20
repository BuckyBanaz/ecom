# Lampgigant Storefront Clone (Demo)

A pixel-faithful recreation of lampgigant.nl as a demo storefront. English UI, hardcoded products, full shopping flow with mock checkout (no real payments). For personal/learning use only.

## Design system
- **Colors**: pink/coral primary `#EE5A6F` (matches the LAMPGIGANT logo), dark navy text `#1A1F36`, light gray surfaces, white background.
- **Typography**: clean sans-serif (Inter), bold uppercase for logo wordmark, large display weight for hero headlines.
- **Components**: rounded search bar, soft card shadows, pink CTA buttons, icon-led trust bar.

## Pages & routes
1. **Home `/`**
   - Top utility bar: ★ 15,000+ reviews · same-day shipping · 30-day returns · Business · Customer service
   - Header: logo, full-width search, account / wishlist / cart icons
   - Mega-nav: Indoor lighting, Outdoor lighting, Light bulbs, Business lighting, By room, Accessories, Smart home, Deals
   - Hero banner: "Spring Deals — up to 50% off" with Shop now CTA
   - Categories grid (6 tiles): Pendant lamps, String lights, Ceiling lamps, Wall lamps, Outdoor lamps, Floor lamps
   - Second category row: Smart bulbs, Lampshades, Table lamps, Chandeliers, LED bulbs, Office lighting
   - Featured products carousel
   - Popular brands strip
   - Customer reviews section
   - Newsletter signup block
   - Rich footer (multi-column links, payment icons, socials)

2. **Category `/category/:slug`**
   - Breadcrumb, category title, result count
   - Left sidebar filters: price range, color, material, style, brand, smart-compatible
   - Sort dropdown, grid/list toggle
   - Product grid with cards (image, name, rating, price, discount badge, "Add to cart")
   - Pagination

3. **Product detail `/product/:slug`**
   - Image gallery with thumbnails
   - Title, rating, SKU, price (with strikethrough on sale), stock status
   - Variant selectors (color, bulb fitting, wattage)
   - Quantity stepper, Add to cart, wishlist
   - Trust bullets (free shipping, fast delivery, returns)
   - Tabs: Description, Specifications, Reviews, Q&A
   - Related products

4. **Cart `/cart`**
   - Line items with image, name, variant, qty stepper, remove
   - Order summary: subtotal, shipping, total
   - Promo code field, Continue to checkout button

5. **Checkout `/checkout`**
   - Multi-step: Contact → Shipping → Payment (mock) → Confirmation
   - Address form, shipping method picker, payment method picker (iDEAL, card, PayPal — visual only)
   - Order summary sidebar
   - "Place order" → success page with mock order number

6. **Search results `/search?q=`** — reuses category grid layout
7. **Account stub `/account`** — login/register form (visual only, no auth)
8. **Customer service `/help`** — simple FAQ accordion
9. **404** — already exists

## Shared UI
- Sticky header with mini-cart drawer (slides from right showing items + checkout button)
- Mobile: hamburger nav as a sheet, bottom-anchored search
- Toast notifications on add-to-cart / wishlist actions
- Wishlist + cart state managed in React context with localStorage persistence

## Demo data
- ~24 hardcoded lamp products across categories with placeholder images, names, prices, ratings, and variants
- Stored in `src/data/products.ts`
- Mock reviews and brand list

## Out of scope
- Real authentication, real payments, real inventory
- Backend / database (Lovable Cloud not used per your choice)
- Multilingual switcher (English only)
