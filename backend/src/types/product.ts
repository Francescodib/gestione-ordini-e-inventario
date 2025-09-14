/**
 * Product Types and Interfaces
 * All types related to product management
 */

import { ProductStatus } from '@prisma/client';
import { AuditFields, PaginationQuery, Statistics, Address } from './common';

/**
 * Product dimensions
 */
export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit?: 'cm' | 'inch';
}

/**
 * Product supplier information
 */
export interface ProductSupplier {
  name: string;
  email: string;
  phone?: string;
  address?: Address;
  website?: string;
  contactPerson?: string;
}

/**
 * Product interface (complete)
 */
export interface Product extends AuditFields {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  maxStock?: number;
  weight?: number;
  dimensions?: ProductDimensions;
  images: string[];
  tags: string[];
  status: ProductStatus;
  supplier?: ProductSupplier;
  isActive: boolean;
  
  // Relations (optional, loaded when needed)
  category?: {
    id: string;
    name: string;
    path?: string;
  };
  productImages?: Array<{
    id: string;
    url: string;
    alt?: string;
    isPrimary: boolean;
  }>;
}

/**
 * Create product request
 */
export interface CreateProductRequest {
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  price: number;
  costPrice: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  weight?: number;
  images?: string[];
  tags?: string[];
  status?: ProductStatus;
  supplier?: ProductSupplier;
  dimensions?: ProductDimensions;
}

/**
 * Update product request
 */
export interface UpdateProductRequest {
  name?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  price?: number;
  costPrice?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  weight?: number;
  images?: string[];
  tags?: string[];
  status?: ProductStatus;
  supplier?: ProductSupplier;
  dimensions?: ProductDimensions;
  isActive?: boolean;
}

/**
 * Product search and filter options
 */
export interface ProductFilters {
  categoryId?: string;
  status?: ProductStatus;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  lowStock?: boolean;
  tags?: string[];
  supplierId?: string;
  name?: string;
  sku?: string;
  isActive?: boolean;
}

/**
 * Product search query
 */
export interface ProductSearchQuery extends PaginationQuery {
  q?: string;
  filters?: ProductFilters;
}

/**
 * Product statistics
 */
export interface ProductStatistics extends Statistics {
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
    value: number;
  }>;
  byStatus: Record<ProductStatus, number>;
  averagePrice: number;
  mostExpensive: {
    id: string;
    name: string;
    price: number;
  };
  leastExpensive: {
    id: string;
    name: string;
    price: number;
  };
}

/**
 * Stock movement types
 */
export enum StockMovementType {
  IN = 'IN',           // Stock increase
  OUT = 'OUT',         // Stock decrease
  ADJUSTMENT = 'ADJUSTMENT', // Manual adjustment
  SALE = 'SALE',       // Sale transaction
  RETURN = 'RETURN',   // Product return
  DAMAGED = 'DAMAGED', // Damaged/lost items
  TRANSFER = 'TRANSFER' // Transfer between locations
}

/**
 * Stock movement record
 */
export interface StockMovement extends AuditFields {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  reference?: string; // Order ID, transfer ID, etc.
  userId?: string;    // Who made the movement
  
  // Relations
  product?: Pick<Product, 'id' | 'name' | 'sku'>;
  user?: {
    id: string;
    username: string;
  };
}

/**
 * Stock adjustment request
 */
export interface StockAdjustmentRequest {
  productId: string;
  quantity: number;
  type: StockMovementType;
  reason?: string;
  reference?: string;
}

/**
 * Bulk stock update request
 */
export interface BulkStockUpdateRequest {
  products: Array<{
    id: string;
    stock: number;
    reason?: string;
  }>;
}

/**
 * Product price history
 */
export interface ProductPriceHistory extends AuditFields {
  id: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  oldCostPrice: number;
  newCostPrice: number;
  reason?: string;
  userId?: string;
}

/**
 * Product bulk operation request
 */
export interface ProductBulkOperation {
  action: 'activate' | 'deactivate' | 'delete' | 'updateCategory' | 'updateStatus';
  productIds: string[];
  data?: {
    categoryId?: string;
    status?: ProductStatus;
    [key: string]: any;
  };
}

/**
 * Product export options
 */
export interface ProductExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  fields?: string[];
  filters?: ProductFilters;
  includeImages?: boolean;
  includeCategory?: boolean;
  includeSupplier?: boolean;
}

/**
 * Product import data
 */
export interface ProductImportData {
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  categoryName: string; // Will be resolved to categoryId
  price: number;
  costPrice: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  weight?: number;
  tags?: string;  // Comma-separated
  status?: string;
  supplierName?: string;
  supplierEmail?: string;
}

/**
 * Product validation result
 */
export interface ProductValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

/**
 * Product recommendation
 */
export interface ProductRecommendation {
  productId: string;
  score: number;
  reason: 'similar_category' | 'frequently_bought_together' | 'similar_price' | 'trending';
  product: Pick<Product, 'id' | 'name' | 'price' | 'images'>;
}
