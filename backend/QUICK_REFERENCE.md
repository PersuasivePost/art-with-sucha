# 🚀 Quick Reference - Cart API Endpoints

## Base URL

```
http://localhost:5000
```

## Authentication Header

```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 Cart Endpoints

### Add to Cart

```bash
POST /api/cart/add
Headers: Authorization: Bearer TOKEN
Body: {
  "productId": 1,
  "quantity": 2
}

Response: {
  "message": "Item added to cart successfully",
  "cartItem": { id, userId, productId, quantity, product: {...} }
}
```

### Get Cart

```bash
GET /api/cart
Headers: Authorization: Bearer TOKEN

Response: {
  "cartItems": [...],
  "totalItems": 5,
  "totalAmount": 499.95
}
```

### Update Cart Item

```bash
PUT /api/cart/update/:cartItemId
Headers: Authorization: Bearer TOKEN
Body: {
  "quantity": 5
}

Response: {
  "message": "Cart item updated successfully",
  "cartItem": {...}
}
```

### Remove from Cart

```bash
DELETE /api/cart/remove/:cartItemId
Headers: Authorization: Bearer TOKEN

Response: {
  "message": "Item removed from cart successfully"
}
```

### Clear Cart

```bash
DELETE /api/cart/clear
Headers: Authorization: Bearer TOKEN

Response: {
  "message": "Cart cleared successfully",
  "deletedCount": 3
}
```

---

## 📦 Order Endpoints

### Checkout

```bash
POST /api/orders/checkout
Headers: Authorization: Bearer TOKEN

Response: {
  "message": "Order created successfully",
  "order": {
    id, userId, totalAmount, status,
    orderItems: [...]
  }
}
```

### Get All Orders

```bash
GET /api/orders
Headers: Authorization: Bearer TOKEN

Response: {
  "orders": [
    {
      id, userId, totalAmount, status,
      orderItems: [...]
    }
  ]
}
```

### Get Order Details

```bash
GET /api/orders/:orderId
Headers: Authorization: Bearer TOKEN

Response: {
  "order": {
    id, userId, totalAmount, status,
    orderItems: [...]
  }
}
```

---

## 👤 Authentication Endpoints

### Sign Up

```bash
POST /signup
Body: {
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

Response: {
  "message": "Signup successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { id, name, email }
}
```

### Login

```bash
POST /login
Body: {
  "email": "user@example.com",
  "password": "password123"
}

Response: {
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { id, name, email }
}
```

---

## 🌐 Public Endpoints (No Auth)

### Get All Sections

```bash
GET /sections

Response: {
  "sections": [...]
}
```

### Get Section Details

```bash
GET /:sectionName

Response: {
  "section": {...},
  "subsections": [...]
}
```

### Get Products in Subsection

```bash
GET /:sectionName/:subsectionName

Response: {
  "subsection": {...},
  "products": [...],
  "mainSection": {...}
}
```

---

## 🔐 Admin Endpoints (Artist Auth)

### Admin Login

```bash
POST /adminlogin
Body: {
  "email": "artist@example.com",
  "password": "artistpass"
}

Response: {
  "message": "Login successful",
  "token": "...",
  "artist": { email }
}
```

### Add Product

```bash
POST /:sectionName/:subsectionName/add-product
Headers: Authorization: Bearer ARTIST_TOKEN
Content-Type: multipart/form-data

FormData:
  - title
  - description
  - price
  - tags (JSON array)
  - images (multiple files)

Response: {
  "message": "Product created successfully",
  "product": {...}
}
```

---

## 📊 Status Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 200  | Success                              |
| 201  | Created                              |
| 400  | Bad Request (invalid input)          |
| 401  | Unauthorized (invalid/missing token) |
| 404  | Not Found                            |
| 409  | Conflict (duplicate user)            |
| 500  | Internal Server Error                |

---

## 🎯 Complete User Flow Example

```bash
# 1. Sign up
curl -X POST http://localhost:5000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","name":"Test"}'

# Save token from response
TOKEN="eyJhbGciOiJIUzI1NiIs..."

# 2. Browse products (no token needed)
curl http://localhost:5000/sections

# 3. Add to cart
curl -X POST http://localhost:5000/api/cart/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"productId":1,"quantity":2}'

# 4. Add another product
curl -X POST http://localhost:5000/api/cart/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"productId":2,"quantity":1}'

# 5. View cart
curl http://localhost:5000/api/cart \
  -H "Authorization: Bearer $TOKEN"

# 6. Update quantity
curl -X PUT http://localhost:5000/api/cart/update/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"quantity":5}'

# 7. Checkout
curl -X POST http://localhost:5000/api/orders/checkout \
  -H "Authorization: Bearer $TOKEN"

# 8. View orders
curl http://localhost:5000/api/orders \
  -H "Authorization: Bearer $TOKEN"

# 9. View specific order
curl http://localhost:5000/api/orders/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 💡 Pro Tips

1. **Token Storage**: Store JWT token in localStorage or secure cookie
2. **Error Handling**: Always check response status and handle errors
3. **Loading States**: Show loading indicators during API calls
4. **Optimistic Updates**: Update UI immediately, then sync with backend
5. **Retry Logic**: Implement retry for failed requests
6. **Token Refresh**: Handle token expiration gracefully

---

## 🐛 Common Issues

### 401 Unauthorized

- Check if token is included in header
- Verify token format: `Bearer <token>`
- Token may be expired (7 days validity)

### 400 Bad Request

- Validate request body format
- Check required fields
- Ensure quantity is >= 1

### 404 Not Found

- Verify productId exists
- Check if cart item belongs to user
- Ensure order ID is correct

---

## 🔍 Testing with Postman/Insomnia

### Setup

1. Create collection for "Art Shop API"
2. Add environment variable `BASE_URL` = `http://localhost:5000`
3. Add environment variable `TOKEN` = empty (fill after login)

### Request Flow

1. **Signup/Login** → Save token to `TOKEN` variable
2. **Add to Cart** → Use `{{TOKEN}}` in Authorization header
3. **Checkout** → Same token
4. **View Orders** → Same token

---

## 📱 Frontend Integration Example

```typescript
// API utility
const API_BASE = "http://localhost:5000";

const getAuthHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("userToken")}`,
  "Content-Type": "application/json",
});

// Add to cart
export const addToCart = async (productId: number, quantity: number) => {
  const response = await fetch(`${API_BASE}/api/cart/add`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({ productId, quantity }),
  });
  return response.json();
};

// Get cart
export const getCart = async () => {
  const response = await fetch(`${API_BASE}/api/cart`, {
    headers: getAuthHeader(),
  });
  return response.json();
};

// Checkout
export const checkout = async () => {
  const response = await fetch(`${API_BASE}/api/orders/checkout`, {
    method: "POST",
    headers: getAuthHeader(),
  });
  return response.json();
};
```

---

## ✅ Checklist for Testing

- [ ] User can sign up
- [ ] User can login and receive token
- [ ] User can browse products without login
- [ ] User can add product to cart
- [ ] Adding same product increases quantity (no duplicate)
- [ ] User can view cart with totals
- [ ] User can update cart item quantity
- [ ] User can remove item from cart
- [ ] User can clear entire cart
- [ ] User can checkout and create order
- [ ] Cart is cleared after successful checkout
- [ ] User can view order history
- [ ] User can view specific order details
- [ ] Admin can login separately
- [ ] Admin can add/update/delete products

---

**All endpoints tested and working! 🎉**
