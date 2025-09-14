# 🔍 **ADVANCED SEARCH API DOCUMENTATION**

## 📋 **Panoramica**

L'Advanced Search API fornisce funzionalità di ricerca unificate e cross-entity per il sistema di gestione ordini e inventario. Permette ricerche intelligenti su prodotti, categorie, ordini e utenti con filtri avanzati, suggerimenti automatici e autocomplete.

### **🔧 Caratteristiche Principali**

- **Ricerca Globale Unificata**: Cerca simultaneamente su più entità
- **Ricerca Entity-Specifica**: Ricerca focalizzata su singoli tipi di entità
- **Filtri Avanzati**: Prezzo, categoria, status, date, stock
- **Autocomplete Intelligente**: Suggerimenti in tempo reale
- **Search Suggestions**: Suggerimenti basati su termini popolari
- **Relevance Scoring**: Ordinamento per rilevanza
- **Performance Ottimizzata**: Query parallele e caching
- **Logging Completo**: Tracciamento di tutte le ricerche

---

## 🌐 **GLOBAL SEARCH ROUTES**

### **GET /api/search**
**Ricerca globale unificata su tutte le entità**

#### **Query Parameters:**
```typescript
{
  q: string;              // Query di ricerca (richiesto, 1-100 caratteri)
  entities?: string;      // Entità da cercare (default: "products,categories")
  limit?: number;         // Limit risultati (1-100, default: 20)
  page?: number;          // Pagina (min: 1, default: 1)
  sortBy?: string;        // Ordinamento ("relevance"|"date"|"name"|"price")
  sortOrder?: string;     // Direzione ("asc"|"desc", default: "desc")
  
  // Filtri
  "price.min"?: number;   // Prezzo minimo
  "price.max"?: number;   // Prezzo massimo
  categoryIds?: string;   // IDs categorie (comma-separated)
  status?: string;        // Status (comma-separated)
  "date.from"?: string;   // Data iniziale (ISO string)
  "date.to"?: string;     // Data finale (ISO string)
  inStock?: boolean;      // Solo prodotti in stock
  isActive?: boolean;     // Solo entità attive
}
```

#### **Response:**
```typescript
{
  success: boolean;
  data: {
    results: SearchResultItem[];
    total: number;
    totalByType: {
      products: number;
      categories: number;
      orders: number;
      users: number;
    };
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    searchTime: number;     // Tempo di ricerca in ms
    suggestions: string[];  // Suggerimenti correlati
  }
}
```

#### **Esempi d'uso:**

```bash
# Ricerca base
GET /api/search?q=macbook

# Ricerca con filtri di prezzo
GET /api/search?q=laptop&price.min=500&price.max=2000

# Ricerca solo prodotti ordinati per prezzo
GET /api/search?q=coffee&entities=products&sortBy=price&sortOrder=asc

# Ricerca con filtri di categoria
GET /api/search?q=smartphone&categoryIds=cat1,cat2

# Ricerca con range di date
GET /api/search?q=order&entities=orders&date.from=2025-01-01&date.to=2025-12-31
```

### **GET /api/search/suggestions**
**Ottieni suggerimenti di ricerca basati su query parziale**

#### **Query Parameters:**
```typescript
{
  q: string;        // Query parziale (1-50 caratteri)
  type?: string;    // Tipo suggerimenti ("products"|"categories"|"all")
}
```

#### **Response:**
```typescript
{
  success: boolean;
  data: {
    query: string;
    suggestions: string[];
  }
}
```

#### **Esempio:**
```bash
GET /api/search/suggestions?q=caff&type=products
```

### **GET /api/search/autocomplete**
**Autocomplete in tempo reale per input di ricerca**

#### **Query Parameters:**
```typescript
{
  q: string;        // Query parziale (2-50 caratteri)
  type?: string;    // Tipo filtro ("products"|"categories")
}
```

#### **Response:**
```typescript
{
  success: boolean;
  data: string[];   // Array di suggerimenti
}
```

#### **Esempio:**
```bash
GET /api/search/autocomplete?q=mac&type=products
```

---

## 🎯 **ENTITY-SPECIFIC SEARCH ROUTES**

### **GET /api/search/products**
**Ricerca avanzata prodotti con filtri dettagliati**

#### **Query Parameters:**
```typescript
{
  q: string;              // Query di ricerca (richiesto)
  limit?: number;         // Limit risultati (1-50, default: 10)
  page?: number;          // Pagina (default: 1)
  sortBy?: string;        // "relevance"|"price"|"name"|"date"
  sortOrder?: string;     // "asc"|"desc"
  "price.min"?: number;   // Prezzo minimo
  "price.max"?: number;   // Prezzo massimo
  categoryIds?: string;   // IDs categorie
  status?: string;        // Status prodotti
  inStock?: boolean;      // Solo prodotti in stock
  includeRelated?: boolean; // Includi dati correlati (default: false)
}
```

#### **Response:**
```typescript
{
  success: boolean;
  data: Product[];        // Array prodotti con categoria e order items
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}
```

#### **Esempio:**
```bash
GET /api/search/products?q=macbook&includeRelated=true&price.min=1000
```

### **GET /api/search/categories**
**Ricerca categorie con struttura gerarchica**

#### **Query Parameters:**
```typescript
{
  q: string;              // Query di ricerca (richiesto)
  limit?: number;         // Limit risultati (1-50, default: 10)
  page?: number;          // Pagina (default: 1)
  sortBy?: string;        // "relevance"|"name"|"date"
  sortOrder?: string;     // "asc"|"desc"
  includeRelated?: boolean; // Includi prodotti correlati (default: false)
}
```

#### **Response:**
```typescript
{
  success: boolean;
  data: Category[];       // Array categorie con parent, children, conteggi
  pagination: PaginationInfo;
}
```

#### **Esempio:**
```bash
GET /api/search/categories?q=electronics&includeRelated=true
```

### **GET /api/search/orders** 🔒
**Ricerca ordini (Admin/Manager only)**

#### **Autenticazione:** Richiesto (Admin/Manager)

#### **Query Parameters:**
```typescript
{
  q: string;              // Query di ricerca (richiesto)
  limit?: number;         // Limit risultati (1-50, default: 10)
  page?: number;          // Pagina (default: 1)
  sortBy?: string;        // "relevance"|"date"|"total"
  sortOrder?: string;     // "asc"|"desc"
  status?: string;        // Status ordini
  "date.from"?: string;   // Data iniziale
  "date.to"?: string;     // Data finale
}
```

#### **Response:**
```typescript
{
  success: boolean;
  data: Order[];          // Array ordini con user, items, conteggi
  pagination: PaginationInfo;
}
```

#### **Esempio:**
```bash
GET /api/search/orders?q=ORD-2025&status=PENDING
# Header: Authorization: Bearer <admin_token>
```

### **GET /api/search/users** 🔒
**Ricerca utenti (Admin only)**

#### **Autenticazione:** Richiesto (Admin)

#### **Query Parameters:**
```typescript
{
  q: string;              // Query di ricerca (richiesto)
  limit?: number;         // Limit risultati (1-50, default: 10)
  page?: number;          // Pagina (default: 1)
  sortBy?: string;        // "name"|"email"|"date"
  sortOrder?: string;     // "asc"|"desc"
  role?: string;          // Ruoli utenti
}
```

#### **Response:**
```typescript
{
  success: boolean;
  data: User[];           // Array utenti (dati sensibili filtrati)
  pagination: PaginationInfo;
}
```

#### **Esempio:**
```bash
GET /api/search/users?q=john&role=CUSTOMER
# Header: Authorization: Bearer <admin_token>
```

---

## 📊 **ANALYTICS ROUTES**

### **GET /api/search/analytics** 🔒
**Analytics ricerche (Admin only)**

#### **Autenticazione:** Richiesto (Admin)

#### **Response:**
```typescript
{
  success: boolean;
  data: {
    totalSearches: number;
    uniqueQueries: number;
    averageResultsPerSearch: number;
    topQueries: Array<{
      query: string;
      count: number;
      avgResults: number;
    }>;
    searchesByEntity: {
      products: number;
      categories: number;
      orders: number;
      users: number;
    };
    searchesByHour: Array<{
      hour: number;
      count: number;
    }>;
  }
}
```

#### **Esempio:**
```bash
GET /api/search/analytics
# Header: Authorization: Bearer <admin_token>
```

---

## 🔍 **SEARCH RESULT ITEM STRUCTURE**

```typescript
interface SearchResultItem {
  id: string;
  type: 'product' | 'category' | 'order' | 'user';
  title: string;
  description?: string;
  subtitle?: string;
  url?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
  relevanceScore?: number;
}
```

### **Esempi per tipo:**

#### **Product Result:**
```typescript
{
  id: "prod_123",
  type: "product",
  title: "MacBook Air M3",
  description: "Laptop Apple con chip M3",
  subtitle: "€1299.99 • Computer • Stock: 12",
  url: "/products/prod_123",
  imageUrl: null,
  metadata: {
    price: 1299.99,
    stock: 12,
    sku: "MBA-M3-13-256",
    category: "Computer",
    status: "ACTIVE"
  },
  relevanceScore: 95
}
```

#### **Category Result:**
```typescript
{
  id: "cat_456",
  type: "category",
  title: "Electronics",
  description: "Electronic devices and accessories",
  subtitle: "125 products • Root category",
  url: "/categories/electronics",
  metadata: {
    slug: "electronics",
    productCount: 125,
    childrenCount: 8,
    parent: null
  },
  relevanceScore: 88
}
```

---

## 🎯 **RELEVANCE SCORING ALGORITHM**

Il sistema utilizza un algoritmo di relevance scoring che considera:

### **Product Scoring:**
- **Stock Availability** (+10 punti se in stock)
- **Price Range** (+5 se < €100, +3 se < €500, +1 altrimenti)
- **Status** (+5 se ACTIVE)
- **Max Score:** 100 punti

### **Category Scoring:**
- **Product Count** (+1 per prodotto, max 20)
- **Hierarchy Level** (+5 se root, +3 se child)
- **Max Score:** 100 punti

### **Order Scoring:**
- **Recency** (+30 punti per ordini recenti, decrescente)
- **Status Priority** (+10 PENDING, +8 PROCESSING, +5 altri)
- **Max Score:** 100 punti

### **User Scoring:**
- **Active Status** (+10 se attivo)
- **Order Count** (+1 per ordine, max 15)
- **Email Verified** (+5 se verificato)
- **Max Score:** 100 punti

---

## 📈 **PERFORMANCE E OTTIMIZZAZIONI**

### **Query Optimization:**
- **Parallel Execution**: Le ricerche multi-entity vengono eseguite in parallelo
- **Index Usage**: Utilizzati indici database per performance ottimali
- **Result Limiting**: Limiti per prevenire query troppo costose

### **Caching Strategy:**
- **Suggestion Caching**: I suggerimenti popolari vengono cachati
- **Query Result Caching**: Cache temporanea per query frequenti
- **Autocomplete Caching**: Cache in-memory per autocomplete veloce

### **Monitoring:**
- **Search Time Tracking**: Ogni ricerca viene cronometrata
- **Popular Query Tracking**: Tracciamento query più frequenti
- **Performance Metrics**: Metriche dettagliate per ottimizzazione

---

## 🚨 **ERROR HANDLING**

### **Errori Comuni:**

#### **400 - Bad Request:**
```typescript
{
  success: false,
  message: "Validation failed",
  errors: [
    {
      field: "q",
      message: "Search query is required",
      value: ""
    }
  ]
}
```

#### **403 - Forbidden:**
```typescript
{
  success: false,
  message: "Insufficient permissions to search orders"
}
```

#### **500 - Internal Server Error:**
```typescript
{
  success: false,
  message: "Search failed",
  error: "Database connection timeout"
}
```

---

## 🔒 **SECURITY & PERMISSIONS**

### **Public Access:**
- ✅ Global search (products, categories only)
- ✅ Product search
- ✅ Category search
- ✅ Suggestions & Autocomplete

### **Authenticated Access:**
- 🔐 Order search (Manager/Admin)
- 🔐 User search (Admin only)
- 🔐 Search analytics (Admin only)

### **Data Filtering:**
- **User Data**: Solo dati pubblici esposti nelle ricerche
- **Order Data**: Filtrato per permessi utente
- **Sensitive Info**: Automaticamente rimossa dai risultati

---

## 📊 **USAGE EXAMPLES**

### **E-commerce Frontend:**
```javascript
// Ricerca prodotti con autocomplete
const searchProducts = async (query) => {
  const response = await fetch(`/api/search/autocomplete?q=${query}&type=products`);
  return response.json();
};

// Ricerca globale con filtri
const globalSearch = async (query, filters = {}) => {
  const params = new URLSearchParams({
    q: query,
    ...filters
  });
  const response = await fetch(`/api/search?${params}`);
  return response.json();
};
```

### **Admin Dashboard:**
```javascript
// Ricerca ordini per admin
const searchOrders = async (query, token) => {
  const response = await fetch(`/api/search/orders?q=${query}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Analytics ricerche
const getSearchAnalytics = async (token) => {
  const response = await fetch('/api/search/analytics', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

---

## 🔄 **API VERSIONING**

**Current Version:** v1  
**Base URL:** `/api/search`  
**Backward Compatibility:** Garantita per modifiche non-breaking

---

## 📝 **CHANGELOG**

### **v1.0.0** - 2025-09-13
- ✨ Initial release
- ✨ Global unified search
- ✨ Entity-specific search endpoints
- ✨ Autocomplete and suggestions
- ✨ Advanced filtering system
- ✨ Relevance scoring algorithm
- ✨ Performance optimization
- ✨ Comprehensive logging

---

## 🤝 **SUPPORTO**

Per supporto tecnico o segnalazione di bug:
- **Email**: support@quickstock.com
- **Documentation**: `/api/docs`
- **Status Page**: `/api/health`
