# E-Commerce REST API Specifications

All backend endpoints are prefixed with `/api/v1`. The base URL for local development will be `http://localhost:5000`.

---

## 🔑 Authentication APIs

### 1. Register Customer
* **Endpoint**: `POST /api/v1/auth/register`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "9876543210",
  "password": "customer123"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Customer registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "9fe9a154-8674-4ec2-ad09-a35718c531b9",
    "name": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "role": "customer",
    "avatar": "https://api.dicebear.com/7.x/initials/svg?seed=John%20Doe"
  }
}
```

### 2. Login Customer (Email or Phone)
* **Endpoint**: `POST /api/v1/auth/login`
* **Headers**: `Content-Type: application/json`
* **Request Body (Using Email)**:
```json
{
  "email": "john.doe@example.com",
  "password": "customer123"
}
```
* **Request Body (Using Phone)**:
```json
{
  "phone": "9876543210",
  "password": "customer123"
}
```
* **Request Body (Using Combined emailOrPhone)**:
```json
{
  "emailOrPhone": "john.doe@example.com",
  "password": "customer123"
}
```
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Customer logged in successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "9fe9a154-8674-4ec2-ad09-a35718c531b9",
    "name": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "role": "customer",
    "avatar": "https://api.dicebear.com/7.x/initials/svg?seed=John%20Doe"
  }
}
```

### 3. Create Admin Account
* **Endpoint**: `POST /api/v1/auth/create-admin`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "email": "newadmin@lamp.com",
  "password": "admin123",
  "role": "admin"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "ADMIN admin account created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "3c53562b-9521-42da-9e9f-6e8d63c38b41",
    "name": "Newadmin (Admin)",
    "email": "newadmin@lamp.com",
    "role": "admin",
    "avatar": "https://api.dicebear.com/7.x/adventurer/svg?seed=newadmin"
  }
}
```

### 4. Login Admin (With Role Protection)
* **Endpoint**: `POST /api/v1/auth/login-admin`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "email": "newadmin@lamp.com",
  "password": "admin123",
  "role": "admin"
}
```
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "ADMIN logged in successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "3c53562b-9521-42da-9e9f-6e8d63c38b41",
    "name": "Newadmin (Admin)",
    "email": "newadmin@lamp.com",
    "role": "admin",
    "avatar": "https://api.dicebear.com/7.x/adventurer/svg?seed=newadmin"
  }
}
``````

---

## 🏷️ Products & Catalog APIs

### 1. Get Categories
* **Endpoint**: `GET /api/v1/categories`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "slug": "pendant-lamps",
      "name": "Pendant lamps",
      "image": "/assets/cat-pendant.jpg",
      "group": "indoor"
    },
    {
      "slug": "string-lights",
      "name": "String lights",
      "image": "/assets/cat-string.jpg",
      "group": "outdoor"
    }
  ]
}
```

### 2. Get Products (with Filter and Pagination)
* **Endpoint**: `GET /api/v1/products`
* **Query Parameters**:
  - `page`: default `1`
  - `limit`: default `12`
  - `category`: e.g. `pendant-lamps`
  - `brand`: e.g. `Philips`
  - `search`: e.g. `Rattan`
  - `minPrice`: e.g. `20`
  - `maxPrice`: e.g. `150`
  - `sort`: `price-asc` | `price-desc` | `rating` | `newest`
  - `inStock`: `true` | `false`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "p-1",
      "slug": "mira-rattan-pendant-1",
      "name": "Mira Rattan Pendant",
      "brand": "Lumio",
      "category": "pendant-lamps",
      "price": 89.95,
      "oldPrice": 125.93,
      "rating": 4.1,
      "reviewCount": 19,
      "image": "/assets/cat-pendant.jpg",
      "color": "Black",
      "material": "Metal",
      "style": "Modern",
      "fitting": "E27",
      "inStock": true,
      "description": "A beautifully crafted lamp...",
      "specs": {
        "Material": "Metal",
        "Bulb fitting": "E27",
        "Max wattage": "40W",
        "Dimmable": "Yes",
        "IP rating": "IP20",
        "Warranty": "2 years"
      }
    }
  ],
  "pagination": {
    "total": 48,
    "page": 1,
    "limit": 12,
    "totalPages": 4
  }
}
```

### 3. Get Product By Slug
* **Endpoint**: `GET /api/v1/products/:slug`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "p-1",
    "slug": "mira-rattan-pendant-1",
    "name": "Mira Rattan Pendant",
    "brand": "Lumio",
    "category": "pendant-lamps",
    "price": 89.95,
    "oldPrice": 125.93,
    "rating": 4.1,
    "reviewCount": 19,
    "image": "/assets/cat-pendant.jpg",
    "color": "Black",
    "material": "Metal",
    "style": "Modern",
    "fitting": "E27",
    "inStock": true,
    "description": "A beautifully crafted lamp...",
    "specs": {
      "Material": "Metal",
      "Bulb fitting": "E27",
      "Max wattage": "40W"
    }
  }
}
```

### 4. Get Product Reviews
* **Endpoint**: `GET /api/v1/products/:id/reviews`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "name": "Sophie V.",
      "rating": 5,
      "title": "Beautiful lamp, fast delivery",
      "text": "Ordered late in the evening and it arrived the next morning. The lamp is even nicer in person."
    }
  ]
}
```

---

## 📦 Checkout & Orders APIs

### 1. Place New Order
* **Endpoint**: `POST /api/v1/orders`
* **Headers**:
  - `Authorization: Bearer <token>` *(Optional: supports both guest and registered checkout)*
* **Request Body**:
```json
{
  "customerName": "Jane Doe",
  "customerEmail": "jane@example.com",
  "shippingAddress": "123 Main St, Amsterdam, NL",
  "paymentMethod": "Credit Card",
  "items": [
    {
      "productId": "p-1",
      "productName": "Mira Rattan Pendant",
      "productImage": "/assets/cat-pendant.jpg",
      "quantity": 2,
      "price": 89.95,
      "variant": "Black"
    }
  ],
  "subtotal": 179.90,
  "shipping": 0.00,
  "total": 179.90
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "id": "ord-99",
    "orderNumber": "LG-10099",
    "status": "pending",
    "createdAt": "2026-05-17T14:56:00Z"
  }
}
```

### 2. Get My Orders (Registered Customer)
* **Endpoint**: `GET /api/v1/orders/my-orders`
* **Headers**: `Authorization: Bearer <token>` *(Required)*
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "ord-99",
      "orderNumber": "LG-10099",
      "total": 179.90,
      "status": "pending",
      "createdAt": "2026-05-17T14:56:00Z",
      "items": [
        {
          "productName": "Mira Rattan Pendant",
          "quantity": 2,
          "price": 89.95
        }
      ]
    }
  ]
}
```

---

## 🛠️ Admin Portal APIs (Role Protected)

All requests to Admin APIs require:
* `Authorization: Bearer <token>` of an admin/moderator user.

### 1. Admin Dashboard Analytics
* **Endpoint**: `GET /api/v1/admin/dashboard`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalSales": 12450.80,
      "ordersCount": 154,
      "productsCount": 48,
      "customersCount": 89
    },
    "salesTrends": [
      { "date": "2026-05-10", "sales": 450.00 },
      { "date": "2026-05-11", "sales": 890.50 }
    ],
    "lowStockProducts": [
      { "id": "p-5", "name": "Arc Marble Base Floor Lamp", "stock": 2 }
    ]
  }
}
```

### 2. Create Product
* **Endpoint**: `POST /api/v1/admin/products`
* **Request Body**:
```json
{
  "name": "Luxury Gold Chandelier",
  "brand": "Lumio",
  "category": "chandeliers",
  "price": 299.95,
  "oldPrice": 399.95,
  "image": "https://example.com/chandelier.jpg",
  "color": "Gold",
  "material": "Metal & Crystal",
  "style": "Classic",
  "fitting": "E14",
  "inStock": true,
  "description": "An exquisite chandelier displaying elegance.",
  "specs": {
    "Material": "Metal & Crystal",
    "Warranty": "3 years",
    "Bulbs": "6 x E14"
  }
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "p-999",
    "slug": "luxury-gold-chandelier-999"
  }
}
```

### 3. Update Order Status
* **Endpoint**: `PUT /api/v1/admin/orders/:id/status`
* **Request Body**:
```json
{
  "status": "shipped"
}
```
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Order status updated to shipped"
}
```

### 4. Create Catalog Group
* **Endpoint**: `POST /api/v1/catalog/groups`
* **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` *(Admin/Superadmin only)*
* **Request Body**:
```json
{
  "id": "seasonal",
  "name": "Seasonal lighting",
  "description": "Decorative autumn, summer, and winter lighting fixtures"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Group created successfully",
  "data": {
    "id": "seasonal",
    "name": "Seasonal lighting",
    "description": "Decorative autumn, summer, and winter lighting fixtures",
    "createdAt": "2026-05-19T06:00:00.000Z",
    "updatedAt": "2026-05-19T06:00:00.000Z"
  }
}
```

### 5. Create Catalog Category
* **Endpoint**: `POST /api/v1/catalog/categories`
* **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` *(Admin/Superadmin only)*
* **Request Body**:
```json
{
  "slug": "garden-spots",
  "name": "Garden spots",
  "image": "/assets/cat-outdoor.jpg",
  "group": "outdoor"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "slug": "garden-spots",
    "name": "Garden spots",
    "image": "/assets/cat-outdoor.jpg",
    "group": "outdoor",
    "createdAt": "2026-05-19T06:00:00.000Z",
    "updatedAt": "2026-05-19T06:00:00.000Z"
  }
}
```

### 6. Create Catalog Product
* **Endpoint**: `POST /api/v1/catalog/products`
* **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` *(Admin/Superadmin only)*
* **Request Body**:
```json
{
  "name": "Premium Brass Pendant Lamp",
  "brand": "Lumio",
  "categorySlug": "pendant-lamps",
  "price": 129.99,
  "oldPrice": 169.99,
  "image": "/assets/cat-pendant.jpg",
  "color": "Brass",
  "material": "Metal",
  "style": "Modern",
  "fitting": "E27",
  "inStock": true,
  "description": "A luxury modern pendant lamp in pure brass with premium finishing.",
  "specs": {
    "Warranty": "3 years",
    "Dimmable": "Yes"
  }
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "slug": "premium-brass-pendant-lamp",
    "name": "Premium Brass Pendant Lamp",
    "brand": "Lumio",
    "categorySlug": "pendant-lamps",
    "price": 129.99,
    "oldPrice": 169.99,
    "image": "/assets/cat-pendant.jpg",
    "color": "Brass",
    "material": "Metal",
    "style": "Modern",
    "fitting": "E27",
    "inStock": true,
    "description": "A luxury modern pendant lamp in pure brass with premium finishing.",
    "specs": {
      "Warranty": "3 years",
      "Dimmable": "Yes"
    },
    "createdAt": "2026-05-19T06:00:00.000Z",
    "updatedAt": "2026-05-19T06:00:00.000Z"
  }
}
```

