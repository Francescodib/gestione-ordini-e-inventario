/**
 * Order Types and Interfaces for Frontend
 */

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: number | string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;

  // Financial information
  subtotal?: number;
  shippingCost?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;

  // Dates
  createdAt: string | Date;
  updatedAt: string | Date;
  shippedAt?: string | Date;
  deliveredAt?: string | Date;
  cancelledAt?: string | Date;

  // Additional info
  notes?: string;
  trackingNumber?: string;
  shippingCarrier?: string;

  // Relations (optional)
  user?: {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  items?: OrderItem[];
}

export interface CreateOrderRequest {
  items: Array<{
    productId: string | number;
    quantity: number;
    unitPrice?: number;
  }>;
  totalAmount: number;
  shippingAddressId?: number;
  shippingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod?: string;
  notes?: string;
}

export interface UpdateOrderRequest {
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  notes?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
}

export interface OrderFilters {
  userId?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
  orderNumber?: string;
  trackingNumber?: string;
}

export interface OrderSearchQuery {
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: OrderFilters;
}

// Order Status Constants
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIAL: 'PARTIAL'
} as const;

export const PAYMENT_METHOD = {
  CASH: 'CASH',
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  PAYPAL: 'PAYPAL',
  STRIPE: 'STRIPE',
  OTHER: 'OTHER'
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type PaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];