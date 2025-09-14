/**
 * Category Service with Prisma ORM
 * Comprehensive category management with hierarchical structure support
 */

import { Category, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger, logUtils } from '../config/logger';
// Note: Category types are defined inline in this service for now
// Future migration: move to ../types/category.ts

/**
 * Interfaces for category operations
 */
export interface CreateCategoryRequest {
  name: string;
  description: string;
  slug?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  slug?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
  products?: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    status: string;
  }>;
  _count?: {
    products: number;
    children: number;
  };
}

export interface CategoryFilters {
  isActive?: boolean;
  parentId?: string | null;
  hasProducts?: boolean;
  level?: number;
  search?: string;
}

export interface CategorySearchOptions {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'sortOrder' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  filters?: CategoryFilters;
  includeChildren?: boolean;
  includeProducts?: boolean;
  includeCount?: boolean;
}

export interface CategoryStats {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  rootCategories: number;
  categoriesWithProducts: number;
  maxDepth: number;
  averageProductsPerCategory: number;
  topCategoriesByProducts: Array<{
    categoryId: string;
    categoryName: string;
    productCount: number;
    depth: number;
  }>;
}

/**
 * Category Service class with comprehensive functionality
 */
export class CategoryService {

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  /**
   * Create a new category
   */
  static async createCategory(categoryData: CreateCategoryRequest, userId?: string): Promise<CategoryWithChildren> {
    try {
      const startTime = Date.now();

      // Generate slug if not provided
      const slug = categoryData.slug || this.generateSlug(categoryData.name);

      // Check if slug already exists
      const existingCategory = await prisma.category.findUnique({
        where: { slug }
      });

      if (existingCategory) {
        throw new Error(`Category with slug '${slug}' already exists`);
      }

      // Validate parent category if provided
      if (categoryData.parentId) {
        const parentCategory = await prisma.category.findUnique({
          where: { id: categoryData.parentId }
        });

        if (!parentCategory) {
          throw new Error(`Parent category with ID ${categoryData.parentId} not found`);
        }

        if (!parentCategory.isActive) {
          throw new Error('Cannot create subcategory under inactive parent category');
        }

        // No need to check circular reference for new categories
        // (they don't exist yet, so they can't be their own ancestor)
      }

      // Prepare data for creation
      const createData: Prisma.CategoryCreateInput = {
        name: categoryData.name,
        description: categoryData.description,
        slug: slug,
        sortOrder: categoryData.sortOrder || 0,
        isActive: categoryData.isActive !== false,
        parent: categoryData.parentId ? {
          connect: { id: categoryData.parentId }
        } : undefined
      };

      // Create the category
      const category = await prisma.category.create({
        data: createData,
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
          },
          _count: {
            select: {
              products: true,
              children: true
            }
          }
        }
      });

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('CREATE', 'categories', duration);
      
      if (userId) {
        logUtils.logUserAction(userId, 'category_create', {
          categoryId: category.id,
          slug: category.slug,
          name: category.name,
          parentId: categoryData.parentId
        });
      }

      logger.info('Category created successfully', {
        categoryId: category.id,
        slug: category.slug,
        parentId: categoryData.parentId,
        userId,
        duration
      });

      return category as CategoryWithChildren;
    } catch (error: any) {
      logUtils.logDbOperation('CREATE', 'categories', undefined, error);
      logger.error('Category creation failed', {
        error: error.message,
        categoryData,
        userId
      });
      throw error;
    }
  }

  /**
   * Get all categories with advanced filtering and pagination
   */
  static async getCategories(options: CategorySearchOptions = {}): Promise<{
    categories: CategoryWithChildren[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const startTime = Date.now();
      const {
        page = 1,
        limit = 20,
        sortBy = 'sortOrder',
        sortOrder = 'asc',
        filters = {},
        includeChildren = true,
        includeProducts = false,
        includeCount = true
      } = options;

      // Build where clause from filters
      const whereClause: Prisma.CategoryWhereInput = {
        isActive: filters.isActive !== false ? true : undefined,
        parentId: filters.parentId !== undefined ? filters.parentId : undefined,
      };

      // Search filter
      if (filters.search) {
        whereClause.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { slug: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Has products filter
      if (filters.hasProducts === true) {
        whereClause.products = { some: {} };
      } else if (filters.hasProducts === false) {
        whereClause.products = { none: {} };
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build include clause
      const includeClause: Prisma.CategoryInclude = {
        parent: true,
        children: includeChildren ? {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: includeCount ? {
              select: { products: true, children: true }
            } : undefined
          }
        } : false,
        products: includeProducts ? {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            stock: true,
            status: true
          },
          take: 5 // Limit products to avoid huge responses
        } : false,
        _count: includeCount ? {
          select: {
            products: true,
            children: true
          }
        } : false
      };

      // Execute queries in parallel
      const [categories, total] = await Promise.all([
        prisma.category.findMany({
          where: whereClause,
          include: includeClause,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit
        }),
        prisma.category.count({ where: whereClause })
      ]);

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('SELECT', 'categories', duration);

      const totalPages = Math.ceil(total / limit);

      return {
        categories: categories as CategoryWithChildren[],
        total,
        page,
        limit,
        totalPages
      };
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'categories', undefined, error);
      throw error;
    }
  }

  /**
   * Get category by ID with full details
   */
  static async getCategoryById(id: string, includeFullTree: boolean = false): Promise<CategoryWithChildren | null> {
    try {
      const startTime = Date.now();
      
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          parent: true,
          children: includeFullTree ? {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              children: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' }
              },
              _count: {
                select: { products: true, children: true }
              }
            }
          } : {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
          },
          products: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              stock: true,
              status: true
            },
            take: 10
          },
          _count: {
            select: {
              products: true,
              children: true
            }
          }
        }
      });

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('SELECT', 'categories', duration);

      return category as CategoryWithChildren;
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'categories', undefined, error);
      throw error;
    }
  }

  /**
   * Get category by slug
   */
  static async getCategoryBySlug(slug: string): Promise<CategoryWithChildren | null> {
    try {
      const category = await prisma.category.findUnique({
        where: { slug },
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
          },
          products: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              stock: true,
              status: true
            }
          },
          _count: {
            select: { products: true, children: true }
          }
        }
      });

      return category as CategoryWithChildren;
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'categories', undefined, error);
      throw error;
    }
  }

  /**
   * Update category
   */
  static async updateCategory(id: string, updateData: UpdateCategoryRequest, userId?: string): Promise<CategoryWithChildren> {
    try {
      const startTime = Date.now();

      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id },
        include: { children: true }
      });

      if (!existingCategory) {
        throw new Error(`Category with ID ${id} not found`);
      }

      // Check slug uniqueness if updating slug
      if (updateData.slug && updateData.slug !== existingCategory.slug) {
        const slugExists = await prisma.category.findUnique({
          where: { slug: updateData.slug }
        });

        if (slugExists) {
          throw new Error(`Category with slug '${updateData.slug}' already exists`);
        }
      }

      // Validate parent category if updating parent
      if (updateData.parentId !== undefined) {
        if (updateData.parentId === id) {
          throw new Error('Category cannot be its own parent');
        }

        if (updateData.parentId) {
          const parentCategory = await prisma.category.findUnique({
            where: { id: updateData.parentId }
          });

          if (!parentCategory) {
            throw new Error(`Parent category with ID ${updateData.parentId} not found`);
          }

          if (!parentCategory.isActive) {
            throw new Error('Cannot set inactive category as parent');
          }

          // Check for circular reference
          const isCircular = await this.checkCircularReference(id, updateData.parentId);
          if (isCircular) {
            throw new Error('Circular reference detected: Category cannot be moved under its descendant');
          }
        }
      }

      // If deactivating category, check if it has active children or products
      if (updateData.isActive === false) {
        const hasActiveChildren = existingCategory.children.some(child => child.isActive);
        if (hasActiveChildren) {
          throw new Error('Cannot deactivate category with active subcategories');
        }

        const activeProductsCount = await prisma.product.count({
          where: { categoryId: id, isActive: true }
        });
        if (activeProductsCount > 0) {
          throw new Error(`Cannot deactivate category with ${activeProductsCount} active products`);
        }
      }

      // Generate slug if name is being updated and slug is not provided
      if (updateData.name && !updateData.slug) {
        updateData.slug = this.generateSlug(updateData.name);
      }

      // Prepare update data
      const updatePayload: Prisma.CategoryUpdateInput = {
        ...updateData,
        updatedAt: new Date(),
      };

      if (updateData.parentId !== undefined) {
        updatePayload.parent = updateData.parentId ? {
          connect: { id: updateData.parentId }
        } : {
          disconnect: true
        };
        delete updatePayload.parentId;
      }

      // Update the category
      const category = await prisma.category.update({
        where: { id },
        data: updatePayload,
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
          },
          _count: {
            select: { products: true, children: true }
          }
        }
      });

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('UPDATE', 'categories', duration);

      if (userId) {
        logUtils.logUserAction(userId, 'category_update', {
          categoryId: category.id,
          slug: category.slug,
          changes: Object.keys(updateData)
        });
      }

      logger.info('Category updated successfully', {
        categoryId: category.id,
        slug: category.slug,
        userId,
        duration
      });

      return category as CategoryWithChildren;
    } catch (error: any) {
      logUtils.logDbOperation('UPDATE', 'categories', undefined, error);
      logger.error('Category update failed', {
        error: error.message,
        categoryId: id,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete category (soft delete)
   */
  static async deleteCategory(id: string, userId?: string): Promise<boolean> {
    try {
      const startTime = Date.now();

      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id },
        include: {
          children: true,
          products: true
        }
      });

      if (!existingCategory) {
        throw new Error(`Category with ID ${id} not found`);
      }

      // Check if category has active children
      const activeChildren = existingCategory.children.filter(child => child.isActive);
      if (activeChildren.length > 0) {
        throw new Error(`Cannot delete category with ${activeChildren.length} active subcategories`);
      }

      // Check if category has products
      const activeProducts = existingCategory.products.filter(product => product.isActive);
      if (activeProducts.length > 0) {
        // Soft delete - mark as inactive instead of deleting
        await prisma.category.update({
          where: { id },
          data: { isActive: false }
        });

        logger.warn('Category soft deleted due to product references', {
          categoryId: id,
          slug: existingCategory.slug,
          productCount: activeProducts.length,
          userId
        });
      } else {
        // Hard delete if no product references
        await prisma.category.delete({
          where: { id }
        });

        logger.info('Category hard deleted', {
          categoryId: id,
          slug: existingCategory.slug,
          userId
        });
      }

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('DELETE', 'categories', duration);

      if (userId) {
        logUtils.logUserAction(userId, 'category_delete', {
          categoryId: id,
          slug: existingCategory.slug,
          method: activeProducts.length > 0 ? 'soft' : 'hard'
        });
      }

      return true;
    } catch (error: any) {
      logUtils.logDbOperation('DELETE', 'categories', undefined, error);
      logger.error('Category deletion failed', {
        error: error.message,
        categoryId: id,
        userId
      });
      throw error;
    }
  }

  // ==========================================
  // HIERARCHICAL OPERATIONS
  // ==========================================

  /**
   * Get category tree (hierarchical structure)
   */
  static async getCategoryTree(rootId?: string): Promise<CategoryWithChildren[]> {
    try {
      const startTime = Date.now();

      const categories = await prisma.category.findMany({
        where: {
          isActive: true,
          parentId: rootId || null
        },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              children: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
                include: {
                  _count: {
                    select: { products: true, children: true }
                  }
                }
              },
              _count: {
                select: { products: true, children: true }
              }
            }
          },
          _count: {
            select: { products: true, children: true }
          }
        },
        orderBy: { sortOrder: 'asc' }
      });

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('SELECT', 'categories', duration);

      return categories as CategoryWithChildren[];
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'categories', undefined, error);
      throw error;
    }
  }

  /**
   * Get category path (breadcrumb)
   */
  static async getCategoryPath(id: string): Promise<Category[]> {
    try {
      const path: Category[] = [];
      let currentId: string | null = id;

      while (currentId) {
        const category = await prisma.category.findUnique({
          where: { id: currentId }
        });

        if (!category) {
          break;
        }

        path.unshift(category);
        currentId = category.parentId;
      }

      return path;
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'categories', undefined, error);
      throw error;
    }
  }

  /**
   * Move category to new parent
   */
  static async moveCategory(categoryId: string, newParentId: string | null, userId?: string): Promise<CategoryWithChildren> {
    try {
      // Validate that the move doesn't create circular reference
      if (newParentId) {
        const isCircular = await this.checkCircularReference(categoryId, newParentId);
        if (isCircular) {
          throw new Error('Cannot move category: would create circular reference');
        }
      }

      const category = await this.updateCategory(categoryId, { parentId: newParentId }, userId);
      
      if (userId) {
        logUtils.logUserAction(userId, 'category_move', {
          categoryId,
          newParentId,
          oldParentId: category.parent?.id || null
        });
      }

      return category;
    } catch (error: any) {
      throw error;
    }
  }

  // ==========================================
  // ANALYTICS AND REPORTING
  // ==========================================

  /**
   * Get category statistics
   */
  static async getCategoryStats(): Promise<CategoryStats> {
    try {
      const startTime = Date.now();

      const [
        totalCategories,
        activeCategories,
        rootCategories,
        categoriesWithProducts,
        topCategories
      ] = await Promise.all([
        // Total categories count
        prisma.category.count(),
        
        // Active categories count
        prisma.category.count({
          where: { isActive: true }
        }),
        
        // Root categories count
        prisma.category.count({
          where: { parentId: null, isActive: true }
        }),
        
        // Categories with products count
        prisma.category.count({
          where: {
            isActive: true,
            products: { some: { isActive: true } }
          }
        }),
        
        // Top categories by product count
        prisma.category.findMany({
          where: { isActive: true },
          include: {
            _count: {
              select: { products: true }
            }
          },
          orderBy: {
            products: {
              _count: 'desc'
            }
          },
          take: 10
        })
      ]);

      // Calculate average products per category
      const totalProducts = await prisma.product.count({
        where: { isActive: true }
      });
      const averageProductsPerCategory = activeCategories > 0 ? totalProducts / activeCategories : 0;

      // Calculate max depth
      const maxDepth = await this.calculateMaxDepth();

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('AGGREGATE', 'categories', duration);

      return {
        totalCategories,
        activeCategories,
        inactiveCategories: totalCategories - activeCategories,
        rootCategories,
        categoriesWithProducts,
        maxDepth,
        averageProductsPerCategory: Math.round(averageProductsPerCategory * 100) / 100,
        topCategoriesByProducts: topCategories.map(cat => ({
          categoryId: cat.id,
          categoryName: cat.name,
          productCount: cat._count.products,
          depth: 0 // You could calculate actual depth if needed
        }))
      };
    } catch (error: any) {
      logUtils.logDbOperation('AGGREGATE', 'categories', undefined, error);
      throw error;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Generate URL-friendly slug from name
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Check for circular reference in category hierarchy
   */
  private static async checkCircularReference(categoryId: string, parentId: string): Promise<boolean> {
    let currentParentId: string | null = parentId;

    while (currentParentId) {
      if (currentParentId === categoryId) {
        return true; // Circular reference found
      }

      const parent = await prisma.category.findUnique({
        where: { id: currentParentId },
        select: { parentId: true }
      });

      if (!parent) {
        break;
      }

      currentParentId = parent.parentId;
    }

    return false;
  }

  /**
   * Calculate maximum depth of category tree
   */
  private static async calculateMaxDepth(): Promise<number> {
    // This is a simplified calculation
    // For a more accurate depth calculation, you might need a recursive query
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, parentId: true }
    });

    let maxDepth = 0;

    for (const category of categories) {
      let depth = 0;
      let currentParentId = category.parentId;

      while (currentParentId) {
        depth++;
        const parent = categories.find(c => c.id === currentParentId);
        currentParentId = parent?.parentId || null;
      }

      maxDepth = Math.max(maxDepth, depth + 1);
    }

    return maxDepth;
  }
}
