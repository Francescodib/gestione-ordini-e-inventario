/**
 * Order Routes - Complete Order Management API
 * Comprehensive CRUD operations with workflow states and business logic
 */

import express, { Request, Response } from 'express';
import { OrderService, CreateOrderRequest, UpdateOrderRequest, OrderSearchOptions } from '../services/orderService';
import { verifyToken, requireManagerOrAdmin, requireAdmin } from '../middleware/auth';
import { logger, logUtils } from '../config/logger';
import {
  validateBody,
  validateQuery,
  validateId,
  sanitizeInput,
  validateContentType,
  handleValidationErrors
} from '../middleware/validation';
import {
  createOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
  paginationSchema
} from '../validation/schemas';
import Joi from 'joi';
import { OrderStatus, PaymentStatus } from '../models';

// Initialize router
const router = express.Router();

// Helper function to parse string ID to number
const parseIntId = (id: string): number => {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error('Invalid ID format');
  }
  return parsed;
};

// ==========================================
// ADMIN/MANAGER ROUTES (protected)
// These must come before /:id route
// ==========================================

/**
 * GET /api/orders/stats
 * Get order statistics (Admin/Manager only)
 */
router.get('/stats',
  verifyToken,
  requireManagerOrAdmin,
  async (req: Request, res: Response) => {
    try {

      const stats = await OrderService.getOrderStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Error fetching order statistics', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching order statistics',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/orders/reports/revenue
 * Get revenue report (Admin/Manager only)
 */
router.get('/reports/revenue',
  verifyToken,
  requireManagerOrAdmin,
  validateQuery(Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    groupBy: Joi.string().valid('day', 'week', 'month').default('month')
  })),
  async (req: Request, res: Response) => {
    try {

      // For now, return basic stats
      // In a full implementation, you'd create specific revenue reporting logic
      const stats = await OrderService.getOrderStats();

      res.json({
        success: true,
        data: {
          totalRevenue: stats.totalRevenue,
          averageOrderValue: stats.averageOrderValue,
          revenueByMonth: stats.revenueByMonth,
          totalOrders: stats.totalOrders
        }
      });
    } catch (error: any) {
      logger.error('Error fetching revenue report', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching revenue report',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/orders/reports/products
 * Get product sales report (Admin/Manager only)
 */
router.get('/reports/products',
  verifyToken,
  requireManagerOrAdmin,
  async (req: Request, res: Response) => {
    try {

      const stats = await OrderService.getOrderStats();

      res.json({
        success: true,
        data: {
          topProducts: stats.topProducts,
          totalProducts: stats.topProducts.length
        }
      });
    } catch (error: any) {
      logger.error('Error fetching product sales report', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching product sales report',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/orders
 * Get all orders with filtering and pagination (Admin/Manager access)
 */
router.get('/',
  verifyToken,
  validateQuery(paginationSchema, { allowUnknown: true }),
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        paymentStatus,
        userId,
        dateFrom,
        dateTo,
        minTotal,
        maxTotal,
        search,
        hasTracking,
        includeItems,
        includeUser
      } = req.query;

      // For non-admin users, only show their own orders
      let finalUserId = userId as string;
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        finalUserId = req.user?.userId!;
      }

      const options: OrderSearchOptions = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        filters: {
          status: status as OrderStatus,
          paymentStatus: paymentStatus as PaymentStatus,
          userId: finalUserId ? parseIntId(finalUserId) : undefined,
          dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
          dateTo: dateTo ? new Date(dateTo as string) : undefined,
          minTotal: minTotal ? Number(minTotal) : undefined,
          maxTotal: maxTotal ? Number(maxTotal) : undefined,
          search: search as string,
          hasTracking: hasTracking !== undefined ? hasTracking === 'true' : undefined
        },
        includeItems: includeItems !== 'false',
        includeUser: includeUser !== 'false'
      };

      const result = await OrderService.getOrders(options);

      res.json({
        success: true,
        data: result.orders,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasNext: result.page < result.totalPages,
          hasPrev: result.page > 1
        }
      });
    } catch (error: any) {
      logger.error('Error fetching orders', {
        error: error.message,
        query: req.query,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching orders',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/orders/my
 * Get current user's orders (must come before /:id)
 */
router.get('/my',
  verifyToken,
  validateQuery(paginationSchema, { allowUnknown: true }),
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        paymentStatus,
        dateFrom,
        dateTo
      } = req.query;

      const userId = req.user?.userId!;

      const options: OrderSearchOptions = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        filters: {
          status: status as OrderStatus,
          paymentStatus: paymentStatus as PaymentStatus,
          dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
          dateTo: dateTo ? new Date(dateTo as string) : undefined
        },
        includeItems: true,
        includeUser: false
      };

      const result = await OrderService.getUserOrders(userId, options);

      res.json({
        success: true,
        data: result.orders,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasNext: result.page < result.totalPages,
          hasPrev: result.page > 1
        }
      });
    } catch (error: any) {
      logger.error('Error fetching user orders', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching your orders',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/orders/number/:orderNumber
 * Get order by order number
 */
router.get('/number/:orderNumber',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Non-admin users can only access their own orders
      const userId = (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') 
        ? req.user?.userId 
        : undefined;

      const order = await OrderService.getOrderByNumber(req.params.orderNumber, userId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error: any) {
      logger.error('Error fetching order by number', {
        error: error.message,
        orderNumber: req.params.orderNumber,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching order',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/orders
 * Create new order (Authenticated users)
 */
router.post('/',
  verifyToken,
  sanitizeInput(),
  validateContentType(),
  validateBody(createOrderSchema),
  async (req: Request, res: Response) => {
    try {
      const orderData: CreateOrderRequest = req.body;
      const userId = req.user?.userId!;

      const order = await OrderService.createOrder(orderData, userId);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order
      });
    } catch (error: any) {
      logger.error('Error creating order', {
        error: error.message,
        userId: req.user?.userId,
        orderData: req.body
      });

      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('not available') ? 400 :
                        error.message.includes('Insufficient stock') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Error creating order',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/orders/:id
 * Get single order by ID
 */
router.get('/:id',
  verifyToken,
  validateId(),
  async (req: Request, res: Response) => {
    try {
      // Non-admin users can only access their own orders
      const userId = (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') 
        ? req.user?.userId 
        : undefined;

      const order = await OrderService.getOrderById(parseIntId(req.params.id), userId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error: any) {
      logger.error('Error fetching order', {
        error: error.message,
        orderId: req.params.id,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching order',
        error: error.message
      });
    }
  }
);

// ==========================================
// ORDER MANAGEMENT ROUTES (Admin/Manager only)
// ==========================================

/**
 * PUT /api/orders/:id/status
 * Update order status (Admin/Manager only)
 */
router.put('/:id/status',
  verifyToken,
  requireManagerOrAdmin,
  validateId(),
  sanitizeInput(),
  validateContentType(),
  validateBody(updateOrderStatusSchema),
  async (req: Request, res: Response) => {
    try {

      const updateData: UpdateOrderRequest = req.body;
      const userId = req.user?.userId;

      const order = await OrderService.updateOrder(parseIntId(req.params.id), updateData, userId);

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: order
      });
    } catch (error: any) {
      logger.error('Error updating order status', {
        error: error.message,
        orderId: req.params.id,
        userId: req.user?.userId
      });

      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('Invalid status transition') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Error updating order status',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/orders/:id
 * Update order details (Admin/Manager only)
 */
router.put('/:id',
  verifyToken,
  requireManagerOrAdmin,
  validateId(),
  sanitizeInput(),
  validateContentType(),
  validateBody(updateOrderSchema),
  async (req: Request, res: Response) => {
    try {

      const updateData: UpdateOrderRequest = req.body;
      const userId = req.user?.userId;

      const order = await OrderService.updateOrder(parseIntId(req.params.id), updateData, userId);

      res.json({
        success: true,
        message: 'Order updated successfully',
        data: order
      });
    } catch (error: any) {
      logger.error('Error updating order', {
        error: error.message,
        orderId: req.params.id,
        userId: req.user?.userId
      });

      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Error updating order',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/orders/:id/cancel
 * Cancel order (Users can cancel their own, Admin/Manager can cancel any)
 */
router.post('/:id/cancel',
  verifyToken,
  validateId(),
  validateBody(Joi.object({
    reason: Joi.string().min(10).max(500).required()
  })),
  async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      const userId = req.user?.userId!;

      // Check if user can cancel this order
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        // Regular users can only cancel their own orders
        const order = await OrderService.getOrderById(parseIntId(req.params.id), userId);
        if (!order) {
          return res.status(404).json({
            success: false,
            message: 'Order not found or access denied'
          });
        }

        // Users can only cancel pending orders
        if (order.status !== OrderStatus.PENDING) {
          return res.status(400).json({
            success: false,
            message: 'Only pending orders can be cancelled by users'
          });
        }
      }

      const order = await OrderService.cancelOrder(parseIntId(req.params.id), reason, userId);

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: order
      });
    } catch (error: any) {
      logger.error('Error cancelling order', {
        error: error.message,
        orderId: req.params.id,
        userId: req.user?.userId,
        reason: req.body.reason
      });

      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('Invalid status transition') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Error cancelling order',
        error: error.message
      });
    }
  }
);


// ==========================================
// BULK OPERATIONS (Admin only)
// ==========================================

/**
 * POST /api/orders/bulk/update-status
 * Bulk update order status (Admin only)
 */
router.post('/bulk/update-status',
  verifyToken,
  requireAdmin,
  validateBody(Joi.object({
    orderIds: Joi.array().items(Joi.string()).min(1).required(),
    status: Joi.string().valid(...Object.values(OrderStatus)).required(),
    paymentStatus: Joi.string().valid(...Object.values(PaymentStatus)).optional()
  })),
  async (req: Request, res: Response) => {
    try {

      const { orderIds, status, paymentStatus } = req.body;
      const userId = req.user?.userId;

      // Update orders in bulk
      const updatePromises = orderIds.map((id: string) =>
        OrderService.updateOrder(parseIntId(id), { status, paymentStatus }, userId)
      );

      const results = await Promise.allSettled(updatePromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (userId) {
        logUtils.logUserAction(userId, 'bulk_order_status_update', {
          totalOrders: orderIds.length,
          successful,
          failed,
          newStatus: status
        });
      }

      res.json({
        success: true,
        message: 'Bulk status update completed',
        data: {
          total: orderIds.length,
          successful,
          failed,
          status
        }
      });
    } catch (error: any) {
      logger.error('Error in bulk status update', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Error in bulk status update',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/orders/:id
 * Delete an order (admin only)
 */
router.delete('/:id',
  verifyToken,
  requireAdmin,
  validateId(),
  async (req: Request, res: Response) => {
    try {
      logger.info('DELETE order request received', { orderId: req.params.id });

      const orderId = parseIntId(req.params.id);
      const adminUserId = req.user.userId;

      logger.info('Starting order deletion process', { orderId, adminUserId });
      logUtils.logDbOperation('DELETE', 'orders', orderId);

      logger.info('Calling OrderService.deleteOrder');
      await OrderService.deleteOrder(orderId, adminUserId);
      logger.info('OrderService.deleteOrder completed');

      logger.info('Order deletion completed', {
        orderId,
        adminUserId,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Order deleted successfully'
      });

    } catch (error: any) {
      logger.error('Error deleting order', {
        error: error.message,
        orderId: req.params.id,
        userId: req.user?.userId
      });

      const statusCode = error.message.includes('not found') ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        message: 'Error deleting order',
        error: error.message
      });
    }
  }
);

// Error handling middleware
router.use(handleValidationErrors());

export default router;
