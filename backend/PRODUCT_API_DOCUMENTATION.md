# 📦 Product Management API Documentation

## Overview

L'API di gestione prodotti fornisce funzionalità complete per la gestione del catalogo prodotti, inclusi inventario, categorie, prezzi e statistiche avanzate.

## 🔗 Base URL
```
http://localhost:3000/api/products
```

## 🔐 Authentication

Le operazioni di creazione, modifica, eliminazione e gestione stock richiedono autenticazione con JWT token.

```bash
Authorization: Bearer <jwt_token>
```

**Livelli di accesso:**
- **PUBLIC**: Consultazione catalogo, ricerca prodotti
- **MANAGER/ADMIN**: Gestione stock, statistiche
- **ADMIN**: Creazione, modifica, eliminazione prodotti

---

## 📋 Endpoints

### 🟢 GET /api/products
**Ottieni lista prodotti con filtri e paginazione**

**Access:** Public

**Query Parameters:**
```javascript
{
  page?: number,           // Pagina (default: 1)
  limit?: number,          // Prodotti per pagina (default: 10, max: 100)
  sortBy?: string,         // Campo ordinamento (default: 'createdAt')
  sortOrder?: string,      // Direzione ('asc' | 'desc', default: 'desc')
  categoryId?: string,     // Filtra per categoria
  status?: string,         // Filtra per stato ('ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'OUT_OF_STOCK')
  inStock?: boolean,       // Solo prodotti in stock
  lowStock?: boolean,      // Solo prodotti con stock basso
  priceMin?: number,       // Prezzo minimo
  priceMax?: number,       // Prezzo massimo
  search?: string,         // Ricerca per nome, descrizione, SKU
  tags?: string,           // Filtra per tag (separati da virgola)
  supplier?: string        // Filtra per fornitore
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmfisf5fe0000iamdx1hq0xes",
      "name": "iPhone 15 Standard",
      "description": "Smartphone Apple iPhone 15 con chip A16 Bionic",
      "sku": "IPHONE15-128GB",
      "barcode": "1234567890200",
      "categoryId": "cmfirf9co000aia8b4j81kq5c",
      "price": 899.99,
      "costPrice": 699.99,
      "stock": 20,
      "minStock": 3,
      "maxStock": 100,
      "weight": 171,
      "images": null,
      "tags": null,
      "status": "ACTIVE",
      "supplier": null,
      "dimensions": null,
      "isActive": true,
      "createdAt": "2025-09-13T21:37:52.442Z",
      "updatedAt": "2025-09-13T21:37:58.795Z",
      "category": {
        "id": "cmfirf9co000aia8b4j81kq5c",
        "name": "Smartphone",
        "description": "Telefoni cellulari e accessori",
        "slug": "smartphone"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 11,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 🟢 GET /api/products/search?q={query}
**Ricerca avanzata prodotti**

**Access:** Public

**Query Parameters:**
```javascript
{
  q: string,          // Query di ricerca (required)
  page?: number,      // Pagina (default: 1)
  limit?: number      // Risultati per pagina (default: 10)
}
```

**Example:**
```bash
curl "http://localhost:3000/api/products/search?q=iPhone&page=1&limit=5"
```

### 🟢 GET /api/products/:id
**Ottieni singolo prodotto per ID**

**Access:** Public

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cmfisf5fe0000iamdx1hq0xes",
    "name": "iPhone 15 Standard",
    // ... altri campi prodotto
    "category": {
      "id": "cmfirf9co000aia8b4j81kq5c",
      "name": "Smartphone"
    }
  }
}
```

### 🟢 GET /api/products/sku/:sku
**Ottieni prodotto per SKU**

**Access:** Public

**Example:**
```bash
curl "http://localhost:3000/api/products/sku/IPHONE15-128GB"
```

### 🔵 POST /api/products
**Crea nuovo prodotto**

**Access:** Admin/Manager only

**Request Body:**
```json
{
  "name": "iPhone 15 Pro",
  "description": "Smartphone Apple iPhone 15 Pro con chip A17 Pro",
  "sku": "IPHONE15PRO-256GB",
  "barcode": "1234567890201",
  "categoryId": "cmfirf9co000aia8b4j81kq5c",
  "price": 1199.99,
  "costPrice": 899.99,
  "stock": 15,
  "minStock": 2,
  "maxStock": 50,
  "weight": 187,
  "status": "ACTIVE",
  "supplier": {
    "name": "Apple Inc.",
    "email": "orders@apple.com",
    "phone": "+1-800-APL-CARE"
  },
  "dimensions": {
    "length": 146.6,
    "width": 70.6,
    "height": 8.25
  },
  "images": [
    "https://example.com/iphone15pro-front.jpg",
    "https://example.com/iphone15pro-back.jpg"
  ],
  "tags": ["smartphone", "apple", "premium", "5g"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "new_product_id",
    "name": "iPhone 15 Pro",
    // ... tutti i campi del prodotto creato
  }
}
```

### 🟠 PUT /api/products/:id
**Aggiorna prodotto esistente**

**Access:** Admin/Manager only

**Request Body:** (tutti i campi sono opzionali)
```json
{
  "name": "iPhone 15 Pro Max",
  "price": 1299.99,
  "stock": 20,
  "status": "ACTIVE"
}
```

### 🔴 DELETE /api/products/:id
**Elimina prodotto**

**Access:** Admin only

**Note:** 
- Se il prodotto è referenziato in ordini, viene eseguita eliminazione soft (isActive: false)
- Altrimenti viene eliminato completamente dal database

---

## 📊 Stock Management

### 🔵 POST /api/products/:id/stock
**Aggiorna stock prodotto**

**Access:** Admin/Manager only

**Request Body:**
```json
{
  "quantity": 5,
  "operation": "subtract"  // "add" | "subtract"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stock subtracted successfully",
  "data": {
    "productId": "cmfisf5fe0000iamdx1hq0xes",
    "sku": "IPHONE15-128GB",
    "currentStock": 20,
    "status": "ACTIVE"
  }
}
```

### 🟢 GET /api/products/stock/low
**Prodotti con stock basso**

**Access:** Admin/Manager only

**Response:**
```json
{
  "success": true,
  "message": "Found 3 products with low stock",
  "data": [
    {
      "id": "product_id",
      "name": "Product Name",
      "sku": "PRODUCT-SKU",
      "stock": 2,
      "minStock": 5,
      "category": { ... }
    }
  ]
}
```

### 🟢 GET /api/products/stock/out
**Prodotti fuori stock**

**Access:** Admin/Manager only

---

## 📈 Analytics & Statistics

### 🟢 GET /api/products/stats
**Statistiche complete dei prodotti**

**Access:** Admin/Manager only

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProducts": 11,
    "activeProducts": 10,
    "inactiveProducts": 1,
    "outOfStockProducts": 2,
    "lowStockProducts": 3,
    "totalValue": 114756.78,
    "averagePrice": 716.35,
    "categoriesCount": 5,
    "topCategories": [
      {
        "categoryId": "cmfirf9co000aia8b4j81kq5c",
        "categoryName": "Smartphone",
        "productCount": 4
      }
    ]
  }
}
```

---

## 🔄 Bulk Operations

### 🔵 POST /api/products/bulk/update-status
**Aggiornamento status in massa**

**Access:** Admin only

**Request Body:**
```json
{
  "productIds": [
    "product_id_1",
    "product_id_2",
    "product_id_3"
  ],
  "status": "INACTIVE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk status update completed",
  "data": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "status": "INACTIVE"
  }
}
```

---

## 🚨 Error Responses

### Validation Errors
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "price",
      "message": "Price must be a positive number",
      "value": -10
    }
  ],
  "timestamp": "2025-09-13T21:38:04.100Z"
}
```

### Business Logic Errors
```json
{
  "success": false,
  "message": "Product with SKU IPHONE15-128GB already exists"
}
```

### Permission Errors
```json
{
  "success": false,
  "message": "Insufficient permissions to create products"
}
```

### Not Found Errors
```json
{
  "success": false,
  "message": "Product not found"
}
```

---

## 🧪 Testing Examples

### 1. **Login come Admin**
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@quickstock.com", "password": "admin123"}'
```

### 2. **Ottieni lista prodotti**
```bash
curl "http://localhost:3000/api/products?page=1&limit=5&inStock=true"
```

### 3. **Crea nuovo prodotto**
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Samsung Galaxy S24",
    "description": "Smartphone Samsung ultimo modello",
    "sku": "SAMSUNG-S24-256GB",
    "categoryId": "cmfirf9co000aia8b4j81kq5c",
    "price": 799.99,
    "costPrice": 599.99,
    "stock": 30,
    "minStock": 5
  }'
```

### 4. **Aggiorna stock**
```bash
curl -X POST http://localhost:3000/api/products/PRODUCT_ID/stock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "quantity": 10,
    "operation": "add"
  }'
```

### 5. **Ottieni statistiche**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/products/stats
```

---

## 🎯 Features Implementate

✅ **CRUD completo dei prodotti**
- Creazione, lettura, modifica, eliminazione
- Validazione completa con Joi
- Gestione soft delete per prodotti referenziati

✅ **Gestione avanzata dello stock**
- Aggiornamento stock con operazioni add/subtract
- Monitoraggio stock basso e fuori stock
- Aggiornamento automatico status prodotto

✅ **Ricerca e filtraggio**
- Ricerca full-text per nome, descrizione, SKU
- Filtri multipli (categoria, prezzo, stock, status)
- Paginazione completa con metadata

✅ **Analytics e reporting**
- Statistiche complete del catalogo
- Top categorie per numero prodotti
- Calcolo valore totale inventario

✅ **Controlli di autorizzazione**
- Accesso pubblico per consultazione catalogo
- Operazioni protette per Manager/Admin
- Operazioni critiche solo per Admin

✅ **Logging strutturato**
- Log di tutte le operazioni CRUD
- Tracciamento azioni utente
- Performance monitoring

✅ **Operazioni in massa**
- Aggiornamento status multipli prodotti
- Gestione errori granulare

---

## 🔧 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (duplicate SKU) |
| 500 | Server Error |

---

## 📝 Notes

- Tutti i prezzi sono in EUR con precisione a 2 decimali
- I pesi sono in grammi
- Le dimensioni sono in millimetri
- Gli SKU sono automaticamente convertiti in maiuscolo
- Il sistema supporta eliminazione soft per mantenere integrità referenziale
- Le immagini sono URL esterni (future implementazioni includeranno upload)
