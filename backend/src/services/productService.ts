/**
 * Product Service with Prisma ORM
 * Comprehensive product management with advanced features
 */

import { Product, ProductStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger, logUtils } from '../config/logger';
// Note: Product types are defined inline in this service for now
// Future migration: move to ../types/product.ts

/**
 * Interfaces for product operations
 */
export interface CreateProductRequest {
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  price: number;
  costPrice: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  weight?: number;
  images?: string[];
  tags?: string[];
  status?: ProductStatus;
  supplier?: {
    name: string;
    email: string;
    phone?: string;
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  price?: number;
  costPrice?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  weight?: number;
  images?: string[];
  tags?: string[];
  status?: ProductStatus;
  isActive?: boolean;
  supplier?: {
    name: string;
    email: string;
    phone?: string;
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface ProductFilters {
  categoryId?: string;
  status?: ProductStatus;
  isActive?: boolean;
  inStock?: boolean;
  lowStock?: boolean;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  tags?: string[];
  supplier?: string;
}

export interface ProductSearchOptions {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'stock' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  filters?: ProductFilters;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  totalValue: number;
  averagePrice: number;
  categoriesCount: number;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    productCount: number;
  }>;
}

/**
 * Product Service class with comprehensive functionality
 */
export class ProductService {

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  /**
   * Create a new product
   */
  static async createProduct(productData: CreateProductRequest, userId?: string): Promise<Product> {
    try {
      const startTime = Date.now();

      // Check if SKU already exists
      const existingProduct = await prisma.product.findUnique({
        where: { sku: productData.sku }
      });

      if (existingProduct) {
        throw new Error(`Product with SKU ${productData.sku} already exists`);
      }

      // Validate category exists
      const category = await prisma.category.findUnique({
        where: { id: productData.categoryId }
      });

      if (!category) {
        throw new Error(`Category with ID ${productData.categoryId} not found`);
      }

      // Prepare data for creation
      const createData: Prisma.ProductCreateInput = {
        name: productData.name,
        description: productData.description,
        sku: productData.sku.toUpperCase(),
        barcode: productData.barcode,
        price: productData.price,
        costPrice: productData.costPrice,
        stock: productData.stock || 0,
        minStock: productData.minStock || 0,
        maxStock: productData.maxStock,
        weight: productData.weight,
        status: productData.status || ProductStatus.ACTIVE,
        category: {
          connect: { id: productData.categoryId }
        }
      };

      // Create the product
      const product = await prisma.product.create({
        data: createData,
        include: {
          category: true
        }
      });

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('CREATE', 'products', duration);
      
      if (userId) {
        logUtils.logUserAction(userId, 'product_create', {
          productId: product.id,
          sku: product.sku,
          name: product.name
        });
      }

      logger.info('Product created successfully', {
        productId: product.id,
        sku: product.sku,
        userId,
        duration
      });

      return product;
    } catch (error: any) {
      logUtils.logDbOperation('CREATE', 'products', undefined, error);
      logger.error('Product creation failed', {
        error: error.message,
        productData: { ...productData, sku: productData.sku },
        userId
      });
      throw error;
    }
  }

  /**
   * Get all products with advanced filtering and pagination
   */
  static async getProducts(options: ProductSearchOptions = {}): Promise<{
    products: Product[];
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
        filters = {}
      } = options;

      // Build where clause from filters
      const whereClause: Prisma.ProductWhereInput = {
        isActive: filters.isActive !== false ? true : undefined,
        status: filters.status,
        categoryId: filters.categoryId,
      };

      // Stock filters
      if (filters.inStock === true) {
        whereClause.stock = { gt: 0 };
      } else if (filters.inStock === false) {
        whereClause.stock = { lte: 0 };
      }

      if (filters.lowStock === true) {
        whereClause.stock = { lte: prisma.product.fields.minStock };
      }

      // Price range filter
      if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        whereClause.price = {};
        if (filters.priceMin !== undefined) {
          whereClause.price.gte = filters.priceMin;
        }
        if (filters.priceMax !== undefined) {
          whereClause.price.lte = filters.priceMax;
        }
      }

      // Search filter
      if (filters.search) {
        whereClause.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search.toUpperCase(), mode: 'insensitive' } },
        ];
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute queries in parallel
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: whereClause,
          include: {
            category: true
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit
        }),
        prisma.product.count({ where: whereClause })
      ]);

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('SELECT', 'products', duration);

      const totalPages = Math.ceil(total / limit);

      return {
        products,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'products', undefined, error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(id: string): Promise<Product | null> {
    try {
      const startTime = Date.now();
      
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true
        }
      });

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('SELECT', 'products', duration);

      return product;
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'products', undefined, error);
      throw error;
    }
  }

  /**
   * Get product by SKU
   */
  static async getProductBySku(sku: string): Promise<Product | null> {
    try {
      const product = await prisma.product.findUnique({
        where: { sku: sku.toUpperCase() },
        include: {
          category: true
        }
      });

      return product;
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'products', undefined, error);
      throw error;
    }
  }

  /**
   * Update product
   */
  static async updateProduct(id: string, updateData: UpdateProductRequest, userId?: string): Promise<Product> {
    try {
      const startTime = Date.now();

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id }
      });

      if (!existingProduct) {
        throw new Error(`Product with ID ${id} not found`);
      }

      // Check SKU uniqueness if updating SKU
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const skuExists = await prisma.product.findUnique({
          where: { sku: updateData.sku.toUpperCase() }
        });

        if (skuExists) {
          throw new Error(`Product with SKU ${updateData.sku} already exists`);
        }
      }

      // Validate category if updating category
      if (updateData.categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: updateData.categoryId }
        });

        if (!category) {
          throw new Error(`Category with ID ${updateData.categoryId} not found`);
        }
      }

      // Prepare update data
      const updatePayload: Prisma.ProductUpdateInput = {
        ...updateData,
        sku: updateData.sku?.toUpperCase(),
        updatedAt: new Date(),
      };

      if (updateData.categoryId) {
        updatePayload.category = {
          connect: { id: updateData.categoryId }
        };
        delete updatePayload.categoryId;
      }

      // Update the product
      const product = await prisma.product.update({
        where: { id },
        data: updatePayload,
        include: {
          category: true
        }
      });

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('UPDATE', 'products', duration);

      if (userId) {
        logUtils.logUserAction(userId, 'product_update', {
          productId: product.id,
          sku: product.sku,
          changes: Object.keys(updateData)
        });
      }

      logger.info('Product updated successfully', {
        productId: product.id,
        sku: product.sku,
        userId,
        duration
      });

      return product;
    } catch (error: any) {
      logUtils.logDbOperation('UPDATE', 'products', undefined, error);
      logger.error('Product update failed', {
        error: error.message,
        productId: id,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete product (soft delete)
   */
  static async deleteProduct(id: string, userId?: string): Promise<boolean> {
    try {
      const startTime = Date.now();

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id }
      });

      if (!existingProduct) {
        throw new Error(`Product with ID ${id} not found`);
      }

      // Check if product is used in any orders
      const orderItems = await prisma.orderItem.findFirst({
        where: { productId: id }
      });

      if (orderItems) {
        // Soft delete - mark as inactive instead of deleting
        await prisma.product.update({
          where: { id },
          data: {
            isActive: false,
            status: ProductStatus.DISCONTINUED
          }
        });

        logger.warn('Product soft deleted due to order references', {
          productId: id,
          sku: existingProduct.sku,
          userId
        });
      } else {
        // Hard delete if no order references
        await prisma.product.delete({
          where: { id }
        });

        logger.info('Product hard deleted', {
          productId: id,
          sku: existingProduct.sku,
          userId
        });
      }

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('DELETE', 'products', duration);

      if (userId) {
        logUtils.logUserAction(userId, 'product_delete', {
          productId: id,
          sku: existingProduct.sku,
          method: orderItems ? 'soft' : 'hard'
        });
      }

      return true;
    } catch (error: any) {
      logUtils.logDbOperation('DELETE', 'products', undefined, error);
      logger.error('Product deletion failed', {
        error: error.message,
        productId: id,
        userId
      });
      throw error;
    }
  }

  // ==========================================
  // STOCK MANAGEMENT
  // ==========================================

  /**
   * Update product stock
   */
  static async updateStock(id: string, quantity: number, operation: 'add' | 'subtract' = 'subtract', userId?: string): Promise<Product> {
    try {
      const product = await prisma.product.findUnique({
        where: { id }
      });

      if (!product) {
        throw new Error(`Product with ID ${id} not found`);
      }

      const newStock = operation === 'add' 
        ? product.stock + quantity 
        : Math.max(0, product.stock - quantity);

      // Update status based on stock level
      let newStatus = product.status;
      if (newStock === 0 && product.status !== ProductStatus.DISCONTINUED) {
        newStatus = ProductStatus.OUT_OF_STOCK;
      } else if (newStock > 0 && product.status === ProductStatus.OUT_OF_STOCK) {
        newStatus = ProductStatus.ACTIVE;
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          stock: newStock,
          status: newStatus
        },
        include: {
          category: true
        }
      });

      if (userId) {
        logUtils.logUserAction(userId, 'stock_update', {
          productId: id,
          operation,
          quantity,
          oldStock: product.stock,
          newStock
        });
      }

      // Log low stock warning
      if (newStock <= product.minStock && newStock > 0) {
        logger.warn('Low stock detected', {
          productId: id,
          sku: product.sku,
          currentStock: newStock,
          minStock: product.minStock
        });
      }

      return updatedProduct;
    } catch (error: any) {
      logger.error('Stock update failed', {
        error: error.message,
        productId: id,
        operation,
        quantity,
        userId
      });
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  static async getLowStockProducts(): Promise<Product[]> {
    try {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          stock: {
            lte: prisma.product.fields.minStock,
            gt: 0
          }
        },
        include: {
          category: true
        },
        orderBy: {
          stock: 'asc'
        }
      });

      return products;
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'products', undefined, error);
      throw error;
    }
  }

  /**
   * Get out of stock products
   */
  static async getOutOfStockProducts(): Promise<Product[]> {
    try {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          stock: 0
        },
        include: {
          category: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      return products;
    } catch (error: any) {
      logUtils.logDbOperation('SELECT', 'products', undefined, error);
      throw error;
    }
  }

  // ==========================================
  // ANALYTICS AND REPORTING
  // ==========================================

  /**
   * Get product statistics
   */
  static async getProductStats(): Promise<ProductStats> {
    try {
      const startTime = Date.now();

      const [
        totalProducts,
        activeProducts,
        outOfStockProducts,
        lowStockProducts,
        valueStats,
        topCategories
      ] = await Promise.all([
        // Total products count
        prisma.product.count(),
        
        // Active products count
        prisma.product.count({
          where: { isActive: true, status: ProductStatus.ACTIVE }
        }),
        
        // Out of stock products count
        prisma.product.count({
          where: { isActive: true, stock: 0 }
        }),
        
        // Low stock products count
        prisma.product.count({
          where: {
            isActive: true,
            stock: { lte: prisma.product.fields.minStock, gt: 0 }
          }
        }),
        
        // Value statistics
        prisma.product.aggregate({
          where: { isActive: true },
          _sum: { 
            stock: true,
          },
          _avg: { 
            price: true 
          }
        }),
        
        // Top categories by product count
        prisma.category.findMany({
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
          take: 5
        })
      ]);

      // Calculate total inventory value
      const inventoryValue = await prisma.product.findMany({
        where: { isActive: true },
        select: { price: true, stock: true }
      });

      const totalValue = inventoryValue.reduce((sum, product) => 
        sum + (product.price * product.stock), 0
      );

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('AGGREGATE', 'products', duration);

      return {
        totalProducts,
        activeProducts,
        inactiveProducts: totalProducts - activeProducts,
        outOfStockProducts,
        lowStockProducts,
        totalValue,
        averagePrice: valueStats._avg.price || 0,
        categoriesCount: topCategories.length,
        topCategories: topCategories.map(cat => ({
          categoryId: cat.id,
          categoryName: cat.name,
          productCount: cat._count.products
        }))
      };
    } catch (error: any) {
      logUtils.logDbOperation('AGGREGATE', 'products', undefined, error);
      throw error;
    }
  }

  /**
   * Search products with advanced text search
   */
  static async searchProducts(query: string, options: ProductSearchOptions = {}): Promise<{
    products: Product[];
    total: number;
  }> {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const searchCondition: Prisma.ProductWhereInput = {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query.toUpperCase(), mode: 'insensitive' } },
        ]
      };

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: searchCondition,
          include: {
            category: true
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.product.count({ where: searchCondition })
      ]);

      return { products, total };
    } catch (error: any) {
      logUtils.logDbOperation('SEARCH', 'products', undefined, error);
      throw error;
    }
  }
}
