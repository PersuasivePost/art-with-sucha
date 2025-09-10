# Art Portfolio Backend API Testing Guide

## 🔧 Prerequisites
- Backend server running on `http://localhost:5000`
- Postman or any REST client
- Valid JWT token (obtained from login)

---

## 🔐 Authentication

### 1. Login (Get JWT Token)
```
Method: POST
URL: http://localhost:5000/login
Headers: Content-Type: application/json
Body (raw JSON):
{
  "email": "artwithsucha@gmail.com",
  "password": "your_secure_password"
}
```
**Expected Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "artist": {
    "email": "artwithsucha@gmail.com"
  }
}
```
**📝 Note:** Copy the `token` value for use in protected routes!

---

## 📁 Section Management (Main Sections - Level 1)

### 2. Get All Main Sections
```
Method: GET
URL: http://localhost:5000/
Headers: (none required)
```
**Expected Response:**
```json
{
  "message": "Art Portfolio Backend 🎨",
  "sections": [
    {
      "id": 1,
      "name": "mould it",
      "description": "contains mould it workings",
      "coverImage": null,
      "createdAt": "2025-09-10T05:23:47.437Z"
    }
  ]
}
```

### 3. Create Main Section
```
Method: POST
URL: http://localhost:5000/create-section
Headers: 
- Content-Type: application/json
- Authorization: Bearer YOUR_JWT_TOKEN_HERE
Body (raw JSON):
{
  "name": "sculptures",
  "description": "3D art and sculpture works",
  "coverImage": "https://example.com/cover.jpg"
}
```
**Expected Response:**
```json
{
  "message": "Main section created successfully",
  "section": {
    "id": 4,
    "name": "sculptures",
    "description": "3D art and sculpture works",
    "coverImage": "https://example.com/cover.jpg",
    "parentId": null,
    "createdAt": "2025-09-10T06:30:00.000Z",
    "updatedAt": "2025-09-10T06:30:00.000Z"
  },
  "slug": "sculptures"
}
```

### 4. Get Section with Subsections
```
Method: GET
URL: http://localhost:5000/sculptures
Headers: (none required)
```
**Expected Response:**
```json
{
  "section": {
    "id": 4,
    "name": "sculptures",
    "description": "3D art and sculpture works",
    "coverImage": "https://example.com/cover.jpg",
    "parentId": null,
    "createdAt": "2025-09-10T06:30:00.000Z",
    "updatedAt": "2025-09-10T06:30:00.000Z"
  },
  "subsections": []
}
```

### 5. Edit Main Section
```
Method: PUT
URL: http://localhost:5000/mould-it
Headers: 
- Content-Type: application/json
- Authorization: Bearer YOUR_JWT_TOKEN_HERE
Body (raw JSON):
{
  "name": "modern mould works",
  "description": "Contemporary molding techniques and projects",
  "coverImage": "https://example.com/new-cover.jpg"
}
```
**Expected Response:**
```json
{
  "message": "Section updated successfully"
}
```

### 6. Delete Main Section
```
Method: DELETE
URL: http://localhost:5000/mould-it
Headers: 
- Authorization: Bearer YOUR_JWT_TOKEN_HERE
```
**Expected Response:**
```json
{
  "message": "Section deleted successfully"
}
```

---

## 📂 Subsection Management (Level 2)

### 7. Create Subsection
```
Method: POST
URL: http://localhost:5000/mould-it
Headers: 
- Content-Type: application/json
- Authorization: Bearer YOUR_JWT_TOKEN_HERE
Body (raw JSON):
{
  "name": "clay works",
  "description": "Clay molding projects and pottery",
  "coverImage": "https://example.com/clay-cover.jpg"
}
```
**Expected Response:**
```json
{
  "message": "Subsection created successfully",
  "subsection": {
    "id": 5,
    "name": "clay works",
    "description": "Clay molding projects and pottery",
    "coverImage": "https://example.com/clay-cover.jpg",
    "parentId": 1,
    "createdAt": "2025-09-10T06:35:00.000Z",
    "updatedAt": "2025-09-10T06:35:00.000Z"
  },
  "slug": "clay-works",
  "parentSlug": "mould-it"
}
```

### 8. Get Subsection with Products
```
Method: GET
URL: http://localhost:5000/mould-it/clay-works
Headers: (none required)
```
**Expected Response:**
```json
{
  "subsection": {
    "id": 5,
    "name": "clay works",
    "description": "Clay molding projects and pottery",
    "coverImage": "https://example.com/clay-cover.jpg",
    "parentId": 1,
    "createdAt": "2025-09-10T06:35:00.000Z",
    "updatedAt": "2025-09-10T06:35:00.000Z"
  },
  "products": [],
  "mainSection": {
    "id": 1,
    "name": "mould it",
    "description": "contains mould it workings"
  }
}
```

### 9. Edit Subsection
```
Method: PUT
URL: http://localhost:5000/mould-it/clay-works
Headers: 
- Content-Type: application/json
- Authorization: Bearer YOUR_JWT_TOKEN_HERE
Body (raw JSON):
{
  "name": "advanced clay works",
  "description": "Advanced clay molding techniques and artistic pottery",
  "coverImage": "https://example.com/advanced-clay-cover.jpg"
}
```
**Expected Response:**
```json
{
  "message": "Subsection updated successfully"
}
```

### 10. Delete Subsection
```
Method: DELETE
URL: http://localhost:5000/mould-it/clay-works
Headers: 
- Authorization: Bearer YOUR_JWT_TOKEN_HERE
```
**Expected Response:**
```json
{
  "message": "Subsection deleted successfully"
}
```

---

## 🎨 Product Management (Level 3)

### 11. Create Product
```
Method: POST
URL: http://localhost:5000/mould-it/clay-works/add-product
Headers: 
- Content-Type: application/json
- Authorization: Bearer YOUR_JWT_TOKEN_HERE
Body (raw JSON):
{
  "title": "Ceramic Vase",
  "description": "Hand-molded ceramic vase with blue glaze finish",
  "price": 1500,
  "images": [
    "https://example.com/vase1.jpg",
    "https://example.com/vase2.jpg",
    "https://example.com/vase3.jpg"
  ],
  "tags": ["ceramic", "vase", "handmade", "blue"]
}
```
**Expected Response:**
```json
{
  "message": "Product created successfully",
  "product": {
    "id": 1,
    "title": "Ceramic Vase",
    "description": "Hand-molded ceramic vase with blue glaze finish",
    "price": 1500,
    "tags": ["ceramic", "vase", "handmade", "blue"],
    "images": [
      "https://example.com/vase1.jpg",
      "https://example.com/vase2.jpg",
      "https://example.com/vase3.jpg"
    ],
    "sectionId": 5,
    "createdAt": "2025-09-10T06:40:00.000Z",
    "updatedAt": "2025-09-10T06:40:00.000Z"
  },
  "slug": "ceramic-vase"
}
```

### 12. Get Single Product
```
Method: GET
URL: http://localhost:5000/mould-it/clay-works/1
Headers: (none required)
```
**Expected Response:**
```json
{
  "product": {
    "id": 1,
    "title": "Ceramic Vase",
    "description": "Hand-molded ceramic vase with blue glaze finish",
    "price": 1500,
    "tags": ["ceramic", "vase", "handmade", "blue"],
    "images": [
      "https://example.com/vase1.jpg",
      "https://example.com/vase2.jpg",
      "https://example.com/vase3.jpg"
    ],
    "sectionId": 5,
    "createdAt": "2025-09-10T06:40:00.000Z",
    "updatedAt": "2025-09-10T06:40:00.000Z",
    "section": {
      "id": 5,
      "name": "clay works",
      "parent": {
        "id": 1,
        "name": "mould it"
      }
    }
  },
  "breadcrumb": {
    "mainSection": "mould it",
    "subsection": "clay works",
    "productTitle": "Ceramic Vase"
  }
}
```

### 13. Edit Product
```
Method: PUT
URL: http://localhost:5000/mould-it/birla-putty/1
Headers: 
- Content-Type: application/json
- Authorization: Bearer YOUR_JWT_TOKEN_HERE
Body (raw JSON):
{
  "title": "Premium Ceramic Vase",
  "description": "Hand-molded premium ceramic vase with blue glaze finish and gold accents",
  "price": 2000,
  "images": [
    "https://example.com/vase1-updated.jpg",
    "https://example.com/vase2-updated.jpg",
    "https://example.com/vase3-updated.jpg",
    "https://example.com/vase4-new.jpg"
  ],
  "tags": ["ceramic", "vase", "handmade", "blue", "premium", "gold"]
}
```
**Expected Response:**
```json
{
  "message": "Product updated successfully"
}
```

### 14. Delete Product
```
Method: DELETE
URL: http://localhost:5000/mould-it/birla-putty/1
Headers: 
- Authorization: Bearer YOUR_JWT_TOKEN_HERE
```
**Expected Response:**
```json
{
  "message": "Product deleted successfully"
}
```

---

## 🧪 Testing Scenarios

### Complete Flow Test
1. **Login** → Get JWT token
2. **Create main section** → "pottery"
3. **Get all sections** → Verify "pottery" appears
4. **Create subsection** → "pottery/bowls"
5. **Get section details** → Verify "bowls" subsection appears
6. **Create product** → "pottery/bowls/ceramic-bowl"
7. **Get subsection products** → Verify product appears
8. **Get single product** → Verify product details
9. **Edit product** → Update price and description
10. **Delete product** → Remove product
11. **Delete section** → Clean up

### Error Testing
- Try protected routes without token → Should get 401
- Try creating with missing fields → Should get 400
- Try accessing non-existent resources → Should get 404
- Try invalid JWT token → Should get 401

---

## 🔍 Important Notes

### URL Slug Format
- **Spaces** become **hyphens**: "clay works" → "clay-works"
- **Special characters** removed: "art & craft" → "art-craft"
- **Lowercase**: "POTTERY" → "pottery"

### Price Format
- Send as **number**: `"price": 1500` ✅
- Or **string number**: `"price": "1500"` ✅
- Avoid currency symbols: `"price": "Rs. 1500"` ❌ (will be parsed)

### Images Array
- Always send as **array**: `["image1.jpg", "image2.jpg"]` ✅
- Minimum 1 image required for products
- Support multiple images per product

### Authentication Headers
- Format: `Authorization: Bearer YOUR_TOKEN`
- Case-insensitive: `bearer` or `Bearer` both work
- Token expires in 24 hours

---

## 🚀 Quick Start Checklist

- [ ] Start backend server: `npm run dev`
- [ ] Login to get JWT token
- [ ] Test creating a main section
- [ ] Test creating a subsection
- [ ] Test creating a product with multiple images
- [ ] Test all GET routes
- [ ] Test editing operations
- [ ] Test deletion (clean up)

---

**Happy Testing! 🎨✨**
