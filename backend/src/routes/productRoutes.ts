/**
 * Product Routes - Complete Product Management API
 * Comprehensive CRUD operations with advanced features
 */

import express, { Request, Response } from 'express';
import { ProductService, CreateProductRequest, UpdateProductRequest, ProductSearchOptions } from '../services/productService';
import { verifyToken } from '../middleware/auth';
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
  createProductSchema,
  updateProductSchema,
  paginationSchema,
  searchSchema
} from '../validation/schemas';
import Joi from 'joi';

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
// PUBLIC ROUTES (no authentication required)
// ==========================================

/**
 * GET /api/products
 * Get products with filtering and pagination (public access for catalog)
 */
router.get('/',
  validateQuery(paginationSchema, { allowUnknown: true }),
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        categoryId,
        status,
        inStock,
        lowStock,
        priceMin,
        priceMax,
        search,
        tags,
        supplier
      } = req.query;

      const options: ProductSearchOptions = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        filters: {
          categoryId: categoryId ? parseIntId(categoryId as string) : undefined,
          status: status as any,
          inStock: inStock === 'true',
          lowStock: lowStock === 'true',
          priceMin: priceMin ? Number(priceMin) : undefined,
          priceMax: priceMax ? Number(priceMax) : undefined,
          search: search as string,
          tags: tags ? (tags as string).split(',') : undefined,
          supplier: supplier as string
        }
      };

      const result = await ProductService.getProducts(options);

      res.json({
        success: true,
        data: result.products,
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
      logger.error('Error fetching products', {
        error: error.message,
        query: req.query
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching products',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/products/search
 * Advanced product search (public)
 */
router.get('/search',
  validateQuery(searchSchema, { allowUnknown: true }),
  async (req: Request, res: Response) => {
    try {
      const { q: query, page = 1, limit = 10 } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const options: ProductSearchOptions = {
        page: Number(page),
        limit: Number(limit)
      };

      const result = await ProductService.searchProducts(query, options);

      res.json({
        success: true,
        query,
        data: result.products,
        total: result.total
      });
    } catch (error: any) {
      logger.error('Error searching products', {
        error: error.message,
        query: req.query.q
      });
      
      res.status(500).json({
        success: false,
        message: 'Error searching products',
        error: error.message
      });
    }
  }
);

// ==========================================
// ANALYTICS AND REPORTING ROUTES (must come before /:id)
// ==========================================

/**
 * GET /api/products/stats
 * Get product statistics (Admin/Manager only)
 */
router.get('/stats',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check if user has permission to view analytics
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view analytics'
        });
      }

      const stats = await ProductService.getProductStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Error fetching product statistics', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching product statistics',
        error: error.message
      });
    }
  }
);

// ==========================================
// STOCK MANAGEMENT ROUTES (must come before /:id)
// ==========================================

/**
 * GET /api/products/stock/low
 * Get products with low stock (Admin/Manager only)
 */
router.get('/stock/low',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check if user has permission to view stock data
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view stock data'
        });
      }

      const products = await ProductService.getLowStockProducts();

      res.json({
        success: true,
        message: `Found ${products.length} products with low stock`,
        data: products
      });
    } catch (error: any) {
      logger.error('Error fetching low stock products', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching low stock products',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/products/stock/out
 * Get out of stock products (Admin/Manager only)
 */
router.get('/stock/out',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check if user has permission to view stock data
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view stock data'
        });
      }

      const products = await ProductService.getOutOfStockProducts();

      res.json({
        success: true,
        message: `Found ${products.length} out of stock products`,
        data: products
      });
    } catch (error: any) {
      logger.error('Error fetching out of stock products', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching out of stock products',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/products/:id
 * Get single product by ID (public)
 */
router.get('/:id',
  validateId(),
  async (req: Request, res: Response) => {
    try {
      const productId = parseIntId(req.params.id);
      const product = await ProductService.getProductById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error: any) {
      logger.error('Error fetching product', {
        error: error.message,
        productId: req.params.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching product',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/products/sku/:sku
 * Get product by SKU (public)
 */
router.get('/sku/:sku',
  async (req: Request, res: Response) => {
    try {
      const product = await ProductService.getProductBySku(req.params.sku);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error: any) {
      logger.error('Error fetching product by SKU', {
        error: error.message,
        sku: req.params.sku
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching product',
        error: error.message
      });
    }
  }
);

// ==========================================
// PROTECTED ROUTES (authentication required)
// ==========================================

/**
 * POST /api/products
 * Create new product (Admin/Manager only)
 */
router.post('/',
  verifyToken,
  sanitizeInput(),
  validateContentType(),
  validateBody(createProductSchema),
  async (req: Request, res: Response) => {
    try {
      // Check if user has permission to create products
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create products'
        });
      }

      const productData: CreateProductRequest = req.body;
      const userId = req.user?.userId;

      const product = await ProductService.createProduct(productData, userId);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error: any) {
      logger.error('Error creating product', {
        error: error.message,
        userId: req.user?.userId,
        productData: req.body
      });

      const statusCode = error.message.includes('already exists') ? 409 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Error creating product',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/products/:id
 * Update product (Admin/Manager only)
 */
router.put('/:id',
  verifyToken,
  validateId(),
  sanitizeInput(),
  validateContentType(),
  validateBody(updateProductSchema),
  async (req: Request, res: Response) => {
    try {
      // Check if user has permission to update products
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update products'
        });
      }

      const updateData: UpdateProductRequest = req.body;
      const userId = req.user?.userId;

      const product = await ProductService.updateProduct(parseIntId(req.params.id), updateData, userId);

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: product
      });
    } catch (error: any) {
      logger.error('Error updating product', {
        error: error.message,
        productId: req.params.id,
        userId: req.user?.userId
      });

      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('already exists') ? 409 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Error updating product',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/products/:id
 * Delete product (Admin only)
 */
router.delete('/:id',
  verifyToken,
  validateId(),
  async (req: Request, res: Response) => {
    try {
      // Check if user has permission to delete products
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete products'
        });
      }

      const userId = req.user?.userId;
      await ProductService.deleteProduct(parseIntId(req.params.id), userId);

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting product', {
        error: error.message,
        productId: req.params.id,
        userId: req.user?.userId
      });

      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Error deleting product',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/products/:id/stock
 * Update product stock (Admin/Manager only)
 */
router.post('/:id/stock',
  verifyToken,
  validateId(),
  validateBody(Joi.object({
    quantity: Joi.number().integer().min(1).required(),
    operation: Joi.string().valid('add', 'subtract').default('subtract')
  })),
  async (req: Request, res: Response) => {
    try {
      // Check if user has permission to manage stock
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to manage stock'
        });
      }

      const { quantity, operation } = req.body;
      const userId = req.user?.userId;

      const product = await ProductService.updateStock(
        parseIntId(req.params.id),
        quantity,
        operation,
        userId
      );

      res.json({
        success: true,
        message: `Stock ${operation === 'add' ? 'added' : 'subtracted'} successfully`,
        data: {
          productId: product.id,
          sku: product.sku,
          currentStock: product.stock,
          status: product.status
        }
      });
    } catch (error: any) {
      logger.error('Error updating stock', {
        error: error.message,
        productId: req.params.id,
        userId: req.user?.userId,
        operation: req.body.operation,
        quantity: req.body.quantity
      });

      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Error updating stock',
        error: error.message
      });
    }
  }
);

// ==========================================
// BULK OPERATIONS
// ==========================================

/**
 * POST /api/products/bulk/update-status
 * Bulk update product status (Admin only)
 */
router.post('/bulk/update-status',
  verifyToken,
  validateBody(Joi.object({
    productIds: Joi.array().items(Joi.string()).min(1).required(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK').required()
  })),
  async (req: Request, res: Response) => {
    try {
      // Check if user has admin permission
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for bulk operations'
        });
      }

      const { productIds, status } = req.body;
      const userId = req.user?.userId;

      // Update products in bulk
      const updatePromises = productIds.map((id: string) =>
        ProductService.updateProduct(parseIntId(id), { status }, userId)
      );

      const results = await Promise.allSettled(updatePromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logUtils.logUserAction(userId!, 'bulk_status_update', {
        totalProducts: productIds.length,
        successful,
        failed,
        newStatus: status
      });

      res.json({
        success: true,
        message: 'Bulk status update completed',
        data: {
          total: productIds.length,
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

// Error handling middleware
router.use(handleValidationErrors());

export default router;
