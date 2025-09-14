/**
 * Search Routes - Advanced Search API
 * Unified search across all entities with intelligent filtering
 */

import express, { Request, Response } from 'express';
import { SearchService, GlobalSearchOptions, EntitySearchOptions } from '../services/searchService';
import { verifyToken } from '../middleware/auth';
import { logger, logUtils } from '../config/logger';
import {
  validateQuery,
  sanitizeInput,
  handleValidationErrors
} from '../middleware/validation';
import Joi from 'joi';

// Initialize router
const router = express.Router();

// ==========================================
// GLOBAL SEARCH ROUTES
// ==========================================

/**
 * GET /api/search
 * Global unified search across all entities
 */
router.get('/',
  validateQuery(Joi.object({
    q: Joi.string().min(1).max(100).required()
      .messages({
        'string.empty': 'Search query is required',
        'string.min': 'Search query must be at least 1 character',
        'string.max': 'Search query cannot exceed 100 characters'
      }),
    entities: Joi.string().pattern(/^(products|categories|orders|users)(,(products|categories|orders|users))*$/)
      .default('products,categories'),
    limit: Joi.number().integer().min(1).max(100).default(20),
    page: Joi.number().integer().min(1).default(1),
    sortBy: Joi.string().valid('relevance', 'date', 'name', 'price').default('relevance'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    // Filters
    'price.min': Joi.number().min(0).optional(),
    'price.max': Joi.number().min(0).optional(),
    categoryIds: Joi.string().optional(), // comma-separated IDs
    status: Joi.string().optional(), // comma-separated statuses
    'date.from': Joi.date().optional(),
    'date.to': Joi.date().optional(),
    inStock: Joi.boolean().optional(),
    isActive: Joi.boolean().optional()
  }), { allowUnknown: true }),
  async (req: Request, res: Response) => {
    try {
      const {
        q: query,
        entities: entitiesStr = 'products,categories',
        limit = 20,
        page = 1,
        sortBy = 'relevance',
        sortOrder = 'desc',
        categoryIds,
        status,
        inStock,
        isActive
      } = req.query;

      const entities = (entitiesStr as string).split(',').filter(e => 
        ['products', 'categories', 'orders', 'users'].includes(e)
      ) as ('products' | 'categories' | 'orders' | 'users')[];

      // Build filters object
      const filters: any = {};

      // Price range filter
      if (req.query['price.min'] || req.query['price.max']) {
        filters.priceRange = {
          min: req.query['price.min'] ? Number(req.query['price.min']) : undefined,
          max: req.query['price.max'] ? Number(req.query['price.max']) : undefined
        };
      }

      // Category filter
      if (categoryIds) {
        filters.categoryIds = (categoryIds as string).split(',');
      }

      // Status filter
      if (status) {
        filters.status = (status as string).split(',');
      }

      // Date range filter
      if (req.query['date.from'] || req.query['date.to']) {
        filters.dateRange = {
          from: req.query['date.from'] ? new Date(req.query['date.from'] as string) : undefined,
          to: req.query['date.to'] ? new Date(req.query['date.to'] as string) : undefined
        };
      }

      // Stock and active filters
      if (inStock !== undefined) filters.inStock = inStock === 'true';
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const searchOptions: GlobalSearchOptions = {
        query: query as string,
        entities,
        limit: Number(limit),
        page: Number(page),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        filters,
        userId: req.user?.userId,
        userRole: req.user?.role
      };

      const results = await SearchService.globalSearch(searchOptions);

      // Log search activity
      if (req.user?.userId) {
        logUtils.logUserAction(req.user.userId, 'global_search', {
          query: query as string,
          entities,
          totalResults: results.total,
          searchTime: results.searchTime
        });
      }

      res.json({
        success: true,
        data: results
      });

    } catch (error: any) {
      logger.error('Global search failed', {
        error: error.message,
        query: req.query,
        userId: req.user?.userId
      });

      const statusCode = error.message.includes('required') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Search failed',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/search/suggestions
 * Get search suggestions based on partial query
 */
router.get('/suggestions',
  validateQuery(Joi.object({
    q: Joi.string().min(1).max(50).required(),
    type: Joi.string().valid('products', 'categories', 'all').default('all')
  })),
  async (req: Request, res: Response) => {
    try {
      const { q: query, type } = req.query;

      const suggestions = type === 'all' 
        ? await SearchService.generateSuggestions(query as string)
        : await SearchService.getAutocomplete(query as string, type as string);

      res.json({
        success: true,
        data: {
          query: query as string,
          suggestions
        }
      });

    } catch (error: any) {
      logger.error('Search suggestions failed', {
        error: error.message,
        query: req.query
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to get suggestions',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/search/autocomplete
 * Real-time autocomplete for search input
 */
router.get('/autocomplete',
  validateQuery(Joi.object({
    q: Joi.string().min(2).max(50).required(),
    type: Joi.string().valid('products', 'categories').optional()
  })),
  async (req: Request, res: Response) => {
    try {
      const { q: query, type } = req.query;

      const suggestions = await SearchService.getAutocomplete(
        query as string, 
        type as string
      );

      res.json({
        success: true,
        data: suggestions
      });

    } catch (error: any) {
      logger.error('Autocomplete failed', {
        error: error.message,
        query: req.query
      });
      
      res.status(500).json({
        success: false,
        message: 'Autocomplete failed',
        error: error.message
      });
    }
  }
);

// ==========================================
// ENTITY-SPECIFIC SEARCH ROUTES
// ==========================================

/**
 * GET /api/search/products
 * Advanced product search with detailed filtering
 */
router.get('/products',
  validateQuery(Joi.object({
    q: Joi.string().min(1).max(100).required(),
    limit: Joi.number().integer().min(1).max(50).default(10),
    page: Joi.number().integer().min(1).default(1),
    sortBy: Joi.string().valid('relevance', 'price', 'name', 'date').default('relevance'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    'price.min': Joi.number().min(0).optional(),
    'price.max': Joi.number().min(0).optional(),
    categoryIds: Joi.string().optional(),
    status: Joi.string().optional(),
    inStock: Joi.boolean().optional(),
    includeRelated: Joi.boolean().default(false)
  }), { allowUnknown: true }),
  async (req: Request, res: Response) => {
    try {
      const {
        q: query,
        limit = 10,
        page = 1,
        sortBy = 'relevance',
        sortOrder = 'desc',
        categoryIds,
        status,
        inStock,
        includeRelated = false
      } = req.query;

      // Build filters
      const filters: any = {};
      
      if (req.query['price.min'] || req.query['price.max']) {
        filters.priceRange = {
          min: req.query['price.min'] ? Number(req.query['price.min']) : undefined,
          max: req.query['price.max'] ? Number(req.query['price.max']) : undefined
        };
      }

      if (categoryIds) filters.categoryIds = (categoryIds as string).split(',');
      if (status) filters.status = (status as string).split(',');
      if (inStock !== undefined) filters.inStock = inStock === 'true';

      const searchOptions: EntitySearchOptions = {
        query: query as string,
        limit: Number(limit),
        page: Number(page),
        sortBy: sortBy as string,
        sortOrder: sortOrder as any,
        filters,
        includeRelated: includeRelated === 'true'
      };

      const result = await SearchService.searchProducts(searchOptions);

      res.json({
        success: true,
        data: result.products,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
          hasNext: result.page < Math.ceil(result.total / result.limit),
          hasPrev: result.page > 1
        }
      });

    } catch (error: any) {
      logger.error('Product search failed', {
        error: error.message,
        query: req.query
      });
      
      res.status(500).json({
        success: false,
        message: 'Product search failed',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/search/categories
 * Advanced category search with hierarchy
 */
router.get('/categories',
  validateQuery(Joi.object({
    q: Joi.string().min(1).max(100).required(),
    limit: Joi.number().integer().min(1).max(50).default(10),
    page: Joi.number().integer().min(1).default(1),
    sortBy: Joi.string().valid('relevance', 'name', 'date').default('relevance'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    includeRelated: Joi.boolean().default(false)
  })),
  async (req: Request, res: Response) => {
    try {
      const {
        q: query,
        limit = 10,
        page = 1,
        sortBy = 'relevance',
        sortOrder = 'desc',
        includeRelated = false
      } = req.query;

      const searchOptions: EntitySearchOptions = {
        query: query as string,
        limit: Number(limit),
        page: Number(page),
        sortBy: sortBy as string,
        sortOrder: sortOrder as any,
        includeRelated: includeRelated === 'true'
      };

      const result = await SearchService.searchCategories(searchOptions);

      res.json({
        success: true,
        data: result.categories,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
          hasNext: result.page < Math.ceil(result.total / result.limit),
          hasPrev: result.page > 1
        }
      });

    } catch (error: any) {
      logger.error('Category search failed', {
        error: error.message,
        query: req.query
      });
      
      res.status(500).json({
        success: false,
        message: 'Category search failed',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/search/orders
 * Search orders (Admin/Manager only)
 */
router.get('/orders',
  verifyToken,
  validateQuery(Joi.object({
    q: Joi.string().min(1).max(100).required(),
    limit: Joi.number().integer().min(1).max(50).default(10),
    page: Joi.number().integer().min(1).default(1),
    sortBy: Joi.string().valid('relevance', 'date', 'total').default('date'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    status: Joi.string().optional(),
    'date.from': Joi.date().optional(),
    'date.to': Joi.date().optional()
  })),
  async (req: Request, res: Response) => {
    try {
      // Check permissions
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to search orders'
        });
      }

      const {
        q: query,
        limit = 10,
        page = 1,
        sortBy = 'date',
        sortOrder = 'desc',
        status
      } = req.query;

      // Build filters
      const filters: any = {};
      
      if (status) filters.status = (status as string).split(',');
      
      if (req.query['date.from'] || req.query['date.to']) {
        filters.dateRange = {
          from: req.query['date.from'] ? new Date(req.query['date.from'] as string) : undefined,
          to: req.query['date.to'] ? new Date(req.query['date.to'] as string) : undefined
        };
      }

      const searchOptions: EntitySearchOptions = {
        query: query as string,
        limit: Number(limit),
        page: Number(page),
        sortBy: sortBy as string,
        sortOrder: sortOrder as any,
        filters,
        userId: req.user?.role === 'ADMIN' ? undefined : req.user?.userId
      };

      const result = await SearchService.searchOrders(searchOptions);

      res.json({
        success: true,
        data: result.orders,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
          hasNext: result.page < Math.ceil(result.total / result.limit),
          hasPrev: result.page > 1
        }
      });

    } catch (error: any) {
      logger.error('Order search failed', {
        error: error.message,
        query: req.query,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Order search failed',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/search/users
 * Search users (Admin only)
 */
router.get('/users',
  verifyToken,
  validateQuery(Joi.object({
    q: Joi.string().min(1).max(100).required(),
    limit: Joi.number().integer().min(1).max(50).default(10),
    page: Joi.number().integer().min(1).default(1),
    sortBy: Joi.string().valid('name', 'email', 'date').default('name'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
    role: Joi.string().optional()
  })),
  async (req: Request, res: Response) => {
    try {
      // Check permissions - Admin only
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to search users'
        });
      }

      const {
        q: query,
        limit = 10,
        page = 1,
        sortBy = 'name',
        sortOrder = 'asc',
        role
      } = req.query;

      // Build filters
      const filters: any = {};
      if (role) filters.role = (role as string).split(',');

      const searchOptions: EntitySearchOptions = {
        query: query as string,
        limit: Number(limit),
        page: Number(page),
        sortBy: sortBy as string,
        sortOrder: sortOrder as any,
        filters
      };

      const result = await SearchService.searchUsers(searchOptions);

      res.json({
        success: true,
        data: result.users,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
          hasNext: result.page < Math.ceil(result.total / result.limit),
          hasPrev: result.page > 1
        }
      });

    } catch (error: any) {
      logger.error('User search failed', {
        error: error.message,
        query: req.query,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'User search failed',
        error: error.message
      });
    }
  }
);

// ==========================================
// SEARCH ANALYTICS ROUTES (Admin only)
// ==========================================

/**
 * GET /api/search/analytics
 * Get search analytics and popular queries (Admin only)
 */
router.get('/analytics',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check permissions - Admin only
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view search analytics'
        });
      }

      // This would typically query a search_logs table
      // For now, return mock analytics data
      const analytics = {
        totalSearches: 1247,
        uniqueQueries: 892,
        averageResultsPerSearch: 8.3,
        topQueries: [
          { query: 'iphone', count: 156, avgResults: 12 },
          { query: 'laptop', count: 134, avgResults: 8 },
          { query: 'headphones', count: 98, avgResults: 15 },
          { query: 'gaming', count: 87, avgResults: 6 },
          { query: 'coffee', count: 76, avgResults: 4 }
        ],
        searchesByEntity: {
          products: 68,
          categories: 18,
          orders: 10,
          users: 4
        },
        searchesByHour: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          count: Math.floor(Math.random() * 100) + 20
        }))
      };

      res.json({
        success: true,
        data: analytics
      });

    } catch (error: any) {
      logger.error('Search analytics failed', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to get search analytics',
        error: error.message
      });
    }
  }
);

// Error handling middleware
router.use(handleValidationErrors());

export default router;
