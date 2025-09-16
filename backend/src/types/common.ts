/**
 * Common Types and Utilities
 * Shared types used across the application
 */

/**
 * Base response interface for all API endpoints
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
  timestamp?: string;
  pagination?: PaginationMeta;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Pagination query parameters
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search and filter options
 */
export interface SearchOptions {
  q?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  pagination?: PaginationQuery;
}

/**
 * Date range filter
 */
export interface DateRange {
  from?: Date | string;
  to?: Date | string;
}

/**
 * Audit fields (common to many entities)
 */
export interface AuditFields {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Soft delete fields
 */
export interface SoftDeleteFields {
  deletedAt?: Date | null;
  isDeleted?: boolean;
}

/**
 * Address interface (used in orders, users, etc.)
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  notes?: string;
}

/**
 * File upload information
 */
export interface FileInfo {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  path: string;
}

/**
 * Statistics base interface
 */
export interface Statistics {
  total: number;
  active?: number;
  inactive?: number;
  [key: string]: any; // Allow any type for flexibility
}

/**
 * ID parameter interface
 */
export interface IdParams {
  id: number;
}

/**
 * Status enum for entities
 */
export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Sort options
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Filter operators
 */
export enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  CONTAINS = 'contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  IN = 'in',
  NOT_IN = 'notIn'
}

/**
 * Generic filter interface
 */
export interface Filter {
  field: string;
  operator: FilterOperator;
  value: any;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  success: boolean;
  total: number;
  processed: number;
  errors: Array<{
    id: number;
    error: string;
  }>;
}
