# 📊 Cart System Architecture

## Database Schema Diagram

```
┌─────────────────┐
│     USER        │
├─────────────────┤
│ id (PK)         │──┐
│ name            │  │
│ email (unique)  │  │
│ password        │  │
│ mobno           │  │
│ address         │  │
│ orderSummary    │  │
│ isAdmin         │  │
│ createdAt       │  │
│ updatedAt       │  │
└─────────────────┘  │
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   CARTITEM      │     │     ORDER       │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │
│ userId (FK) ────┼─────│ userId (FK)     │
│ productId (FK)  │     │ totalAmount     │
│ quantity        │     │ status          │
│ createdAt       │     │ createdAt       │
│ updatedAt       │     │ updatedAt       │
└─────────────────┘     └─────────────────┘
         │                       │
         │                       │
         │              ┌────────┘
         │              │
         │              ▼
         │      ┌─────────────────┐
         │      │   ORDERITEM     │
         │      ├─────────────────┤
         │      │ id (PK)         │
         │      │ orderId (FK)    │
         │      │ productId (FK)  │
         │      │ quantity        │
         │      │ price           │◄── Price snapshot
         │      │ createdAt       │
         │      └─────────────────┘
         │               │
         └───────┬───────┘
                 ▼
        ┌─────────────────┐
        │    PRODUCT      │
        ├─────────────────┤
        │ id (PK)         │
        │ title           │
        │ description     │
        │ price           │
        │ tags            │
        │ images          │
        │ sectionId (FK)  │
        │ createdAt       │
        │ updatedAt       │
        └─────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │    SECTION      │
        ├─────────────────┤
        │ id (PK)         │
        │ name            │
        │ description     │
        │ coverImage      │
        │ parentId (FK)   │
        │ createdAt       │
        │ updatedAt       │
        └─────────────────┘
```

## Request Flow Diagrams

### 🛒 Add to Cart Flow

```
User Request
    │
    ├─ POST /api/cart/add
    │  Body: { productId: 1, quantity: 2 }
    │  Headers: { Authorization: "Bearer TOKEN" }
    │
    ▼
┌───────────────────┐
│ authenticateUser  │ ◄── Validate JWT token
└───────────────────┘
    │
    ▼
┌───────────────────┐
│ Validate Product  │ ◄── Check if product exists
└───────────────────┘
    │
    ▼
┌───────────────────┐
│ Check Existing    │ ◄── Query: userId + productId
└───────────────────┘
    │
    ├─ Found? ─┐
    │          │
    NO        YES
    │          │
    ▼          ▼
CREATE      UPDATE
quantity:2  quantity: existing + 2
    │          │
    └────┬─────┘
         │
         ▼
    Return CartItem
    with Product details
    and signed image URLs
```

### 📦 Checkout Flow

```
User Request
    │
    ├─ POST /api/orders/checkout
    │  Headers: { Authorization: "Bearer TOKEN" }
    │
    ▼
┌───────────────────┐
│ authenticateUser  │
└───────────────────┘
    │
    ▼
┌───────────────────┐
│ Fetch Cart Items  │
└───────────────────┘
    │
    ├─ Empty? ──► Return Error 400
    │
    NO
    │
    ▼
┌───────────────────┐
│ Calculate Total   │ ◄── Sum all (price × quantity)
└───────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  DATABASE TRANSACTION           │
│  ┌───────────────────────────┐  │
│  │ 1. Create Order           │  │
│  │    - userId               │  │
│  │    - totalAmount          │  │
│  │    - status: "pending"    │  │
│  └───────────────────────────┘  │
│            │                     │
│            ▼                     │
│  ┌───────────────────────────┐  │
│  │ 2. Create OrderItems      │  │
│  │    - orderId              │  │
│  │    - productId            │  │
│  │    - quantity             │  │
│  │    - price (snapshot!)    │  │
│  └───────────────────────────┘  │
│            │                     │
│            ▼                     │
│  ┌───────────────────────────┐  │
│  │ 3. Clear Cart             │  │
│  │    DELETE all CartItems   │  │
│  │    WHERE userId = ?       │  │
│  └───────────────────────────┘  │
│                                  │
│  All succeed or all rollback!   │
└─────────────────────────────────┘
    │
    ▼
Return Order with OrderItems
and Product details
```

### 👀 Browse Products (Public)

```
Anyone (No Auth)
    │
    ├─ GET /sections
    │  GET /:sectionName
    │  GET /:sectionName/:subsectionName
    │
    ▼
┌───────────────────┐
│ NO AUTHENTICATION │ ◄── Public access
└───────────────────┘
    │
    ▼
┌───────────────────┐
│ Fetch Products    │
│ with Images       │
└───────────────────┘
    │
    ▼
┌───────────────────┐
│ Generate Signed   │
│ Image URLs        │
└───────────────────┘
    │
    ▼
Return Products with
signed image URLs
```

## API Route Structure

```
Backend Server (Express)
│
├── PUBLIC ROUTES (No Auth)
│   ├── GET  /health
│   ├── GET  /sections
│   ├── GET  /:sectionName
│   ├── GET  /:sectionName/:subsectionName
│   ├── POST /signup
│   ├── POST /login
│   └── GET  /auth/google/login
│
├── USER ROUTES (User Auth Required)
│   │
│   ├── /api/cart
│   │   ├── POST   /add              ◄── Add to cart
│   │   ├── GET    /                 ◄── View cart
│   │   ├── PUT    /update/:id       ◄── Update quantity
│   │   ├── DELETE /remove/:id       ◄── Remove item
│   │   └── DELETE /clear            ◄── Clear cart
│   │
│   └── /api/orders
│       ├── POST   /checkout         ◄── Create order
│       ├── GET    /                 ◄── View all orders
│       └── GET    /:orderId         ◄── View order details
│
└── ADMIN ROUTES (Artist Auth Required)
    ├── POST   /adminlogin
    ├── POST   /create-section
    ├── POST   /:section/create-subsection
    ├── POST   /:section/:subsection/add-product
    ├── PUT    /:section
    ├── PUT    /:section/:subsection
    ├── PUT    /:section/:subsection/:id
    ├── DELETE /:section
    ├── DELETE /:section/:subsection
    └── DELETE /:section/:subsection/:id
```

## User Journey Map

```
┌─────────────────────────────────────────────────────────┐
│                    NEW USER JOURNEY                     │
└─────────────────────────────────────────────────────────┘

1. DISCOVER
   │
   ├─ Browse products (no login needed)
   │  └─ GET /sections
   │     GET /:section/:subsection
   │
   ▼

2. SIGN UP
   │
   ├─ Create account
   │  └─ POST /signup
   │     { email, password, name }
   │
   ▼

3. LOGIN
   │
   ├─ Get authentication token
   │  └─ POST /login
   │     Returns: { token, user }
   │
   ▼

4. SHOP
   │
   ├─ Add products to cart
   │  └─ POST /api/cart/add
   │     { productId, quantity }
   │
   ├─ View cart
   │  └─ GET /api/cart
   │     Returns: { cartItems, totalAmount }
   │
   ├─ Update quantities
   │  └─ PUT /api/cart/update/:id
   │     { quantity }
   │
   ▼

5. CHECKOUT
   │
   ├─ Place order
   │  └─ POST /api/orders/checkout
   │     Returns: { order, orderItems }
   │     (Cart automatically cleared)
   │
   ▼

6. TRACK
   │
   ├─ View order history
   │  └─ GET /api/orders
   │     Returns: { orders[] }
   │
   └─ View order details
      └─ GET /api/orders/:orderId
         Returns: { order, orderItems }
```

## Security Layers

```
Request Flow with Security

HTTP Request
    │
    ▼
┌──────────────────┐
│   CORS Check     │ ◄── Origin validation
└──────────────────┘
    │
    ▼
┌──────────────────┐
│   Rate Limiting  │ ◄── (Optional, future)
└──────────────────┘
    │
    ▼
┌──────────────────┐
│   JWT Verify     │ ◄── Token validation
│ authenticateUser │     - Check signature
└──────────────────┘     - Check expiration
    │                    - Extract userId
    ▼
┌──────────────────┐
│  Input Validate  │ ◄── Validate request body
└──────────────────┘     - Type checking
    │                    - Range validation
    ▼
┌──────────────────┐
│ Authorization    │ ◄── User owns resource?
└──────────────────┘     - Cart item belongs to user?
    │                    - Order belongs to user?
    ▼
┌──────────────────┐
│ DB Constraints   │ ◄── Database level
└──────────────────┘     - Unique constraints
    │                    - Foreign keys
    ▼                    - Cascade rules
Execute & Return
```

## Data Relationships

```
One-to-Many Relationships:

User ──< CartItem    (One user has many cart items)
User ──< Order       (One user has many orders)

Product ──< CartItem (One product in many carts)
Product ──< OrderItem (One product in many orders)

Order ──< OrderItem  (One order has many items)

Section ──< Product  (One section has many products)
Section ──< Section  (Sections can be nested)


Unique Constraints:

CartItem: userId + productId
→ Prevents duplicate items in same cart

Section: name + parentId
→ Prevents duplicate section names in same parent


Cascade Deletes:

User deleted → CartItems deleted
User deleted → Orders deleted
Order deleted → OrderItems deleted
Product deleted → CartItems deleted
Product deleted → OrderItems deleted
Section deleted → Subsections deleted
Section deleted → Products deleted
```

## Performance Optimization

```
Database Indexes:

CartItem:
├─ userId (index)     ◄── Fast cart lookups
├─ productId (index)  ◄── Fast product queries
└─ userId + productId (unique) ◄── Duplicate prevention

Order:
├─ userId (index)     ◄── Fast user order lookup
└─ status (index)     ◄── Fast status filtering

OrderItem:
├─ orderId (index)    ◄── Fast order item lookup
└─ productId (index)  ◄── Fast product queries


Query Patterns:

✅ Efficient:
- Get user cart:      SELECT * FROM CartItem WHERE userId = ?
- Get user orders:    SELECT * FROM Order WHERE userId = ?
- Get order items:    SELECT * FROM OrderItem WHERE orderId = ?

✅ Optimized with Indexes:
- Find cart item:     WHERE userId = ? AND productId = ?
- Filter by status:   WHERE userId = ? AND status = ?


Caching Strategy (Future):
- Image URLs (signed URLs cached for 24h)
- Product data (Redis cache)
- User sessions (JWT in memory)
```

This architecture provides a complete, scalable, and secure shopping cart system! 🚀
