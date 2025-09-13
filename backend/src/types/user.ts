/**
 * Definizioni dei tipi TypeScript per la gestione degli utenti
 * Contiene tutte le interfacce e i tipi utilizzati nel sistema di autenticazione
 */

import { Types } from 'mongoose';

/**
 * Enum per i ruoli utente
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MANAGER = 'manager'
}

/**
 * Interfaccia User per risposte API (senza dati sensibili)
 */
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaccia per la richiesta di creazione utente
 */
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

/**
 * Interfaccia per la richiesta di aggiornamento utente
 */
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Interfaccia per la richiesta di login
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Interfaccia per la risposta di autenticazione
 */
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Interfaccia per la risposta con dati utente
 */
export interface UserResponse {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// TIPI PER I MODELLI DI BUSINESS
// ==========================================

/**
 * Interfaccia Category per risposte API
 */
export interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
  isActive: boolean;
  parentId?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaccia Product per risposte API
 */
export interface Product {
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
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  images: string[];
  tags: string[];
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  supplier?: {
    name: string;
    email: string;
    phone?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaccia OrderItem
 */
export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

/**
 * Interfaccia ShippingAddress
 */
export interface ShippingAddress {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

/**
 * Interfaccia Order per risposte API
 */
export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  notes?: string;
  trackingNumber?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// REQUEST TYPES PER CRUD OPERATIONS
// ==========================================

export interface CreateCategoryRequest {
  name: string;
  description: string;
  parentId?: string;
  sortOrder?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateProductRequest {
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
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  images?: string[];
  tags?: string[];
  supplier?: {
    name: string;
    email: string;
    phone?: string;
  };
}

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
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  images?: string[];
  tags?: string[];
  supplier?: {
    name: string;
    email: string;
    phone?: string;
  };
  status?: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  isActive?: boolean;
}

export interface CreateOrderRequest {
  items: {
    productId: string;
    quantity: number;
  }[];
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  notes?: string;
  shippingCost?: number;
  taxAmount?: number;
  discountAmount?: number;
}

export interface UpdateOrderRequest {
  status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  trackingNumber?: string;
  notes?: string;
  cancelReason?: string;
}

// ==========================================
// RESPONSE TYPES PER API
// ==========================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: string[];
  timestamp: string;
}