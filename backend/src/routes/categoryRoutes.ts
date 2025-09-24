/**
 * Category Routes - Complete Category Management API
 * Comprehensive CRUD operations with hierarchical structure support
 */

import express, { Request, Response } from 'express';
import { CategoryService, CreateCategoryRequest, UpdateCategoryRequest, CategorySearchOptions } from '../services/categoryService';
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
  createCategorySchema,
  updateCategorySchema,
  paginationSchema
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
 * GET /api/categories
 * Get categories with filtering and pagination (public access for navigation)
 */
router.get('/',
  validateQuery(paginationSchema, { allowUnknown: true }),
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'sortOrder',
        sortOrder = 'asc',
        parentId,
        isActive,
        hasProducts,
        search,
        includeChildren,
        includeProducts,
        includeCount
      } = req.query;

      const options: CategorySearchOptions = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        filters: {
          parentId: parentId === 'null' ? null : (parentId ? parseIntId(parentId as string) : undefined),
          isActive: isActive !== undefined ? isActive === 'true' : undefined,
          hasProducts: hasProducts !== undefined ? hasProducts === 'true' : undefined,
          search: search as string
        },
        includeChildren: includeChildren !== 'false',
        includeProducts: includeProducts === 'true',
        includeCount: includeCount !== 'false'
      };

      const result = await CategoryService.getCategories(options);

      res.json({
        success: true,
        data: result.categories,
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
      logger.error('Error fetching categories', {
        error: error.message,
        query: req.query
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching categories',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/categories/tree
 * Get category tree structure (public)
 */
router.get('/tree',
  async (req: Request, res: Response) => {
    try {
      const { rootId } = req.query;

      const tree = await CategoryService.getCategoryTree(rootId ? parseIntId(rootId as string) : undefined);

      res.json({
        success: true,
        data: tree,
        message: `Category tree retrieved successfully`
      });
    } catch (error: any) {
      logger.error('Error fetching category tree', {
        error: error.message,
        rootId: req.query.rootId
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching category tree',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/categories/slug/:slug
 * Get category by slug (public)
 */
router.get('/slug/:slug',
  async (req: Request, res: Response) => {
    try {
      const category = await CategoryService.getCategoryBySlug(req.params.slug);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error: any) {
      logger.error('Error fetching category by slug', {
        error: error.message,
        slug: req.params.slug
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching category',
        error: error.message
      });
    }
  }
);

// ==========================================
// ANALYTICS AND REPORTING ROUTES (must come before /:id)
// ==========================================

/**
 * GET /api/categories/stats
 * Get category statistics (Admin/Manager only)
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

      const stats = await CategoryService.getCategoryStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Error fetching category statistics', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching category statistics',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/categories/:id/path
 * Get category breadcrumb path (public)
 */
router.get('/:id/path',
  validateId(),
  async (req: Request, res: Response) => {
    try {
      const path = await CategoryService.getCategoryPath(parseIntId(req.params.id));

      res.json({
        success: true,
        data: path,
        message: 'Category path retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error fetching category path', {
        error: error.message,
        categoryId: req.params.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching category path',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/categories/:id
 * Get single category by ID (public)
 */
router.get('/:id',
  validateId(),
  async (req: Request, res: Response) => {
    try {
      const { includeFullTree } = req.query;
      
      const category = await CategoryService.getCategoryById(
        parseIntId(req.params.id), 
        includeFullTree === 'true'
      );

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error: any) {
      logger.error('Error fetching category', {
        error: error.message,
        categoryId: req.params.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Error fetching category',
        error: error.message
      });
    }
  }
);

// ==========================================
// PROTECTED ROUTES (authentication required)
// ==========================================

/**
 * POST /api/categories
 * Create new category (Admin/Manager only)
 */
router.post('/',
  verifyToken,
  sanitizeInput(),
  validateContentType(),
  validateBody(createCategorySchema),
  async (req: Request, res: Response) => {
    try {
      // Check if user has permission to create categories
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create categories'
        });
      }

      const categoryData: CreateCategoryRequest = req.body;
      const userId = req.user?.userId;

      const category = await CategoryService.createCategory(categoryData, userId);

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (error: any) {
      logger.error('Error creating category', {
        error: error.message,
        userId: req.user?.userId,
        categoryData: req.body
      });

      const statusCode = error.message.includes('already exists') ? 409 :
                        error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Error creating category',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/categories/:id
 * Update category (Admin/Manager only)
 */
router.put('/:id',
  verifyToken,
  validateId(),
  sanitizeInput(),
  validateContentType(),
  validateBody(updateCategorySchema),
  async (req: Request, res: Response) => {
    try {
      // Check if user has permission to update categories
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update categories'
        });
      }

      const updateData: UpdateCategoryRequest = req.body;
      const userId = req.user?.userId;

      const category = await CategoryService.updateCategory(parseIntId(req.params.id), updateData, userId);

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });
    } catch (error: any) {
      logger.error('Error updating category', {
        error: error.message,
        categoryId: req.params.id,
        userId: req.user?.userId
      });

      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('already exists') ? 409 :
                        error.message.includes('Circular reference') ? 400 :
                        error.message.includes('Cannot') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Error updating category',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/categories/:id
 * Delete category (Admin only)
 */
router.delete('/:id',
  verifyToken,
  validateId(),
  async (req: Request, res: Response) => {
    try {
      // Check if user has permission to delete categories
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete categories'
        });
      }

      const userId = req.user?.userId;
      await CategoryService.deleteCategory(parseIntId(req.params.id), userId);

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting category', {
        error: error.message,
        categoryId: req.params.id,
        userId: req.user?.userId
      });

      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('Cannot delete') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Error deleting category',
        error: error.message
      });
    }
  }
);

// ==========================================
// HIERARCHICAL OPERATIONS
// ==========================================

/**
 * PUT /api/categories/:id/move
 * Move category to new parent (Admin/Manager only)
 */
router.put('/:id/move',
  verifyToken,
  validateId(),
  validateBody(Joi.object({
    newParentId: Joi.string().allow(null).optional()
  })),
  async (req: Request, res: Response) => {
    try {
      // Check if user has permission to move categories
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to move categories'
        });
      }

      const { newParentId } = req.body;
      const userId = req.user?.userId;

      const category = await CategoryService.moveCategory(
        parseIntId(req.params.id),
        newParentId,
        userId
      );

      res.json({
        success: true,
        message: 'Category moved successfully',
        data: category
      });
    } catch (error: any) {
      logger.error('Error moving category', {
        error: error.message,
        categoryId: req.params.id,
        newParentId: req.body.newParentId,
        userId: req.user?.userId
      });

      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('circular reference') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Error moving category',
        error: error.message
      });
    }
  }
);


// ==========================================
// BULK OPERATIONS
// ==========================================

/**
 * POST /api/categories/bulk/reorder
 * Reorder categories (Admin/Manager only)
 */
router.post('/bulk/reorder',
  verifyToken,
  validateBody(Joi.object({
    categories: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        sortOrder: Joi.number().integer().min(0).required()
      })
    ).min(1).required()
  })),
  async (req: Request, res: Response) => {
    try {
      // Check if user has permission to reorder categories
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to reorder categories'
        });
      }

      const { categories } = req.body;
      const userId = req.user?.userId;

      // Update sort order for each category
      const updatePromises = categories.map((cat: { id: string; sortOrder: number }) =>
        CategoryService.updateCategory(parseIntId(cat.id), { sortOrder: cat.sortOrder }, userId)
      );

      const results = await Promise.allSettled(updatePromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (userId) {
        logUtils.logUserAction(userId?.toString() || 'unknown', 'categories_reorder', {
          totalCategories: categories.length,
          successful,
          failed
        });
      }

      res.json({
        success: true,
        message: 'Categories reordered successfully',
        data: {
          total: categories.length,
          successful,
          failed
        }
      });
    } catch (error: any) {
      logger.error('Error reordering categories', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Error reordering categories',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/categories/bulk/update-status
 * Bulk update category status (Admin only)
 */
router.post('/bulk/update-status',
  verifyToken,
  validateBody(Joi.object({
    categoryIds: Joi.array().items(Joi.string()).min(1).required(),
    isActive: Joi.boolean().required()
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

      const { categoryIds, isActive } = req.body;
      const userId = req.user?.userId;

      // Update categories in bulk
      const updatePromises = categoryIds.map((id: string) =>
        CategoryService.updateCategory(parseIntId(id), { isActive }, userId)
      );

      const results = await Promise.allSettled(updatePromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (userId) {
        logUtils.logUserAction(userId?.toString() || 'unknown', 'bulk_category_status_update', {
          totalCategories: categoryIds.length,
          successful,
          failed,
          newStatus: isActive
        });
      }

      res.json({
        success: true,
        message: 'Bulk status update completed',
        data: {
          total: categoryIds.length,
          successful,
          failed,
          isActive
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
