/**
 * Category Types and Interfaces
 * All types related to category management and hierarchical structure
 */

import { AuditFields, PaginationQuery, Statistics } from './common';

/**
 * Category interface (complete)
 */
export interface Category extends AuditFields {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  level: number;
  path: string;
  sortOrder: number;
  isActive: boolean;
  
  // Hierarchy relations (optional, loaded when needed)
  parent?: Pick<Category, 'id' | 'name' | 'path'>;
  children?: Category[];
  ancestors?: Array<Pick<Category, 'id' | 'name' | 'path'>>;
  
  // Product count (computed)
  productCount?: number;
  totalProductCount?: number; // Including subcategories
}

/**
 * Create category request
 */
export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * Update category request
 */
export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * Category search and filter options
 */
export interface CategoryFilters {
  parentId?: string;
  level?: number;
  isActive?: boolean;
  hasProducts?: boolean;
  name?: string;
  path?: string;
}

/**
 * Category search query
 */
export interface CategorySearchQuery extends PaginationQuery {
  q?: string;
  filters?: CategoryFilters;
}

/**
 * Category tree node for hierarchical display
 */
export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  description?: string;
  level: number;
  path: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  totalProductCount: number;
  children: CategoryTreeNode[];
  
  // UI helpers
  expanded?: boolean;
  selected?: boolean;
  loading?: boolean;
}

/**
 * Category breadcrumb item
 */
export interface CategoryBreadcrumb {
  id: string;
  name: string;
  slug: string;
  path: string;
  url?: string;
}

/**
 * Category statistics
 */
export interface CategoryStatistics extends Statistics {
  maxDepth: number;
  topLevelCount: number;
  withProductsCount: number;
  emptyCount: number;
  mostPopular: Array<{
    id: string;
    name: string;
    productCount: number;
  }>;
  recentlyAdded: Array<{
    id: string;
    name: string;
    createdAt: Date;
  }>;
}

/**
 * Category move operation
 */
export interface CategoryMoveRequest {
  categoryId: string;
  newParentId?: string;
  newPosition?: number;
}

/**
 * Category reorder operation
 */
export interface CategoryReorderRequest {
  categories: Array<{
    id: string;
    sortOrder: number;
  }>;
}

/**
 * Category bulk operation request
 */
export interface CategoryBulkOperation {
  action: 'activate' | 'deactivate' | 'delete' | 'move';
  categoryIds: string[];
  data?: {
    parentId?: string;
    isActive?: boolean;
    [key: string]: any;
  };
}

/**
 * Category path information
 */
export interface CategoryPath {
  id: string;
  breadcrumbs: CategoryBreadcrumb[];
  ancestors: Array<Pick<Category, 'id' | 'name' | 'slug'>>;
  depth: number;
  fullPath: string;
}

/**
 * Category validation result
 */
export interface CategoryValidationResult {
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
  circularReference?: boolean;
  maxDepthExceeded?: boolean;
}

/**
 * Category export options
 */
export interface CategoryExportOptions {
  format: 'csv' | 'xlsx' | 'json' | 'tree';
  includeHierarchy?: boolean;
  includeProductCounts?: boolean;
  includeInactive?: boolean;
  maxDepth?: number;
}

/**
 * Category import data
 */
export interface CategoryImportData {
  name: string;
  slug?: string;
  description?: string;
  parentPath?: string; // Full path like "Electronics/Computers/Laptops"
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * Category hierarchy visualization
 */
export interface CategoryHierarchyView {
  tree: CategoryTreeNode[];
  totalCategories: number;
  maxDepth: number;
  totalProducts: number;
  metadata: {
    lastUpdated: Date;
    buildDuration: number;
  };
}

/**
 * Category suggestions for autocomplete
 */
export interface CategorySuggestion {
  id: string;
  name: string;
  path: string;
  level: number;
  productCount: number;
  match: {
    field: 'name' | 'path' | 'description';
    highlight?: string;
  };
}

/**
 * Category merger request (for combining categories)
 */
export interface CategoryMergeRequest {
  sourceId: string;    // Category to merge from
  targetId: string;    // Category to merge into
  moveProducts: boolean; // Whether to move products
  deleteSource: boolean; // Whether to delete source category
}

/**
 * Category split request (for splitting large categories)
 */
export interface CategorySplitRequest {
  sourceId: string;
  newCategories: Array<{
    name: string;
    slug?: string;
    description?: string;
    productIds?: string[]; // Products to move to this category
  }>;
}

/**
 * Category analytics data
 */
export interface CategoryAnalytics {
  categoryId: string;
  period: {
    from: Date;
    to: Date;
  };
  metrics: {
    views: number;
    productViews: number;
    orders: number;
    revenue: number;
    conversionRate: number;
  };
  trends: {
    viewsChange: number;
    ordersChange: number;
    revenueChange: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    views: number;
    orders: number;
    revenue: number;
  }>;
}
