/**
 * Order Service with Sequelize ORM
 * Comprehensive order management with workflow states and business logic
 */

import { Order, OrderItem, OrderStatus, PaymentStatus, User, Product, Category } from '../models';
import { sequelize } from '../config/database';
import { logger, logUtils } from '../config/logger';
import { ProductService } from './productService';
import { getNotificationService } from './notificationService';
import { AddressUtils, type OrderAddress, type StandardOrderRequest } from '../types/orderAddress';
import { Op, Transaction, WhereOptions, FindOptions, Includeable } from 'sequelize';
// Note: Order types are defined inline in this service for now
// Future migration: move to ../types/order.ts

/**
 * Interfaces for order operations
 */
export interface CreateOrderItemRequest {
  productId: number;
  quantity: number;
  unitPrice?: number; // Optional, will be fetched from product if not provided
}

export interface CreateOrderRequest {
  items: CreateOrderItemRequest[];
  shippingAddress: OrderAddress;
  billingAddress?: OrderAddress;
  notes?: string;
  currency?: string;
}

export interface UpdateOrderItemRequest {
  id?: number;
  productId: number;
  quantity: number;
  price?: number;
  totalPrice?: number;
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  trackingNumber?: string;
  cancelReason?: string;
  notes?: string;
  shippingAddress?: any;
  billingAddress?: any;
  subtotal?: number;
  totalAmount?: number;
  items?: UpdateOrderItemRequest[];
}

export interface OrderWithDetails extends Order {
  items?: Array<OrderItem & {
    product?: {
      id: number;
      name: string;
      sku: string;
      price: number;
      stock: number;
      category?: {
        id: number;
        name: string;
        slug: string;
      };
    };
  }>;
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  userId?: number;
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
    productId: number;
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
  recent: Array<{
    id: number;
    orderNumber: string;
    status: OrderStatus;
    totalAmount: number;
    createdAt: string;
    user?: {
      id: number;
      firstName: string;
      lastName: string;
    };
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
  static async createOrder(orderData: CreateOrderRequest, userId: number): Promise<OrderWithDetails> {
    const transaction = await sequelize.transaction();
    try {
      const startTime = Date.now();

      // Validate user exists
      const user = await User.findByPk(userId, { transaction });

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Validate and prepare order items
      const orderItems = [];
      let subtotal = 0;

      for (const item of orderData.items) {
        // Get product details
        const product = await ProductService.getProductById(item.productId, transaction);
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

      // Validate addresses using AddressUtils
      if (!AddressUtils.validate(orderData.shippingAddress)) {
        throw new Error('Invalid shipping address format');
      }

      if (orderData.billingAddress && !AddressUtils.validate(orderData.billingAddress)) {
        throw new Error('Invalid billing address format');
      }

      // Create the order
      const newOrder = await Order.create({
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
        shippingAddress: AddressUtils.toJson(orderData.shippingAddress),
        billingAddress: AddressUtils.toJson(billingAddress),
        notes: orderData.notes,
      }, { transaction });

      // Create order items
      const createdItems = await OrderItem.bulkCreate(
        orderItems.map(item => ({ ...item, orderId: newOrder.id })),
        { transaction }
      );

      // Update product stock
      for (const item of orderItems) {
        await ProductService.updateStock(item.productId, item.quantity, 'subtract', userId, transaction);
      }

      await transaction.commit();

      // Fetch the complete order with associations
      const order = await Order.findByPk(newOrder.id, {
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                include: [
                  {
                    model: Category,
                    as: 'category'
                  }
                ]
              }
            ]
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'firstName', 'lastName']
          }
        ]
      });

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('CREATE', 'orders', duration);
      
      logUtils.logUserAction(userId, 'order_create', {
        orderId: order!.id,
        orderNumber: order!.orderNumber,
        totalAmount: order!.totalAmount,
        itemsCount: createdItems.length
      });

      logger.info('Order created successfully', {
        orderId: order!.id,
        orderNumber: order!.orderNumber,
        userId,
        totalAmount: order!.totalAmount,
        duration
      });

      // Send real-time notification for new order
      const notificationService = getNotificationService();
      if (notificationService && order!.user) {
        const customerName = `${order!.user.firstName} ${order!.user.lastName}`;
        notificationService.notifyNewOrder(
          order!.id,
          customerName,
          order!.totalAmount
        );
      }

      return order as OrderWithDetails;
    } catch (error: any) {
      await transaction.rollback();
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
      const whereClause: WhereOptions = {};
      
      if (filters.status) {
        whereClause.status = filters.status;
      }
      if (filters.paymentStatus) {
        whereClause.paymentStatus = filters.paymentStatus;
      }
      if (filters.userId) {
        whereClause.userId = filters.userId;
      }

      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        whereClause.createdAt = {};
        if (filters.dateFrom) {
          whereClause.createdAt[Op.gte] = filters.dateFrom;
        }
        if (filters.dateTo) {
          whereClause.createdAt[Op.lte] = filters.dateTo;
        }
      }

      // Amount range filter
      if (filters.minTotal !== undefined || filters.maxTotal !== undefined) {
        whereClause.totalAmount = {};
        if (filters.minTotal !== undefined) {
          whereClause.totalAmount[Op.gte] = filters.minTotal;
        }
        if (filters.maxTotal !== undefined) {
          whereClause.totalAmount[Op.lte] = filters.maxTotal;
        }
      }

      // Tracking filter
      if (filters.hasTracking === true) {
        whereClause.trackingNumber = { [Op.not]: null };
      } else if (filters.hasTracking === false) {
        whereClause.trackingNumber = null;
      }

      // Search filter
      if (filters.search && filters.search.trim()) {
        const trimmedSearch = filters.search.trim();
        const normalizedSearch = trimmedSearch.toLowerCase();
        whereClause[Op.or] = [
          sequelize.where(
            sequelize.fn('lower', sequelize.col('orderNumber')),
            { [Op.like]: `%${normalizedSearch}%` }
          ),
          sequelize.where(
            sequelize.fn('lower', sequelize.col('user.firstName')),
            { [Op.like]: `%${normalizedSearch}%` }
          ),
          sequelize.where(
            sequelize.fn('lower', sequelize.col('user.lastName')),
            { [Op.like]: `%${normalizedSearch}%` }
          ),
          sequelize.where(
            sequelize.fn('lower', sequelize.col('user.email')),
            { [Op.like]: `%${normalizedSearch}%` }
          )
        ];
      }

      // Calculate pagination
      const offset = (page - 1) * limit;

      // Build include clause
      const includeClause: Includeable[] = [];
      
      if (includeItems) {
        includeClause.push({
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              include: [
                {
                  model: Category,
                  as: 'category'
                }
              ]
            }
          ]
        });
      }
      
      if (includeUser) {
        includeClause.push({
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName']
        });
      }

      // Execute queries in parallel
      const [orders, total] = await Promise.all([
        Order.findAll({
          where: whereClause,
          include: includeClause,
          order: [[sortBy, sortOrder.toUpperCase()]],
          offset,
          limit
        }),
        Order.count({ 
          where: whereClause,
          include: filters.search ? [{
            model: User,
            as: 'user',
            attributes: []
          }] : undefined
        })
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
  static async getOrderById(id: number, userId?: number): Promise<OrderWithDetails | null> {
    try {
      const startTime = Date.now();

      const whereClause: WhereOptions = { id };
      
      // If userId provided, ensure user can only access their own orders (unless admin)
      if (userId) {
        whereClause.userId = userId;
      }
      
      const order = await Order.findOne({
        where: whereClause,
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                include: [
                  {
                    model: Category,
                    as: 'category'
                  }
                ]
              }
            ]
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'firstName', 'lastName']
          }
        ]
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
  static async getOrderByNumber(orderNumber: string, userId?: number): Promise<OrderWithDetails | null> {
    try {
      const whereClause: WhereOptions = { orderNumber };
      if (userId) {
        whereClause.userId = userId;
      }

      const order = await Order.findOne({
        where: whereClause,
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                include: [
                  {
                    model: Category,
                    as: 'category'
                  }
                ]
              }
            ]
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'firstName', 'lastName']
          }
        ]
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
  static async updateOrder(id: number, updateData: UpdateOrderRequest, adminUserId?: number): Promise<OrderWithDetails> {
    const transaction = await sequelize.transaction();
    try {
      const startTime = Date.now();

      // Check if order exists
      const existingOrder = await Order.findByPk(id, {
        include: [
          {
            model: OrderItem,
            as: 'items'
          }
        ],
        transaction
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

      // Handle items update if provided
      if (updateData.items) {
        // Get existing items
        const existingItems = await OrderItem.findAll({
          where: { orderId: id },
          transaction
        });

        // Update or create items
        for (const itemData of updateData.items) {
          if (itemData.id) {
            // Update existing item
            await OrderItem.update({
              quantity: itemData.quantity,
              unitPrice: itemData.price,
              totalPrice: itemData.totalPrice || (itemData.price! * itemData.quantity)
            }, {
              where: { id: itemData.id, orderId: id },
              transaction
            });
          } else {
            // Create new item
            await OrderItem.create({
              orderId: id,
              productId: itemData.productId,
              quantity: itemData.quantity,
              unitPrice: itemData.price || 0,
              totalPrice: itemData.totalPrice || (itemData.price! * itemData.quantity),
              sku: `SKU-${itemData.productId}` // Simplified SKU generation
            }, { transaction });
          }
        }

        // Remove items that are no longer in the update
        const updatedItemIds = updateData.items.filter(item => item.id).map(item => item.id!);
        const itemsToDelete = existingItems.filter(item => !updatedItemIds.includes(item.id));

        for (const itemToDelete of itemsToDelete) {
          await itemToDelete.destroy({ transaction });
        }
      }

      // Prepare update data (exclude items and userId as they're handled separately)
      // IMPORTANT: Never allow userId to be updated - preserve original customer
      const { items, userId, ...updatePayload } = {
        ...updateData,
        updatedAt: new Date(),
      };

      // Capture original statuses before update for notifications
      const originalStatus = existingOrder.status;
      const originalPaymentStatus = existingOrder.paymentStatus;

      // Update the order
      logger.info('About to update order', { orderId: id, updatePayload, oldStatus: existingOrder.status });
      await existingOrder.update(updatePayload, { transaction });
      logger.info('Order updated in database', { orderId: id, newStatus: updatePayload.status });

      await transaction.commit();

      // Fetch updated order with associations
      const order = await Order.findByPk(id, {
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                include: [
                  {
                    model: Category,
                    as: 'category'
                  }
                ]
              }
            ]
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'firstName', 'lastName']
          }
        ]
      });

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('UPDATE', 'orders', duration);

      if (adminUserId) {
        logUtils.logUserAction(adminUserId, 'order_update', {
          orderId: order!.id,
          orderNumber: order!.orderNumber,
          changes: Object.keys(updateData),
          newStatus: updateData.status
        });
      }

      logger.info('Order updated successfully', {
        orderId: order!.id,
        orderNumber: order!.orderNumber,
        adminUserId,
        changes: Object.keys(updateData),
        duration
      });

      // Send real-time notification for status changes
      const notificationService = getNotificationService();
      if (notificationService) {
        if (updateData.status && updateData.status !== originalStatus) {
          await notificationService.notifyOrderStatusChange(
            order!.id,
            originalStatus,
            updateData.status,
            order!.userId
          );
        }

        // Send notification for payment status changes
        if (updateData.paymentStatus && updateData.paymentStatus !== originalPaymentStatus) {
          await notificationService.notifyPaymentStatusChange(
            order!.id,
            originalPaymentStatus,
            updateData.paymentStatus,
            order!.userId
          );
        }
      }

      return order as OrderWithDetails;
    } catch (error: any) {
      await transaction.rollback();
      logUtils.logDbOperation('UPDATE', 'orders', undefined, error);
      logger.error('Order update failed', {
        error: error.message,
        errorStack: error.stack,
        errorName: error.name,
        orderId: id,
        adminUserId,
        updateData: JSON.stringify(updateData, null, 2)
      });
      console.error('DETAILED ORDER UPDATE ERROR:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        updateData
      });
      throw error;
    }
  }

  /**
   * Cancel order (soft delete with stock restoration)
   */
  static async cancelOrder(id: number, reason: string, userId?: number): Promise<OrderWithDetails> {
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
    
    const todayOrderCount = await Order.count({
      where: {
        createdAt: {
          [Op.gte]: startOfDay,
          [Op.lt]: endOfDay
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
    // Allow no-op transitions (same status)
    if (currentStatus === newStatus) {
      return;
    }

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [OrderStatus.RETURNED], // Can be returned
      [OrderStatus.CANCELLED]: [], // Final state
      [OrderStatus.RETURNED]: [] // Final state
    };

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Restore stock when order is cancelled
   */
  private static async restoreOrderStock(order: Order & { items?: OrderItem[] }, userId?: number): Promise<void> {
    try {
      if (order.items) {
        for (const item of order.items) {
          await ProductService.updateStock(item.productId, item.quantity, 'add', userId);
        }
      }

      logger.info('Stock restored for cancelled order', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        itemsCount: order.items?.length || 0
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
        topProducts,
        recentOrders
      ] = await Promise.all([
        // Total orders count
        Order.count(),
        
        // Orders by status
        Order.findAll({
          attributes: [
            'status',
            [sequelize.fn('COUNT', sequelize.col('status')), 'count']
          ],
          group: ['status'],
          raw: true
        }),
        
        // Revenue statistics
        Order.findAll({
          attributes: [
            [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue'],
            [sequelize.fn('AVG', sequelize.col('totalAmount')), 'averageOrderValue']
          ],
          where: {
            status: { [Op.not]: OrderStatus.CANCELLED }
          },
          raw: true
        }),
        
        // Top selling products
        OrderItem.findAll({
          attributes: [
            'productId',
            [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
            [sequelize.fn('SUM', sequelize.col('totalPrice')), 'totalRevenue']
          ],
          group: ['productId'],
          order: [[sequelize.fn('SUM', sequelize.col('totalPrice')), 'DESC']],
          limit: 10,
          raw: true
        }),

        // Recent orders (last 10)
        Order.findAll({
          order: [['createdAt', 'DESC']],
          limit: 10,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName']
            }
          ]
        })
      ]);

      // Process status counts
      const statusMap = (statusCounts as any[]).reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {} as Record<OrderStatus, number>);

      // Process revenue stats
      const revenueData = revenueStats[0] as any;
      const totalRevenue = parseFloat(revenueData?.totalRevenue || '0');
      const averageOrderValue = parseFloat(revenueData?.averageOrderValue || '0');

      // Get product details for top products
      const topProductsWithDetails = await Promise.all(
        (topProducts as any[]).map(async (item) => {
          const product = await ProductService.getProductById(item.productId);
          return {
            productId: item.productId,
            productName: product?.name || 'Unknown Product',
            sku: product?.sku || 'N/A',
            totalQuantity: parseInt(item.totalQuantity || '0'),
            totalRevenue: parseFloat(item.totalRevenue || '0')
          };
        })
      );

      // Process recent orders
      const recentOrdersFormatted = recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt.toISOString(),
        user: order.user ? {
          id: order.user.id,
          firstName: order.user.firstName,
          lastName: order.user.lastName
        } : undefined
      }));

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
        totalRevenue,
        averageOrderValue,
        topProducts: topProductsWithDetails,
        revenueByMonth: monthlyRevenue,
        recent: recentOrdersFormatted
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
      
      const monthStats = await Order.findAll({
        attributes: [
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount']
        ],
        where: {
          createdAt: {
            [Op.gte]: date,
            [Op.lt]: nextMonth
          },
          status: { [Op.not]: OrderStatus.CANCELLED }
        },
        raw: true
      });

      const stats = monthStats[0] as any;
      months.push({
        month: date.toLocaleDateString('it-IT', { year: 'numeric', month: 'short' }),
        revenue: parseFloat(stats?.revenue || '0'),
        orderCount: parseInt(stats?.orderCount || '0')
      });
    }

    return months;
  }

  /**
   * Get user's orders
   */
  static async getUserOrders(userId: number, options: OrderSearchOptions = {}): Promise<{
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

  /**
   * Delete an order (admin only)
   */
  static async deleteOrder(id: number, adminUserId?: number): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      // Find the order with all its related data
      const order = await Order.findByPk(id, {
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product'
              }
            ]
          }
        ],
        transaction
      });

      if (!order) {
        throw new Error(`Order with ID ${id} not found`);
      }

      // Restore stock for all items in the order
      if (order.items) {
        for (const item of order.items) {
          if (item.product) {
            const currentStock = item.product.stock || 0;
            const newStock = currentStock + item.quantity;

            await Product.update(
              { stock: newStock },
              {
                where: { id: item.productId },
                transaction
              }
            );

            logger.info('Stock restored for product', {
              productId: item.productId,
              productName: item.product.name,
              previousStock: currentStock,
              restoredQuantity: item.quantity,
              newStock: newStock
            });
          }
        }
      }

      // Delete order items first (foreign key constraint)
      await OrderItem.destroy({
        where: { orderId: id },
        transaction
      });

      // Delete the order
      await Order.destroy({
        where: { id },
        transaction
      });

      await transaction.commit();

      logger.info('Order deleted successfully', {
        orderId: id,
        orderNumber: order.orderNumber,
        adminUserId,
        itemsCount: order.items?.length || 0
      });

    } catch (error: any) {
      await transaction.rollback();
      logger.error('Order deletion failed', {
        error: error.message,
        orderId: id,
        adminUserId
      });
      throw error;
    }
  }
}
