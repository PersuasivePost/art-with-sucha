# Cart & Order System - Backend API Documentation

## Overview

A complete shopping cart and order management system with user authentication, product management, and checkout functionality.

## Database Schema

### Core Models

- **User**: User accounts with authentication
- **Product**: Products with images, pricing, and categorization
- **CartItem**: Shopping cart items (with duplicate prevention)
- **Order**: Order records with status tracking
- **OrderItem**: Individual items within orders

### Key Features

- **Auto-increment IDs**: All entities have unique integer IDs
- **Cascade Deletion**: Deleting a user removes their cart items and orders
- **Unique Constraints**: Prevents duplicate cart items (userId + productId)
- **Indexes**: Optimized queries on userId, productId, orderId, and status

## Authentication

### Middleware

- **`authenticateUser`**: Validates JWT token for regular users
- **`authenticateArtist`**: Validates JWT token for admin/artist users

### Protected Routes

All cart and order operations require user authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## API Endpoints

### 🛒 Cart Management

#### **POST /api/cart/add**

Add a product to cart or update quantity if already exists.

**Request Body:**

```json
{
  "productId": 1,
  "quantity": 2
}
```

**Response:**

```json
{
  "message": "Item added to cart successfully",
  "cartItem": {
    "id": 1,
    "userId": 1,
    "productId": 1,
    "quantity": 2,
    "createdAt": "2025-11-20T10:00:00Z",
    "updatedAt": "2025-11-20T10:00:00Z",
    "product": {
      "id": 1,
      "title": "Product Name",
      "price": 99.99,
      "images": ["https://..."],
      ...
    }
  }
}
```

**Features:**

- ✅ Prevents duplicate cart items (increases quantity instead)
- ✅ Validates product existence
- ✅ Signed URLs for product images

---

#### **GET /api/cart**

Retrieve user's complete cart with totals.

**Response:**

```json
{
  "cartItems": [
    {
      "id": 1,
      "userId": 1,
      "productId": 1,
      "quantity": 2,
      "product": {
        "id": 1,
        "title": "Product Name",
        "price": 99.99,
        "images": ["https://..."],
        "section": { ... }
      }
    }
  ],
  "totalItems": 5,
  "totalAmount": 499.95
}
```

**Features:**

- ✅ Includes product details and images
- ✅ Calculates total items and amount
- ✅ Sorted by creation date (newest first)

---

#### **PUT /api/cart/update/:cartItemId**

Update the quantity of a cart item.

**Parameters:**

- `cartItemId`: ID of the cart item to update

**Request Body:**

```json
{
  "quantity": 5
}
```

**Response:**

```json
{
  "message": "Cart item updated successfully",
  "cartItem": { ... }
}
```

**Validation:**

- ✅ Quantity must be >= 1
- ✅ Cart item must belong to authenticated user

---

#### **DELETE /api/cart/remove/:cartItemId**

Remove a specific item from cart.

**Parameters:**

- `cartItemId`: ID of the cart item to remove

**Response:**

```json
{
  "message": "Item removed from cart successfully"
}
```

---

#### **DELETE /api/cart/clear**

Clear all items from user's cart.

**Response:**

```json
{
  "message": "Cart cleared successfully",
  "deletedCount": 5
}
```

---

### 📦 Order Management

#### **POST /api/orders/checkout**

Create an order from cart items and clear the cart.

**Response:**

```json
{
  "message": "Order created successfully",
  "order": {
    "id": 1,
    "userId": 1,
    "totalAmount": 499.95,
    "status": "pending",
    "createdAt": "2025-11-20T10:00:00Z",
    "orderItems": [
      {
        "id": 1,
        "orderId": 1,
        "productId": 1,
        "quantity": 2,
        "price": 99.99,
        "product": { ... }
      }
    ]
  }
}
```

**Process:**

1. ✅ Validates cart is not empty
2. ✅ Calculates total amount
3. ✅ Creates order record
4. ✅ Creates order items from cart items
5. ✅ Clears cart (all in a transaction)

**Error Responses:**

- `400`: Cart is empty
- `401`: User not authenticated
- `500`: Transaction failed

---

#### **GET /api/orders**

Get all orders for authenticated user.

**Response:**

```json
{
  "orders": [
    {
      "id": 1,
      "userId": 1,
      "totalAmount": 499.95,
      "status": "pending",
      "createdAt": "2025-11-20T10:00:00Z",
      "updatedAt": "2025-11-20T10:00:00Z",
      "orderItems": [
        {
          "id": 1,
          "orderId": 1,
          "productId": 1,
          "quantity": 2,
          "price": 99.99,
          "product": {
            "id": 1,
            "title": "Product Name",
            "images": ["https://..."],
            ...
          }
        }
      ]
    }
  ]
}
```

**Features:**

- ✅ Includes all order items and product details
- ✅ Sorted by creation date (newest first)
- ✅ Signed URLs for product images

---

#### **GET /api/orders/:orderId**

Get specific order details.

**Parameters:**

- `orderId`: ID of the order

**Response:**

```json
{
  "order": {
    "id": 1,
    "userId": 1,
    "totalAmount": 499.95,
    "status": "pending",
    "orderItems": [ ... ]
  }
}
```

**Validation:**

- ✅ Order must belong to authenticated user
- ✅ Returns 404 if order not found

---

### 🔐 Product Management (Admin Only)

These routes remain protected by `authenticateArtist` middleware:

- **POST** `/:sectionName/:subsectionName/add-product` - Add product
- **PUT** `/:sectionName/:subsectionName/:id` - Update product
- **DELETE** `/:sectionName/:subsectionName/:id` - Delete product

---

## Data Flow

### Adding to Cart

```
User → POST /api/cart/add → Check if exists → Update or Create → Return cart item
```

### Checkout Process

```
User → POST /api/orders/checkout → Validate cart → Create order → Create order items → Clear cart → Return order
```

---

## Error Handling

### Common Error Codes

- `400`: Bad Request (missing/invalid parameters)
- `401`: Unauthorized (invalid/missing token)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

### Error Response Format

```json
{
  "error": "Error message description"
}
```

---

## Security Features

1. **JWT Authentication**: All cart/order operations require valid user token
2. **User Isolation**: Users can only access their own cart and orders
3. **Input Validation**: All inputs validated before processing
4. **Transaction Safety**: Checkout uses database transactions for data integrity
5. **Unique Constraints**: Prevents duplicate cart items at database level

---

## Testing Tips

### 1. Get User Token

```bash
curl -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### 2. Add to Cart

```bash
curl -X POST http://localhost:5000/api/cart/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"productId":1,"quantity":2}'
```

### 3. View Cart

```bash
curl -X GET http://localhost:5000/api/cart \
  -H "Authorization: Bearer <token>"
```

### 4. Checkout

```bash
curl -X POST http://localhost:5000/api/orders/checkout \
  -H "Authorization: Bearer <token>"
```

### 5. View Orders

```bash
curl -X GET http://localhost:5000/api/orders \
  -H "Authorization: Bearer <token>"
```

---

## File Structure

```
backend/
├── prisma/
│   ├── schema.prisma              # Database schema with Cart & Order models
│   └── migrations/
│       └── 20251120174802_add_cart_and_orders/
│           └── migration.sql      # Cart & Order tables migration
├── src/
│   ├── index.ts                   # Main server file with route mounting
│   ├── middleware/
│   │   └── auth.ts                # authenticateUser & authenticateArtist
│   ├── routes/
│   │   ├── cart.ts                # All cart operations
│   │   └── orders.ts              # All order operations
│   └── utils/
│       └── storageAdapter.ts      # Image URL generation
```

---

## Database Migration

The cart and order functionality requires running the migration:

```bash
cd backend
npx prisma migrate dev
```

This creates:

- `CartItem` table with unique constraint on (userId, productId)
- `Order` table with status tracking
- `OrderItem` table with price snapshots
- Proper foreign keys and indexes

---

## Next Steps for Frontend

1. **Cart UI**: Display cart items with quantity controls
2. **Product Pages**: Add "Add to Cart" buttons
3. **Checkout Flow**: Review cart → Checkout → Order confirmation
4. **Order History**: Display past orders with details
5. **Quantity Management**: +/- buttons to update cart item quantities
6. **Empty States**: Handle empty cart and no orders scenarios

---

## Notes

- **Duplicate Prevention**: Adding same product twice increases quantity automatically
- **Price Snapshots**: Order items store the price at purchase time (not referencing product price)
- **Cart Persistence**: Cart items persist across sessions until checkout or manual deletion
- **Transaction Safety**: Checkout is atomic - either everything succeeds or nothing changes
- **Image URLs**: All product images use signed URLs for security
