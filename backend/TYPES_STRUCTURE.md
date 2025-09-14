# 📁 **TYPESCRIPT TYPES STRUCTURE**

## 📋 **Panoramica**

La struttura dei tipi TypeScript è stata **riorganizzata** per migliorare la manutenibilità, la chiarezza e la scalabilità del progetto. Invece di avere tutti i tipi misti in un singolo file, ora sono organizzati per **dominio di appartenenza**.

---

## 🗂️ **NUOVA STRUTTURA**

### **`/src/types/` Directory:**

```
src/types/
├── index.ts          # ✨ Esportazione centrale di tutti i tipi
├── common.ts         # 🔧 Tipi comuni e utilities
├── auth.ts           # 👤 Utenti, autenticazione, autorizzazione
├── product.ts        # 📦 Prodotti, stock, varianti
├── category.ts       # 📂 Categorie, gerarchia, albero
├── order.ts          # 🛒 Ordini, workflow, pagamenti
├── file.ts           # 📎 Upload file, immagini, documenti
├── search.ts         # 🔍 Ricerca, filtri, autocomplete
├── monitoring.ts     # 📊 Monitoring, metriche, alert
└── user.ts           # ⚠️ DEPRECATED - Mantenuto per compatibilità
```

---

## 📊 **DETTAGLIO FILES**

### **1. `common.ts` - Tipi Base**
```typescript
// Tipi condivisi utilizzati in tutto il progetto
export interface ApiResponse<T>
export interface PaginationMeta
export interface SearchOptions
export interface AuditFields
export interface Address
export enum EntityStatus
```

### **2. `auth.ts` - Autenticazione**
```typescript
// Tutto relativo a utenti e autenticazione
export interface User
export interface PublicUser
export interface LoginRequest
export interface RegisterRequest
export interface UserPermissions
export interface JwtPayload
export interface AuthSession
```

### **3. `product.ts` - Prodotti**
```typescript
// Gestione prodotti completa
export interface Product
export interface CreateProductRequest
export interface UpdateProductRequest
export interface ProductFilters
export interface ProductStatistics
export interface StockMovement
export interface ProductRecommendation
```

### **4. `category.ts` - Categorie**
```typescript
// Sistema gerarchico categorie
export interface Category
export interface CategoryTreeNode
export interface CategoryBreadcrumb
export interface CategoryPath
export interface CategoryAnalytics
export interface CategoryMergeRequest
```

### **5. `order.ts` - Ordini**
```typescript
// Workflow ordini completo
export interface Order
export interface OrderItem
export interface CreateOrderRequest
export interface OrderStatistics
export interface OrderWorkflow
export interface OrderInvoice
export interface OrderReturn
```

### **6. `file.ts` - File Management**
```typescript
// Sistema upload e gestione file
export interface UploadedFile
export interface ProductImage
export interface FileUploadRequest
export interface ImageProcessingOptions
export interface FileStorageConfig
export interface CDNConfig
```

### **7. `search.ts` - Ricerca**
```typescript
// Sistema ricerca avanzata
export interface GlobalSearchOptions
export interface SearchResultItem
export interface SearchFacets
export interface AutocompleteResult
export interface SearchAnalytics
export interface SearchPersonalization
```

### **8. `monitoring.ts` - Monitoraggio**
```typescript
// Observability e monitoring
export interface SystemMetrics
export interface ApplicationMetrics
export interface Alert
export interface HealthCheckResult
export interface PerformanceMetrics
export interface Incident
```

---

## 🔄 **MIGRATION GUIDE**

### **❌ Vecchio Approccio (DEPRECATED):**
```typescript
// Tutto in un file - DISORGANIZZATO
import { User, Product, Category, Order } from '../types/user';
```

### **✅ Nuovo Approccio (RACCOMANDATO):**

#### **Opzione 1: Import Specifici**
```typescript
// Import specifici per dominio
import { User, LoginRequest } from '../types/auth';
import { Product, CreateProductRequest } from '../types/product';
import { Category, CategoryTreeNode } from '../types/category';
import { Order, OrderItem } from '../types/order';
```

#### **Opzione 2: Import Centrale**
```typescript
// Import tutto dal file index
import { 
  User, 
  Product, 
  Category, 
  Order,
  ApiResponse,
  PaginationMeta
} from '../types';
```

#### **Opzione 3: Import Namespace**
```typescript
// Import con namespace per evitare conflitti
import * as AuthTypes from '../types/auth';
import * as ProductTypes from '../types/product';

const user: AuthTypes.User = { ... };
const product: ProductTypes.Product = { ... };
```

---

## 🎯 **VANTAGGI DELLA NUOVA STRUTTURA**

### **1. 🧹 Organizzazione Migliore**
- **Separazione logica** per dominio
- **Facile navigazione** del codice
- **Riduzione complessità** per file

### **2. 🔧 Manutenibilità**
- **Modifiche isolate** per dominio
- **Import selettivi** solo necessari
- **Refactoring facilitato**

### **3. 📈 Scalabilità**
- **Aggiunta nuovi domini** semplice
- **Team development** parallelo
- **Code splitting** naturale

### **4. 🎯 Discoverability**
- **Tipi raggruppati** logicamente
- **Autocomplete migliore** in IDE
- **Documentazione più chiara**

---

## 📝 **REGOLE DI UTILIZZO**

### **✅ DO - Cosa Fare:**

1. **Usa import specifici** per dominio
```typescript
import { Product } from '../types/product';
import { User } from '../types/auth';
```

2. **Definisci nuovi tipi** nel file appropriato
```typescript
// In types/product.ts
export interface ProductVariant {
  // ...
}
```

3. **Usa common.ts** per tipi condivisi
```typescript
// In types/common.ts
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
```

4. **Esporta dal index.ts** per accessibilità
```typescript
// In types/index.ts
export * from './product';
export * from './auth';
```

### **❌ DON'T - Cosa Evitare:**

1. **Non definire tipi** in file servizi
```typescript
// ❌ SBAGLIATO - In productService.ts
interface ProductRequest { ... }

// ✅ CORRETTO - In types/product.ts
export interface CreateProductRequest { ... }
```

2. **Non import dall'old user.ts**
```typescript
// ❌ DEPRECATED
import { Product } from '../types/user';

// ✅ NUOVO
import { Product } from '../types/product';
```

3. **Non duplicare tipi** in file diversi
```typescript
// ❌ SBAGLIATO - Duplicazione
// types/product.ts
interface Address { ... }

// types/order.ts  
interface Address { ... }

// ✅ CORRETTO - In common.ts
export interface Address { ... }
```

---

## 🔄 **COMPATIBILITÀ BACKWARD**

### **Supporto Legacy:**
Il file `types/user.ts` è **mantenuto** per compatibilità:

```typescript
// types/user.ts
/**
 * @deprecated Use specific type files instead
 */
export * from './auth';
export * from './product';
export * from './category';
export * from './order';
```

### **Piano di Migrazione:**

1. **Fase 1** ✅ - Nuova struttura creata
2. **Fase 2** 🔄 - Update graduale import nei servizi  
3. **Fase 3** ⏳ - Deprecazione warning `user.ts`
4. **Fase 4** 🎯 - Rimozione finale `user.ts`

---

## 📊 **ESEMPI PRATICI**

### **ProductService Migration:**

#### **Prima:**
```typescript
// productService.ts
import { Product, CreateProductRequest } from '../types/user'; // ❌ MISTO

interface UpdateProductRequest { // ❌ DEFINITO NEL SERVIZIO
  name?: string;
  price?: number;
}
```

#### **Dopo:**
```typescript  
// productService.ts
import { 
  Product, 
  CreateProductRequest, 
  UpdateProductRequest 
} from '../types/product'; // ✅ SPECIFICO

// types/product.ts
export interface UpdateProductRequest { // ✅ NEL FILE TIPI
  name?: string;
  price?: number;
}
```

### **Order Management:**

#### **Prima:**
```typescript
// orderService.ts  
import { Order, User } from '../types/user'; // ❌ MISTO

interface OrderWithUser { // ❌ DUPLICAZIONE
  order: Order;
  user: User;
}
```

#### **Dopo:**
```typescript
// orderService.ts
import { Order } from '../types/order';
import { User } from '../types/auth';

// types/order.ts
export interface OrderWithUser { // ✅ ORGANIZZATO
  order: Order;
  user: User;
}
```

---

## 🎉 **CONCLUSIONI**

### **Benefici Immediati:**
- ✅ **Codice più organizzato** e leggibile
- ✅ **Import più specifici** e performanti  
- ✅ **Manutenzione semplificata** per dominio
- ✅ **Scalabilità migliorata** per nuove features

### **Best Practices:**
- 🎯 **Un dominio, un file** di tipi
- 🔧 **Tipi comuni** in `common.ts`
- 📦 **Export centrale** tramite `index.ts`
- 🔄 **Compatibilità garantita** durante transizione

### **Prossimi Passi:**
1. **Aggiorna import** nei servizi gradualmente
2. **Definisci nuovi tipi** nei file appropriati
3. **Sfrutta l'autocomplete** migliorato dell'IDE
4. **Contribuisci** mantenendo l'organizzazione

**La nuova struttura rende il codebase più professionale, manutenibile e scalabile!** 🚀
