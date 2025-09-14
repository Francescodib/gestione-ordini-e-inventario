/**
 * Order Types and Interfaces
 * All types related to order management and workflow
 */

import { OrderStatus, PaymentStatus } from '@prisma/client';

// Define PaymentMethod locally since it's not in Prisma
export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  PAYPAL = 'PAYPAL',
  STRIPE = 'STRIPE',
  OTHER = 'OTHER'
}
import { AuditFields, PaginationQuery, Statistics, Address } from './common';
import { Product } from './product';

/**
 * Order item interface
 */
export interface OrderItem extends AuditFields {
  id: string;
  orderId: string;
  productId: string;
  name: string;        // Product name at time of order
  sku: string;         // Product SKU at time of order
  price: number;       // Product price at time of order
  quantity: number;
  unitPrice: number;   // Same as price, for clarity
  totalPrice: number;  // price * quantity
  
  // Relations (optional)
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'images' | 'stock'>;
}

/**
 * Order interface (complete)
 */
export interface Order extends AuditFields {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  
  // Financial information
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  
  // Addresses
  shippingAddress: Address;
  billingAddress: Address;
  
  // Dates
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  
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
  orderItems?: OrderItem[];
}

/**
 * Create order request
 */
export interface CreateOrderRequest {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress: Address;
  billingAddress?: Address; // If not provided, use shipping address
  paymentMethod?: PaymentMethod;
  notes?: string;
  discountCode?: string;
}

/**
 * Update order request
 */
export interface UpdateOrderRequest {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  shippingAddress?: Address;
  billingAddress?: Address;
  notes?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
}

/**
 * Order search and filter options
 */
export interface OrderFilters {
  userId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  shippedDateFrom?: Date | string;
  shippedDateTo?: Date | string;
  orderNumber?: string;
  trackingNumber?: string;
  productId?: string;
}

/**
 * Order search query
 */
export interface OrderSearchQuery extends PaginationQuery {
  q?: string;
  filters?: OrderFilters;
}

/**
 * Order statistics
 */
export interface OrderStatistics extends Statistics {
  totalRevenue: number;
  averageOrderValue: number;
  totalItems: number;
  averageItemsPerOrder: number;
  
  byStatus: Record<OrderStatus, number>;
  byPaymentStatus: Record<PaymentStatus, number>;
  byPaymentMethod: Record<PaymentMethod | 'UNKNOWN', number>;
  
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: OrderStatus;
    createdAt: Date;
  }>;
  
  topCustomers: Array<{
    userId: string;
    username: string;
    orderCount: number;
    totalSpent: number;
  }>;
  
  topProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
  
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    orderCount: number;
  }>;
}

/**
 * Order workflow transition
 */
export interface OrderStatusTransition {
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  reason?: string;
  notes?: string;
  userId?: string; // Who made the transition
  timestamp: Date;
}

/**
 * Order payment information
 */
export interface OrderPayment extends AuditFields {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  gatewayResponse?: any;
  failureReason?: string;
  
  // Relations
  order?: Pick<Order, 'id' | 'orderNumber' | 'totalAmount'>;
}

/**
 * Order shipment information
 */
export interface OrderShipment extends AuditFields {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  method: string;
  cost: number;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  status: 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'failed';
  
  // Tracking events
  trackingEvents?: Array<{
    timestamp: Date;
    status: string;
    description: string;
    location?: string;
  }>;
}

/**
 * Order invoice
 */
export interface OrderInvoice extends AuditFields {
  id: string;
  orderId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate?: Date;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  
  // Company information
  companyName: string;
  companyAddress: Address;
  companyTax?: string;
  
  // Customer information
  customerName: string;
  customerAddress: Address;
  customerTax?: string;
}

/**
 * Order return/refund request
 */
export interface OrderReturn extends AuditFields {
  id: string;
  orderId: string;
  reason: 'defective' | 'wrong_item' | 'not_needed' | 'damaged' | 'other';
  description: string;
  status: 'requested' | 'approved' | 'rejected' | 'processing' | 'completed';
  
  items: Array<{
    orderItemId: string;
    quantity: number;
    reason: string;
  }>;
  
  refundAmount: number;
  refundMethod?: PaymentMethod;
  refundedAt?: Date;
  
  // Images for damage/defect claims
  images?: string[];
  
  // Staff notes
  staffNotes?: string;
  processedBy?: string;
}

/**
 * Order analytics data
 */
export interface OrderAnalytics {
  period: {
    from: Date;
    to: Date;
  };
  summary: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    conversionRate: number;
  };
  trends: {
    ordersGrowth: number;
    revenueGrowth: number;
    aovGrowth: number;
  };
  breakdown: {
    byDay: Array<{
      date: string;
      orders: number;
      revenue: number;
    }>;
    byStatus: Record<OrderStatus, number>;
    byPaymentMethod: Record<PaymentMethod, number>;
  };
}

/**
 * Order bulk operation request
 */
export interface OrderBulkOperation {
  action: 'updateStatus' | 'updatePaymentStatus' | 'cancel' | 'export';
  orderIds: string[];
  data?: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    reason?: string;
    [key: string]: any;
  };
}

/**
 * Order export options
 */
export interface OrderExportOptions {
  format: 'csv' | 'xlsx' | 'json' | 'pdf';
  fields?: string[];
  filters?: OrderFilters;
  includeItems?: boolean;
  includeCustomer?: boolean;
  includePayments?: boolean;
  includeShipments?: boolean;
}

/**
 * Order validation result
 */
export interface OrderValidationResult {
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
  stockIssues?: Array<{
    productId: string;
    productName: string;
    requested: number;
    available: number;
  }>;
}

/**
 * Order recommendation
 */
export interface OrderRecommendation {
  type: 'upsell' | 'cross_sell' | 'reorder';
  products: Array<{
    productId: string;
    productName: string;
    price: number;
    reason: string;
    confidence: number;
  }>;
  estimatedValue: number;
}

/**
 * Order workflow configuration
 */
export interface OrderWorkflowConfig {
  allowedTransitions: Record<OrderStatus, OrderStatus[]>;
  requiresApproval: OrderStatus[];
  autoTransitions: Array<{
    from: OrderStatus;
    to: OrderStatus;
    condition: string;
    delay?: number; // minutes
  }>;
  notifications: Record<OrderStatus, Array<{
    type: 'email' | 'sms' | 'push';
    template: string;
    recipients: Array<'customer' | 'admin' | 'warehouse'>;
  }>>;
}
