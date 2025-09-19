/**
 * Category Service with Sequelize ORM
 * Comprehensive category management with hierarchical structure support
 */

import { Category, Product } from '../models';
import { sequelize } from '../config/database';
import { logger, logUtils } from '../config/logger';
import { Op, WhereOptions, IncludeOptions } from 'sequelize';
// Note: Category types are defined inline in this service for now
// Future migration: move to ../types/category.ts

/**
 * Interfaces for category operations
 */
export interface CreateCategoryRequest {
  name: string;
  description: string;
  slug?: string;
  parentId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  slug?: string;
  parentId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CategoryWithChildren extends Category {
  parent?: Category;
  children?: CategoryWithChildren[];
  products?: Array<{
    id: number;
    name: string;
    sku: string;
    price: number;
    stock: number;
    status: string;
  }>;
  productCount?: number;
  childrenCount?: number;
}

export interface CategoryFilters {
  isActive?: boolean;
  parentId?: number | null;
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
    categoryId: number;
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
  static async createCategory(categoryData: CreateCategoryRequest, userId?: string | number): Promise<CategoryWithChildren> {
    try {
      const startTime = Date.now();

      // Generate slug if not provided
      const slug = categoryData.slug || this.generateSlug(categoryData.name);

      // Check if slug already exists
      const existingCategory = await Category.findOne({
        where: { slug }
      });

      if (existingCategory) {
        throw new Error(`Category with slug '${slug}' already exists`);
      }

      // Validate parent category if provided
      if (categoryData.parentId) {
        const parentCategory = await Category.findByPk(categoryData.parentId);

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
      const createData = {
        name: categoryData.name,
        description: categoryData.description,
        slug: slug,
        sortOrder: categoryData.sortOrder || 0,
        isActive: categoryData.isActive !== false,
        parentId: categoryData.parentId || null
      };

      // Create the category
      const category = await Category.create(createData);
      
      // Load the category with associations
      const categoryWithAssociations = await Category.findByPk(category.id, {
        include: [
          {
            model: Category,
            as: 'parent'
          },
          {
            model: Category,
            as: 'children',
            where: { isActive: true },
            required: false,
            order: [['sortOrder', 'ASC']]
          },
          {
            model: Product,
            as: 'products',
            attributes: ['id'],
            required: false
          }
        ]
      }) as CategoryWithChildren;
      
      // Add count properties
      if (categoryWithAssociations) {
        categoryWithAssociations.productCount = categoryWithAssociations.products?.length || 0;
        categoryWithAssociations.childrenCount = categoryWithAssociations.children?.length || 0;
      }

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('CREATE', 'categories', duration);
      
      if (userId) {
        logUtils.logUserAction(String(userId), 'category_create', {
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

      return categoryWithAssociations;
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
      const whereClause: WhereOptions = {};
      
      if (filters.isActive !== false) {
        whereClause.isActive = true;
      }
      
      if (filters.parentId !== undefined) {
        whereClause.parentId = filters.parentId;
      }

      // Search filter
      if (filters.search && filters.search.trim()) {
        const trimmedSearch = filters.search.trim();
        const normalizedSearch = trimmedSearch.toLowerCase();
        (whereClause as any)[Op.or] = [
          sequelize.where(
            sequelize.fn('lower', sequelize.col('name')),
            { [Op.like]: `%${normalizedSearch}%` }
          ),
          sequelize.where(
            sequelize.fn('lower', sequelize.col('description')),
            { [Op.like]: `%${normalizedSearch}%` }
          ),
          sequelize.where(
            sequelize.fn('lower', sequelize.col('slug')),
            { [Op.like]: `%${normalizedSearch}%` }
          )
        ];
      }

      // Has products filter will be handled in the include clause
      // Sequelize doesn't support direct exists queries in the where clause like Prisma

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build include clause
      const includeClause: IncludeOptions[] = [
        {
          model: Category,
          as: 'parent',
          required: false
        }
      ];
      
      if (includeChildren) {
        includeClause.push({
          model: Category,
          as: 'children',
          where: { isActive: true },
          required: false,
          order: [['sortOrder', 'ASC']]
        });
      }
      
      if (includeProducts) {
        includeClause.push({
          model: Product,
          as: 'products',
          where: { isActive: true },
          attributes: ['id', 'name', 'sku', 'price', 'stock', 'status'],
          required: false,
          limit: 5
        });
      } else if (includeCount) {
        includeClause.push({
          model: Product,
          as: 'products',
          attributes: ['id'],
          required: false
        });
      }

      // Handle has products filter by modifying the query
      let findOptions: any = {
        where: whereClause,
        include: includeClause,
        order: [[sortBy, sortOrder.toUpperCase()]],
        offset: skip,
        limit: limit
      };
      
      // Execute queries in parallel
      const [categoriesResult, total] = await Promise.all([
        Category.findAll(findOptions),
        Category.count({ where: whereClause })
      ]);
      
      // Process categories to add counts and filter by hasProducts if needed
      let categories = categoriesResult.map((cat: any) => {
        const categoryData = cat.toJSON() as CategoryWithChildren;
        if (includeCount) {
          categoryData.productCount = categoryData.products?.length || 0;
          categoryData.childrenCount = categoryData.children?.length || 0;
        }
        return categoryData;
      });
      
      // Apply hasProducts filter if specified
      if (filters.hasProducts === true) {
        categories = categories.filter(cat => cat.productCount && cat.productCount > 0);
      } else if (filters.hasProducts === false) {
        categories = categories.filter(cat => !cat.productCount || cat.productCount === 0);
      }

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('SELECT', 'categories', duration);

      const totalPages = Math.ceil(total / limit);

      return {
        categories: categories,
        total: filters.hasProducts !== undefined ? categories.length : total,
        page,
        limit,
        totalPages: Math.ceil((filters.hasProducts !== undefined ? categories.length : total) / limit)
      };
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'categories', undefined, error);
      throw error;
    }
  }

  /**
   * Get category by ID with full details
   */
  static async getCategoryById(id: number, includeFullTree: boolean = false): Promise<CategoryWithChildren | null> {
    try {
      const startTime = Date.now();
      
      const includeOptions: IncludeOptions[] = [
        {
          model: Category,
          as: 'parent',
          required: false
        },
        {
          model: Category,
          as: 'children',
          where: { isActive: true },
          required: false,
          order: [['sortOrder', 'ASC']],
          ...(includeFullTree && {
            include: [{
              model: Category,
              as: 'children',
              where: { isActive: true },
              required: false,
              order: [['sortOrder', 'ASC']]
            }]
          })
        },
        {
          model: Product,
          as: 'products',
          where: { isActive: true },
          attributes: ['id', 'name', 'sku', 'price', 'stock', 'status'],
          required: false,
          limit: 10
        }
      ];
      
      const categoryResult = await Category.findByPk(id, {
        include: includeOptions
      });
      
      if (!categoryResult) {
        return null;
      }
      
      const category = categoryResult.toJSON() as CategoryWithChildren;
      category.productCount = category.products?.length || 0;
      category.childrenCount = category.children?.length || 0;

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('SELECT', 'categories', duration);

      return category;
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
      const categoryResult = await Category.findOne({
        where: { slug },
        include: [
          {
            model: Category,
            as: 'parent',
            required: false
          },
          {
            model: Category,
            as: 'children',
            where: { isActive: true },
            required: false,
            order: [['sortOrder', 'ASC']]
          },
          {
            model: Product,
            as: 'products',
            where: { isActive: true },
            attributes: ['id', 'name', 'sku', 'price', 'stock', 'status'],
            required: false
          }
        ]
      });
      
      if (!categoryResult) {
        return null;
      }
      
      const category = categoryResult.toJSON() as CategoryWithChildren;
      category.productCount = category.products?.length || 0;
      category.childrenCount = category.children?.length || 0;

      return category;
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'categories', undefined, error);
      throw error;
    }
  }

  /**
   * Update category
   */
  static async updateCategory(id: number, updateData: UpdateCategoryRequest, userId?: string | number): Promise<CategoryWithChildren> {
    try {
      const startTime = Date.now();

      // Check if category exists
      const existingCategory = await Category.findByPk(id, {
        include: [
          {
            model: Category,
            as: 'children',
            required: false
          }
        ]
      });

      if (!existingCategory) {
        throw new Error(`Category with ID ${id} not found`);
      }

      // Check slug uniqueness if updating slug
      if (updateData.slug && updateData.slug !== existingCategory.slug) {
        const slugExists = await Category.findOne({
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
          const parentCategory = await Category.findByPk(updateData.parentId);

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
        const categoryData = existingCategory.toJSON() as any;
        const hasActiveChildren = categoryData.children?.some((child: any) => child.isActive) || false;
        if (hasActiveChildren) {
          throw new Error('Cannot deactivate category with active subcategories');
        }

        const activeProductsCount = await Product.count({
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
      const updatePayload: any = {
        ...updateData,
        updatedAt: new Date(),
      };
      
      // parentId is handled directly in Sequelize
      if (updateData.parentId !== undefined) {
        updatePayload.parentId = updateData.parentId;
      }

      // Update the category
      await existingCategory.update(updatePayload);
      
      // Fetch updated category with associations
      const category = await Category.findByPk(id, {
        include: [
          {
            model: Category,
            as: 'parent',
            required: false
          },
          {
            model: Category,
            as: 'children',
            where: { isActive: true },
            required: false,
            order: [['sortOrder', 'ASC']]
          },
          {
            model: Product,
            as: 'products',
            attributes: ['id'],
            required: false
          }
        ]
      });
      
      const categoryData = category!.toJSON() as CategoryWithChildren;
      categoryData.productCount = categoryData.products?.length || 0;
      categoryData.childrenCount = categoryData.children?.length || 0;

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('UPDATE', 'categories', duration);

      if (userId) {
        logUtils.logUserAction(String(userId), 'category_update', {
          categoryId: category!.id,
          slug: category!.slug,
          changes: Object.keys(updateData)
        });
      }

      logger.info('Category updated successfully', {
        categoryId: categoryData.id,
        slug: categoryData.slug,
        userId,
        duration
      });

      return categoryData;
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
  static async deleteCategory(id: number, userId?: string | number): Promise<boolean> {
    try {
      const startTime = Date.now();

      // Check if category exists
      const existingCategory = await Category.findByPk(id, {
        include: [
          {
            model: Category,
            as: 'children',
            required: false
          },
          {
            model: Product,
            as: 'products',
            required: false
          }
        ]
      });

      if (!existingCategory) {
        throw new Error(`Category with ID ${id} not found`);
      }

      // Check if category has active children
      const deleteData = existingCategory.toJSON() as any;
      const activeChildren = deleteData.children?.filter((child: any) => child.isActive) || [];
      if (activeChildren.length > 0) {
        throw new Error(`Cannot delete category with ${activeChildren.length} active subcategories`);
      }

      // Check if category has products
      const activeProducts = deleteData.products?.filter((product: any) => product.isActive) || [];
      if (activeProducts.length > 0) {
        // Soft delete - mark as inactive instead of deleting
        await existingCategory.update({ isActive: false });

        logger.warn('Category soft deleted due to product references', {
          categoryId: id,
          slug: existingCategory.slug,
          productCount: activeProducts.length,
          userId
        });
      } else {
        // Hard delete if no product references
        await existingCategory.destroy();

        logger.info('Category hard deleted', {
          categoryId: id,
          slug: existingCategory.slug,
          userId
        });
      }

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('DELETE', 'categories', duration);

      if (userId) {
        logUtils.logUserAction(String(userId), 'category_delete', {
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
  static async getCategoryTree(rootId?: number): Promise<CategoryWithChildren[]> {
    try {
      const startTime = Date.now();

      const categoriesResult = await Category.findAll({
        where: {
          isActive: true,
          parentId: rootId || null
        },
        include: [
          {
            model: Category,
            as: 'children',
            where: { isActive: true },
            required: false,
            order: [['sortOrder', 'ASC']],
            include: [
              {
                model: Category,
                as: 'children',
                where: { isActive: true },
                required: false,
                order: [['sortOrder', 'ASC']],
                include: [
                  {
                    model: Product,
                    as: 'products',
                    attributes: ['id'],
                    required: false
                  }
                ]
              },
              {
                model: Product,
                as: 'products',
                attributes: ['id'],
                required: false
              }
            ]
          },
          {
            model: Product,
            as: 'products',
            attributes: ['id'],
            required: false
          }
        ],
        order: [['sortOrder', 'ASC']]
      });
      
      // Process categories to add counts
      const categories = categoriesResult.map((cat: any) => {
        const categoryData = cat.toJSON() as CategoryWithChildren;
        
        // Add counts for main category
        categoryData.productCount = categoryData.products?.length || 0;
        categoryData.childrenCount = categoryData.children?.length || 0;
        
        // Add counts for children
        if (categoryData.children) {
          categoryData.children = categoryData.children.map((child: any) => {
            child.productCount = child.products?.length || 0;
            child.childrenCount = child.children?.length || 0;
            
            // Add counts for grandchildren
            if (child.children) {
              child.children = child.children.map((grandChild: any) => {
                grandChild.productCount = grandChild.products?.length || 0;
                grandChild.childrenCount = 0; // No deeper nesting in this case
                return grandChild;
              });
            }
            
            return child;
          });
        }
        
        return categoryData;
      });

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('SELECT', 'categories', duration);

      return categories;
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'categories', undefined, error);
      throw error;
    }
  }

  /**
   * Get category path (breadcrumb)
   */
  static async getCategoryPath(id: number): Promise<Category[]> {
    try {
      const path: Category[] = [];
      let currentId: number | null = id;

      while (currentId) {
        const category = await Category.findByPk(currentId);

        if (!category) {
          break;
        }

        path.unshift(category.toJSON());
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
  static async moveCategory(categoryId: number, newParentId: number | null, userId?: string | number): Promise<CategoryWithChildren> {
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
        logUtils.logUserAction(String(userId), 'category_move', {
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
        topCategoriesResult
      ] = await Promise.all([
        // Total categories count
        Category.count(),
        
        // Active categories count
        Category.count({
          where: { isActive: true }
        }),
        
        // Root categories count
        Category.count({
          where: { parentId: null, isActive: true }
        }),
        
        // Top categories by product count - we'll calculate this differently
        Category.findAll({
          where: { isActive: true },
          include: [
            {
              model: Product,
              as: 'products',
              attributes: ['id'],
              required: false
            }
          ],
          limit: 50 // Get more to filter and sort properly
        })
      ]);
      
      // Process top categories and count products
      const categoriesWithProductCounts = topCategoriesResult.map((cat: any) => {
        const categoryData = cat.toJSON();
        return {
          categoryId: categoryData.id,
          categoryName: categoryData.name,
          productCount: categoryData.products?.length || 0,
          depth: 0 // Will be calculated if needed
        };
      });
      
      // Sort by product count and take top 10
      const topCategories = categoriesWithProductCounts
        .filter(cat => cat.productCount > 0)
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, 10);
      
      // Count categories with products
      const categoriesWithProducts = categoriesWithProductCounts
        .filter(cat => cat.productCount > 0).length;

      // Calculate average products per category
      const totalProducts = await Product.count({
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
        topCategoriesByProducts: topCategories
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
  private static async checkCircularReference(categoryId: number, parentId: number): Promise<boolean> {
    let currentParentId: number | null = parentId;

    while (currentParentId) {
      if (currentParentId === categoryId) {
        return true; // Circular reference found
      }

      const parent = await Category.findByPk(currentParentId, {
        attributes: ['parentId']
      });

      if (!parent) {
        break;
      }

      currentParentId = parent?.parentId || null;
    }

    return false;
  }

  /**
   * Calculate maximum depth of category tree
   */
  private static async calculateMaxDepth(): Promise<number> {
    // This is a simplified calculation
    // For a more accurate depth calculation, you might need a recursive query
    const categories = await Category.findAll({
      where: { isActive: true },
      attributes: ['id', 'parentId']
    });
    
    const categoryData = categories.map(cat => cat.toJSON());

    let maxDepth = 0;

    for (const category of categoryData) {
      let depth = 0;
      let currentParentId = category.parentId;

      while (currentParentId) {
        depth++;
        const parent = categoryData.find(c => c.id === currentParentId);
        currentParentId = parent?.parentId || null;
      }

      maxDepth = Math.max(maxDepth, depth + 1);
    }

    return maxDepth;
  }
}
