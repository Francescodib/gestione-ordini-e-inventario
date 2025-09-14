/**
 * Order Service with Prisma ORM
 * Comprehensive order management with workflow states and business logic
 */

import { Order, OrderItem, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger, logUtils } from '../config/logger';
import { ProductService } from './productService';
// Note: Order types are defined inline in this service for now
// Future migration: move to ../types/order.ts

/**
 * Interfaces for order operations
 */
export interface CreateOrderItemRequest {
  productId: string;
  quantity: number;
  unitPrice?: number; // Optional, will be fetched from product if not provided
}

export interface CreateOrderRequest {
  items: CreateOrderItemRequest[];
  shippingAddress: {
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
  };
  billingAddress?: {
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
  };
  notes?: string;
  currency?: string;
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  trackingNumber?: string;
  cancelReason?: string;
  notes?: string;
  shippingAddress?: any;
  billingAddress?: any;
}

export interface OrderWithDetails extends Order {
  items: Array<OrderItem & {
    product: {
      id: string;
      name: string;
      sku: string;
      price: number;
      stock: number;
      category: {
        id: string;
        name: string;
        slug: string;
      };
    };
  }>;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minTotal?: number;
  maxTotal?: number;
  search?: string; // Search in order number, customer name, email
  hasTracking?: boolean;
}

export interface OrderSearchOptions {
  page?: number;
  limit?: number;
  sortBy?: 'orderNumber' | 'totalAmount' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  filters?: OrderFilters;
  includeItems?: boolean;
  includeUser?: boolean;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    sku: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    orderCount: number;
  }>;
}

/**
 * Order Service class with comprehensive functionality
 */
export class OrderService {

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  /**
   * Create a new order
   */
  static async createOrder(orderData: CreateOrderRequest, userId: string): Promise<OrderWithDetails> {
    try {
      const startTime = Date.now();

      // Validate user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Validate and prepare order items
      const orderItems = [];
      let subtotal = 0;

      for (const item of orderData.items) {
        // Get product details
        const product = await ProductService.getProductById(item.productId);
        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        if (!product.isActive) {
          throw new Error(`Product ${product.name} is not available`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
        }

        const unitPrice = item.unitPrice || product.price;
        const itemTotal = unitPrice * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          productId: item.productId,
          name: product.name, // Store product name at time of order
          sku: product.sku,   // Store product SKU at time of order
          quantity: item.quantity,
          price: unitPrice,   // Price applied at time of order (could be different from product.price)
          totalPrice: itemTotal
        });
      }

      // Calculate costs and total
      const shippingCost = 0; // Default free shipping for now
      const taxAmount = 0;    // Default no tax for now
      const discountAmount = 0; // Default no discount for now
      const totalAmount = subtotal + shippingCost + taxAmount - discountAmount;

      // Generate unique order number
      const orderNumber = await this.generateOrderNumber();

      // Use billing address same as shipping if not provided
      const billingAddress = orderData.billingAddress || orderData.shippingAddress;

      // Create order with items in a transaction
      const order = await prisma.$transaction(async (tx) => {
        // Create the order
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            subtotal,
            shippingCost,
            taxAmount,
            discountAmount,
            totalAmount,
            currency: orderData.currency || 'EUR',
            shippingAddress: JSON.stringify(orderData.shippingAddress),
            billingAddress: JSON.stringify(billingAddress),
            notes: orderData.notes,
            items: {
              create: orderItems
            }
          },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    category: true
                  }
                }
              }
            },
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        });

        // Update product stock
        for (const item of orderItems) {
          await ProductService.updateStock(item.productId, item.quantity, 'subtract', userId);
        }

        return newOrder;
      });

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('CREATE', 'orders', duration);
      
      logUtils.logUserAction(userId, 'order_create', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        itemsCount: order.items.length
      });

      logger.info('Order created successfully', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId,
        totalAmount: order.totalAmount,
        duration
      });

      return order as OrderWithDetails;
    } catch (error: any) {
      logUtils.logDbOperation('CREATE', 'orders', undefined, error);
      logger.error('Order creation failed', {
        error: error.message,
        orderData: { ...orderData, userId },
        userId
      });
      throw error;
    }
  }

  /**
   * Get all orders with advanced filtering and pagination
   */
  static async getOrders(options: OrderSearchOptions = {}): Promise<{
    orders: OrderWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const startTime = Date.now();
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        filters = {},
        includeItems = true,
        includeUser = true
      } = options;

      // Build where clause from filters
      const whereClause: Prisma.OrderWhereInput = {
        status: filters.status,
        paymentStatus: filters.paymentStatus,
        userId: filters.userId,
      };

      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        whereClause.createdAt = {};
        if (filters.dateFrom) {
          whereClause.createdAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          whereClause.createdAt.lte = filters.dateTo;
        }
      }

      // Amount range filter
      if (filters.minTotal !== undefined || filters.maxTotal !== undefined) {
        whereClause.totalAmount = {};
        if (filters.minTotal !== undefined) {
          whereClause.totalAmount.gte = filters.minTotal;
        }
        if (filters.maxTotal !== undefined) {
          whereClause.totalAmount.lte = filters.maxTotal;
        }
      }

      // Tracking filter
      if (filters.hasTracking === true) {
        whereClause.trackingNumber = { not: null };
      } else if (filters.hasTracking === false) {
        whereClause.trackingNumber = null;
      }

      // Search filter
      if (filters.search) {
        whereClause.OR = [
          { orderNumber: { contains: filters.search, mode: 'insensitive' } },
          { 
            user: {
              OR: [
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } }
              ]
            }
          }
        ];
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build include clause
      const includeClause: Prisma.OrderInclude = {
        items: includeItems ? {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        } : false,
        user: includeUser ? {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        } : false
      };

      // Execute queries in parallel
      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          include: includeClause,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit
        }),
        prisma.order.count({ where: whereClause })
      ]);

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('SELECT', 'orders', duration);

      const totalPages = Math.ceil(total / limit);

      return {
        orders: orders as OrderWithDetails[],
        total,
        page,
        limit,
        totalPages
      };
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'orders', undefined, error);
      throw error;
    }
  }

  /**
   * Get order by ID with full details
   */
  static async getOrderById(id: string, userId?: string): Promise<OrderWithDetails | null> {
    try {
      const startTime = Date.now();

      const whereClause: Prisma.OrderWhereUniqueInput = { id };
      
      // If userId provided, ensure user can only access their own orders (unless admin)
      const additionalWhere: Prisma.OrderWhereInput = userId ? { userId } : {};
      
      const order = await prisma.order.findFirst({
        where: { ...whereClause, ...additionalWhere },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('SELECT', 'orders', duration);

      return order as OrderWithDetails;
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'orders', undefined, error);
      throw error;
    }
  }

  /**
   * Get order by order number
   */
  static async getOrderByNumber(orderNumber: string, userId?: string): Promise<OrderWithDetails | null> {
    try {
      const whereClause: any = { orderNumber };
      if (userId) {
        whereClause.userId = userId;
      }

      const order = await prisma.order.findFirst({
        where: whereClause,
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return order as OrderWithDetails;
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'orders', undefined, error);
      throw error;
    }
  }

  /**
   * Update order
   */
  static async updateOrder(id: string, updateData: UpdateOrderRequest, adminUserId?: string): Promise<OrderWithDetails> {
    try {
      const startTime = Date.now();

      // Check if order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!existingOrder) {
        throw new Error(`Order with ID ${id} not found`);
      }

      // Validate status transitions
      if (updateData.status) {
        this.validateStatusTransition(existingOrder.status, updateData.status);
      }

      // If cancelling order, restore stock
      if (updateData.status === OrderStatus.CANCELLED && existingOrder.status !== OrderStatus.CANCELLED) {
        await this.restoreOrderStock(existingOrder, adminUserId);
      }

      // Prepare update data
      const updatePayload: Prisma.OrderUpdateInput = {
        ...updateData,
        updatedAt: new Date(),
      };

      // Update the order
      const order = await prisma.order.update({
        where: { id },
        data: updatePayload,
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('UPDATE', 'orders', duration);

      if (adminUserId) {
        logUtils.logUserAction(adminUserId, 'order_update', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          changes: Object.keys(updateData),
          newStatus: updateData.status
        });
      }

      logger.info('Order updated successfully', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        adminUserId,
        changes: Object.keys(updateData),
        duration
      });

      return order as OrderWithDetails;
    } catch (error: any) {
      logUtils.logDbOperation('UPDATE', 'orders', undefined, error);
      logger.error('Order update failed', {
        error: error.message,
        orderId: id,
        adminUserId
      });
      throw error;
    }
  }

  /**
   * Cancel order (soft delete with stock restoration)
   */
  static async cancelOrder(id: string, reason: string, userId?: string): Promise<OrderWithDetails> {
    try {
      return await this.updateOrder(id, {
        status: OrderStatus.CANCELLED,
        cancelReason: reason
      }, userId);
    } catch (error: any) {
      throw error;
    }
  }

  // ==========================================
  // BUSINESS LOGIC HELPERS
  // ==========================================

  /**
   * Generate unique order number
   */
  private static async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    // Get today's order count for sequence
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const todayOrderCount = await prisma.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    });

    const sequence = (todayOrderCount + 1).toString().padStart(4, '0');
    return `ORD${year}${month}${day}${sequence}`;
  }

  /**
   * Validate order status transitions
   */
  private static validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [], // Final state
      [OrderStatus.CANCELLED]: [] // Final state
    };

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Restore stock when order is cancelled
   */
  private static async restoreOrderStock(order: Order & { items: OrderItem[] }, userId?: string): Promise<void> {
    try {
      for (const item of order.items) {
        await ProductService.updateStock(item.productId, item.quantity, 'add', userId);
      }

      logger.info('Stock restored for cancelled order', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        itemsCount: order.items.length
      });
    } catch (error: any) {
      logger.error('Failed to restore stock for cancelled order', {
        orderId: order.id,
        error: error.message
      });
      throw new Error('Failed to restore product stock');
    }
  }

  // ==========================================
  // ANALYTICS AND REPORTING
  // ==========================================

  /**
   * Get order statistics
   */
  static async getOrderStats(): Promise<OrderStats> {
    try {
      const startTime = Date.now();

      const [
        totalOrders,
        statusCounts,
        revenueStats,
        topProducts
      ] = await Promise.all([
        // Total orders count
        prisma.order.count(),
        
        // Orders by status
        prisma.order.groupBy({
          by: ['status'],
          _count: { status: true }
        }),
        
        // Revenue statistics
        prisma.order.aggregate({
          _sum: { totalAmount: true },
          _avg: { totalAmount: true },
          where: {
            status: { not: OrderStatus.CANCELLED }
          }
        }),
        
        // Top selling products
        prisma.orderItem.groupBy({
          by: ['productId'],
          _sum: {
            quantity: true,
            totalPrice: true
          },
          orderBy: {
            _sum: {
              totalPrice: 'desc'
            }
          },
          take: 10
        })
      ]);

      // Process status counts
      const statusMap = statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<OrderStatus, number>);

      // Get product details for top products
      const topProductsWithDetails = await Promise.all(
        topProducts.map(async (item) => {
          const product = await ProductService.getProductById(item.productId);
          return {
            productId: item.productId,
            productName: product?.name || 'Unknown Product',
            sku: product?.sku || 'N/A',
            totalQuantity: item._sum.quantity || 0,
            totalRevenue: item._sum.totalPrice || 0
          };
        })
      );

      // Get revenue by month (last 12 months)
      const monthlyRevenue = await this.getMonthlyRevenue();

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('AGGREGATE', 'orders', duration);

      return {
        totalOrders,
        pendingOrders: statusMap[OrderStatus.PENDING] || 0,
        processingOrders: statusMap[OrderStatus.PROCESSING] || 0,
        shippedOrders: statusMap[OrderStatus.SHIPPED] || 0,
        deliveredOrders: statusMap[OrderStatus.DELIVERED] || 0,
        cancelledOrders: statusMap[OrderStatus.CANCELLED] || 0,
        totalRevenue: revenueStats._sum.totalAmount || 0,
        averageOrderValue: revenueStats._avg.totalAmount || 0,
        topProducts: topProductsWithDetails,
        revenueByMonth: monthlyRevenue
      };
    } catch (error: any) {
      logUtils.logDbOperation('AGGREGATE', 'orders', undefined, error);
      throw error;
    }
  }

  /**
   * Get revenue by month for the last 12 months
   */
  private static async getMonthlyRevenue(): Promise<Array<{ month: string; revenue: number; orderCount: number; }>> {
    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthStats = await prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          createdAt: {
            gte: date,
            lt: nextMonth
          },
          status: { not: OrderStatus.CANCELLED }
        }
      });

      months.push({
        month: date.toLocaleDateString('it-IT', { year: 'numeric', month: 'short' }),
        revenue: monthStats._sum.totalAmount || 0,
        orderCount: monthStats._count.id || 0
      });
    }

    return months;
  }

  /**
   * Get user's orders
   */
  static async getUserOrders(userId: string, options: OrderSearchOptions = {}): Promise<{
    orders: OrderWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const searchOptions = {
      ...options,
      filters: {
        ...options.filters,
        userId
      }
    };

    return this.getOrders(searchOptions);
  }
}
