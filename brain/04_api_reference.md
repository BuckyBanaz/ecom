# 🔌 API Reference — Brain File

## Base URL
- **Local Dev**: `http://localhost:5000`
- **Production**: `https://api.schipenster.com`

## All routes prefixed with `/api/v1`

## Auth Headers
- **Customer/Public**: No auth OR `Authorization: Bearer <JWT_TOKEN>`
- **Admin-only routes**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`

---

## 🔑 Auth Routes — `/api/v1/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Register customer |
| POST | `/auth/login` | None | Login (email or phone) |
| POST | `/auth/login-admin` | None | Admin login with role check |
| POST | `/auth/create-admin` | None | Create admin account |
| POST | `/auth/firebase` | None | Firebase/Google OAuth sign-in |
| POST | `/auth/send-otp` | None | Send OTP via Twilio |
| POST | `/auth/verify-otp` | None | Verify OTP |
| POST | `/auth/forgot-password` | None | Send reset email |
| POST | `/auth/reset-password` | None | Reset with token |
| GET | `/auth/me` | JWT | Get current user profile |
| PUT | `/auth/profile` | JWT | Update profile |

### Login Request Body (flexible)
```json
{ "email": "user@example.com", "password": "pass" }
// OR
{ "phone": "9876543210", "password": "pass" }
// OR
{ "emailOrPhone": "user@example.com", "password": "pass" }
```

### Token Response Shape
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer",
    "avatar": "https://api.dicebear.com/..."
  }
}
```

---

## 🏷️ Product Routes — `/api/v1/products`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | None | List with filter + pagination |
| GET | `/products/:slug` | None | Single product by slug |
| GET | `/products/:id/reviews` | None | Product reviews |
| POST | `/products` | Admin | Create product |
| PUT | `/products/:id` | Admin | Update product |
| DELETE | `/products/:id` | Admin | Delete product |

### Product List Query Params
```
?page=1&limit=12
&category=pendant-lamps
&brand=Philips
&search=Rattan
&minPrice=20&maxPrice=150
&sort=price-asc|price-desc|rating|newest
&inStock=true
```

---

## 📂 Category Routes — `/api/v1/categories`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/categories` | None | All categories |
| GET | `/categories/:slug` | None | Single category |
| POST | `/categories` | Admin | Create |
| PUT | `/categories/:id` | Admin | Update |
| DELETE | `/categories/:id` | Admin | Delete |

---

## 🏪 Other Catalog Routes

| Prefix | Description |
|--------|-------------|
| `/api/v1/brands` | Brand CRUD |
| `/api/v1/series` | Product series CRUD |
| `/api/v1/attributes` | EAV attribute definitions CRUD |
| `/api/v1/megamenus` | Mega menu config CRUD |

---

## 📦 Order Routes — `/api/v1/orders`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders` | Optional JWT | Place new order (guest or logged in) |
| GET | `/orders/my-orders` | JWT | Customer's own orders |
| GET | `/orders` | Admin | All orders |
| GET | `/orders/:id` | Admin | Order detail |
| PUT | `/orders/:id/status` | Admin | Update status |
| GET | `/orders/ready-to-ship` | Admin | Ready to ship list |
| GET | `/orders/in-transit` | Admin | In transit list |
| GET | `/orders/delivered` | Admin | Delivered list |
| GET | `/orders/returns` | Admin | Returns list |

### Order Status Values
`pending` → `processing` → `ready_to_ship` → `in_transit` → `delivered`
Returns: `return_requested` → `returned`

---

## 💳 Payment Routes — `/api/v1/payments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/create-session` | Create Stripe checkout session |
| POST | `/payments/webhook` | Stripe webhook (raw body) |

---

## 🎨 CMS Routes — `/api/v1/cms`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cms/:slug` | None | Get CMS page by slug |
| PUT | `/cms/:slug` | Admin | Update CMS page |
| GET | `/cms/pages` | Admin | List all pages |
| POST | `/cms/pages` | Admin | Create page |

---

## 🖼️ Media Routes — `/api/v1/media`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/media` | Admin | List files/folders |
| POST | `/media/upload` | Admin | Upload file (multipart) |
| DELETE | `/media/:id` | Admin | Delete file |
| POST | `/media/folders` | Admin | Create folder |
| PUT | `/media/:id/rename` | Admin | Rename file |

Uploaded files served at: `/uploads/<filename>`

---

## ⚙️ Admin Settings Routes — `/api/v1/admin/settings`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/settings` | Get all settings |
| PUT | `/admin/settings` | Update settings |
| GET | `/admin/logs` | Server logs |
| GET | `/admin/backups` | List backups |
| POST | `/admin/backups/download` | Download DB backup |

---

## 🛒 Other Routes

| Prefix | Description |
|--------|-------------|
| `/api/v1/reviews` | Product reviews CRUD |
| `/api/v1/addresses` | User saved addresses |
| `/api/v1/wishlists` | Wishlist items |
| `/api/v1/coupons` | Coupon codes |
| `/api/v1/charges` | Shipping charge config |
| `/api/v1/shipping` | Sendcloud shipping |
| `/api/v1/blogs` | Blog CRUD |
| `/api/v1/notifications` | Push notifications |
| `/api/v1/config` | Public config (maintenance mode, etc.) |

---

## 🔍 Special Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check (Redis + uptime) |
| `GET /robots.txt` | Dynamic robots.txt (from AdminSettings) |
| `GET /sitemap.xml` | Dynamic sitemap (from AdminSettings) |
| `GET /api-docs` | Swagger UI |

---

## Error Response Shape
```json
{
  "success": false,
  "message": "Route GET /api/v1/xyz not found",
  "statusCode": 404
}
```

## Rate Limiting
- Global rate limit applied via `globalLimiter` middleware
- Redis-backed rate limiting for auth endpoints (brute force protection)
