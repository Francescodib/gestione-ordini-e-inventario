# 📁 Category Management API Documentation

## Overview

L'API di gestione categorie fornisce funzionalità complete per la gestione della struttura gerarchica delle categorie prodotti, inclusi operazioni CRUD, navigazione ad albero, spostamenti e statistiche avanzate.

## 🔗 Base URL
```
http://localhost:3000/api/categories
```

## 🔐 Authentication

Le operazioni di creazione, modifica, eliminazione e spostamento categorie richiedono autenticazione con JWT token.

```bash
Authorization: Bearer <jwt_token>
```

**Livelli di accesso:**
- **PUBLIC**: Consultazione catalogo, navigazione ad albero, breadcrumb
- **MANAGER/ADMIN**: Gestione categorie, statistiche
- **ADMIN**: Eliminazione categorie, operazioni bulk

---

## 📋 Endpoints

### 🟢 GET /api/categories
**Ottieni lista categorie con filtri e paginazione**

**Access:** Public

**Query Parameters:**
```javascript
{
  page?: number,           // Pagina (default: 1)
  limit?: number,          // Categorie per pagina (default: 20, max: 100)
  sortBy?: string,         // Campo ordinamento ('name' | 'sortOrder' | 'createdAt' | 'updatedAt')
  sortOrder?: string,      // Direzione ('asc' | 'desc', default: 'asc')
  parentId?: string,       // Filtra per categoria padre (usa 'null' per root)
  isActive?: boolean,      // Solo categorie attive
  hasProducts?: boolean,   // Solo categorie con/senza prodotti
  search?: string,         // Ricerca per nome, descrizione, slug
  includeChildren?: boolean, // Includi sottocategorie (default: true)
  includeProducts?: boolean, // Includi prodotti (default: false)
  includeCount?: boolean   // Includi contatori (default: true)
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmfirf9cl0005ia8b6t927kac",
      "name": "Elettronica",
      "description": "Prodotti elettronici e tecnologici",
      "slug": "elettronica",
      "isActive": true,
      "parentId": null,
      "sortOrder": 0,
      "createdAt": "2025-09-13T21:09:57.910Z",
      "updatedAt": "2025-09-13T21:09:57.910Z",
      "parent": null,
      "children": [
        {
          "id": "cmfirf9co000aia8b4j81kq5c",
          "name": "Smartphone",
          "description": "Telefoni cellulari e accessori",
          "slug": "smartphone",
          "isActive": true,
          "parentId": "cmfirf9cl0005ia8b6t927kac",
          "sortOrder": 0,
          "_count": {
            "products": 4,
            "children": 0
          }
        }
      ],
      "_count": {
        "products": 0,
        "children": 3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 13,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### 🟢 GET /api/categories/tree
**Ottieni struttura ad albero delle categorie**

**Access:** Public

**Query Parameters:**
```javascript
{
  rootId?: string  // ID categoria radice (default: tutte le root)
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmfirf9cl0005ia8b6t927kac",
      "name": "Elettronica",
      "description": "Prodotti elettronici e tecnologici",
      "slug": "elettronica",
      "children": [
        {
          "id": "cmfirf9co000aia8b4j81kq5c",
          "name": "Smartphone",
          "slug": "smartphone",
          "children": [],
          "_count": { "products": 4, "children": 0 }
        }
      ],
      "_count": { "products": 0, "children": 3 }
    }
  ],
  "message": "Category tree retrieved successfully"
}
```

### 🟢 GET /api/categories/slug/:slug
**Ottieni categoria per slug**

**Access:** Public

**Example:**
```bash
curl "http://localhost:3000/api/categories/slug/elettronica"
```

### 🟢 GET /api/categories/:id/path
**Ottieni percorso categoria (breadcrumb)**

**Access:** Public

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmfirf9cl0005ia8b6t927kac",
      "name": "Elettronica",
      "slug": "elettronica"
    },
    {
      "id": "cmfisow3s0000ia5smg485w1b",
      "name": "Gaming",
      "slug": "gaming"
    }
  ],
  "message": "Category path retrieved successfully"
}
```

### 🟢 GET /api/categories/:id
**Ottieni singola categoria per ID**

**Access:** Public

**Query Parameters:**
```javascript
{
  includeFullTree?: boolean  // Includi albero completo figli
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cmfisow3s0000ia5smg485w1b",
    "name": "Gaming",
    "description": "Console, giochi e accessori per il gaming",
    "slug": "gaming",
    "isActive": true,
    "parentId": "cmfirf9cl0005ia8b6t927kac",
    "sortOrder": 10,
    "parent": {
      "id": "cmfirf9cl0005ia8b6t927kac",
      "name": "Elettronica"
    },
    "children": [],
    "products": [],
    "_count": {
      "products": 0,
      "children": 0
    }
  }
}
```

### 🔵 POST /api/categories
**Crea nuova categoria**

**Access:** Admin/Manager only

**Request Body:**
```json
{
  "name": "Gaming",
  "description": "Console, giochi e accessori per il gaming",
  "slug": "gaming",          // Optional: auto-generato da name
  "parentId": "cmfirf9cl0005ia8b6t927kac",  // Optional: null per root
  "sortOrder": 10,           // Optional: default 0
  "isActive": true           // Optional: default true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": "cmfisow3s0000ia5smg485w1b",
    "name": "Gaming",
    "description": "Console, giochi e accessori per il gaming",
    "slug": "gaming",
    "isActive": true,
    "parentId": "cmfirf9cl0005ia8b6t927kac",
    "sortOrder": 10,
    "parent": {
      "id": "cmfirf9cl0005ia8b6t927kac",
      "name": "Elettronica"
    },
    "children": [],
    "_count": { "products": 0, "children": 0 }
  }
}
```

### 🟠 PUT /api/categories/:id
**Aggiorna categoria esistente**

**Access:** Admin/Manager only

**Request Body:** (tutti i campi sono opzionali)
```json
{
  "name": "Gaming & Console",
  "description": "Console, giochi, accessori e videogiochi",
  "sortOrder": 5,
  "isActive": true
}
```

### 🔴 DELETE /api/categories/:id
**Elimina categoria**

**Access:** Admin only

**Note:** 
- Se la categoria ha sottocategorie attive, l'operazione fallisce
- Se la categoria ha prodotti, viene eseguita eliminazione soft (isActive: false)
- Altrimenti viene eliminata completamente dal database

---

## 🔄 Hierarchical Operations

### 🟠 PUT /api/categories/:id/move
**Sposta categoria sotto nuovo genitore**

**Access:** Admin/Manager only

**Request Body:**
```json
{
  "newParentId": "cmfirf9cm0006ia8b50jdapbm"  // null per spostare a root
}
```

**Response:**
```json
{
  "success": true,
  "message": "Category moved successfully",
  "data": {
    "id": "cmfisow3s0000ia5smg485w1b",
    "name": "Gaming",
    "parentId": "cmfirf9cm0006ia8b50jdapbm",
    "parent": {
      "id": "cmfirf9cm0006ia8b50jdapbm",
      "name": "Abbigliamento"
    }
  }
}
```

---

## 📊 Analytics & Statistics

### 🟢 GET /api/categories/stats
**Statistiche complete delle categorie**

**Access:** Admin/Manager only

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCategories": 13,
    "activeCategories": 13,
    "inactiveCategories": 0,
    "rootCategories": 4,
    "categoriesWithProducts": 6,
    "maxDepth": 2,
    "averageProductsPerCategory": 0.85,
    "topCategoriesByProducts": [
      {
        "categoryId": "cmfirf9co000aia8b4j81kq5c",
        "categoryName": "Smartphone",
        "productCount": 4,
        "depth": 0
      },
      {
        "categoryId": "cmfirf9co000cia8b9l554oi5",
        "categoryName": "Computer",
        "productCount": 2,
        "depth": 0
      }
    ]
  }
}
```

---

## 🔄 Bulk Operations

### 🔵 POST /api/categories/bulk/reorder
**Riordina categorie in massa**

**Access:** Admin/Manager only

**Request Body:**
```json
{
  "categories": [
    {
      "id": "cmfirf9co000aia8b4j81kq5c",
      "sortOrder": 1
    },
    {
      "id": "cmfirf9co000cia8b9l554oi5",
      "sortOrder": 2
    },
    {
      "id": "cmfirf9cp000eia8bjynh0nd0",
      "sortOrder": 3
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Categories reordered successfully",
  "data": {
    "total": 3,
    "successful": 3,
    "failed": 0
  }
}
```

### 🔵 POST /api/categories/bulk/update-status
**Aggiornamento status in massa**

**Access:** Admin only

**Request Body:**
```json
{
  "categoryIds": [
    "category_id_1",
    "category_id_2"
  ],
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk status update completed",
  "data": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "isActive": false
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
      "field": "name",
      "message": "Category name must be at least 2 characters long",
      "value": "A"
    }
  ],
  "timestamp": "2025-09-13T21:45:31.556Z"
}
```

### Business Logic Errors
```json
{
  "success": false,
  "message": "Category with slug 'gaming' already exists"
}
```

### Circular Reference Errors
```json
{
  "success": false,
  "message": "Circular reference detected: Category cannot be moved under its descendant"
}
```

### Constraint Errors
```json
{
  "success": false,
  "message": "Cannot deactivate category with 3 active subcategories"
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

### 2. **Ottieni struttura ad albero**
```bash
curl "http://localhost:3000/api/categories/tree"
```

### 3. **Crea nuova categoria**
```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Accessori Gaming",
    "description": "Mouse, tastiere, cuffie da gaming",
    "parentId": "cmfisow3s0000ia5smg485w1b",
    "sortOrder": 1
  }'
```

### 4. **Ottieni breadcrumb di una categoria**
```bash
curl "http://localhost:3000/api/categories/CATEGORY_ID/path"
```

### 5. **Sposta categoria**
```bash
curl -X PUT http://localhost:3000/api/categories/CATEGORY_ID/move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "newParentId": "NEW_PARENT_ID"
  }'
```

### 6. **Ottieni statistiche**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/categories/stats
```

### 7. **Riordina categorie**
```bash
curl -X POST http://localhost:3000/api/categories/bulk/reorder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "categories": [
      {"id": "cat1", "sortOrder": 1},
      {"id": "cat2", "sortOrder": 2}
    ]
  }'
```

---

## 🎯 Features Implementate

✅ **CRUD completo delle categorie**
- Creazione, lettura, modifica, eliminazione
- Validazione completa con Joi
- Gestione soft delete per categorie con prodotti

✅ **Struttura gerarchica avanzata**
- Navigazione ad albero multi-livello
- Prevenzione referenze circolari
- Spostamento categorie con validazione

✅ **Sistema di breadcrumb**
- Percorso completo dalla radice
- Navigazione intuitiva per frontend

✅ **Slug URL-friendly**
- Generazione automatica da nome
- Accesso diretto tramite slug

✅ **Analytics e reporting**
- Statistiche complete della struttura
- Top categorie per numero prodotti
- Calcolo profondità massima albero

✅ **Controlli di autorizzazione**
- Accesso pubblico per navigazione
- Operazioni protette per Manager/Admin
- Operazioni critiche solo per Admin

✅ **Operazioni in massa**
- Riordinamento multiplo categorie
- Aggiornamento status di gruppo
- Gestione errori granulare

✅ **Logging strutturato**
- Log di tutte le operazioni CRUD
- Tracciamento spostamenti categorie
- Performance monitoring

---

## 🔧 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation Error / Business Logic Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (duplicate slug) |
| 500 | Server Error |

---

## 📝 Notes

- Gli slug sono automaticamente generati da nome e convertiti in formato URL-friendly
- Il sistema supporta strutture gerarchiche a profondità illimitata (con controlli prestazioni)
- Le categorie root hanno `parentId: null`
- Il `sortOrder` determina l'ordine di visualizzazione all'interno dello stesso livello
- Le operazioni di spostamento includono validazione per evitare referenze circolari
- Il sistema mantiene integrità referenziale con eliminazione soft quando necessario
- I contatori prodotti/figli sono calcolati dinamicamente per accuratezza in tempo reale

---

## 🏗️ Architecture Patterns

- **Hierarchical Data Model**: Adjacency List pattern con validazioni
- **Soft Delete**: Preserva integrità referenziale
- **Slug-based Access**: SEO-friendly URLs
- **Circular Reference Prevention**: Algoritmi di validazione ricorsiva
- **Performance Optimization**: Query ottimizzate per strutture ad albero
