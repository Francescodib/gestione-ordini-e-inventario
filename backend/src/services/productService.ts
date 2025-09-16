/**
 * Product Service with Sequelize ORM
 * Comprehensive product management with advanced features
 */

import { Product, ProductStatus, Category, OrderItem } from '../models';
import { sequelize } from '../config/database';
import { logger, logUtils } from '../config/logger';
import { Op, WhereOptions } from 'sequelize';

/**
 * Service-specific interfaces adapted for Sequelize integer IDs
 * Note: The frontend types use string IDs, service layer handles conversion
 */
export interface CreateProductRequest {
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  categoryId: number;
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
  categoryId?: number;
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
  categoryId?: number;
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
    categoryId: number;
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
      const existingProduct = await Product.findOne({
        where: { sku: productData.sku }
      });

      if (existingProduct) {
        throw new Error(`Product with SKU ${productData.sku} already exists`);
      }

      // Validate category exists
      const category = await Category.findByPk(productData.categoryId);

      if (!category) {
        throw new Error(`Category with ID ${productData.categoryId} not found`);
      }

      // Prepare data for creation
      const createData = {
        name: productData.name,
        description: productData.description,
        sku: productData.sku.toUpperCase(),
        barcode: productData.barcode,
        categoryId: productData.categoryId,
        price: productData.price,
        costPrice: productData.costPrice,
        stock: productData.stock || 0,
        minStock: productData.minStock || 0,
        maxStock: productData.maxStock,
        weight: productData.weight,
        status: productData.status || ProductStatus.ACTIVE,
        images: productData.images ? JSON.stringify(productData.images) : null,
        tags: productData.tags ? JSON.stringify(productData.tags) : null,
        supplier: productData.supplier ? JSON.stringify(productData.supplier) : null,
        dimensions: productData.dimensions ? JSON.stringify(productData.dimensions) : null
      };

      // Create the product
      const product = await Product.create(createData);

      // Load the product with category association
      const productWithCategory = await Product.findByPk(product.id, {
        include: [{ model: Category, as: 'category' }]
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

      return productWithCategory!;
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
      const whereClause: WhereOptions = {};

      // Only add isActive filter if it's explicitly set
      if (filters.isActive !== undefined) {
        whereClause.isActive = filters.isActive;
      } else {
        // Default to showing only active products
        whereClause.isActive = true;
      }

      // Only add status filter if it's defined
      if (filters.status !== undefined) {
        whereClause.status = filters.status;
      }

      // Only add categoryId filter if it's defined
      if (filters.categoryId !== undefined) {
        whereClause.categoryId = filters.categoryId;
      }

      // Stock filters
      if (filters.inStock === true) {
        whereClause.stock = { [Op.gt]: 0 };
      } else if (filters.inStock === false) {
        whereClause.stock = { [Op.lte]: 0 };
      }

      if (filters.lowStock === true) {
        whereClause.stock = sequelize.where(
          sequelize.col('stock'),
          Op.lte,
          sequelize.col('minStock')
        );
      }

      // Price range filter
      if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        whereClause.price = {};
        if (filters.priceMin !== undefined) {
          whereClause.price[Op.gte] = filters.priceMin;
        }
        if (filters.priceMax !== undefined) {
          whereClause.price[Op.lte] = filters.priceMax;
        }
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
            sequelize.fn('lower', sequelize.col('sku')),
            { [Op.like]: `%${normalizedSearch}%` }
          )
        ];
      }

      // Calculate pagination
      const offset = (page - 1) * limit;

      // Execute queries in parallel
      const [products, total] = await Promise.all([
        Product.findAll({
          where: whereClause,
          include: [{ model: Category, as: 'category' }],
          order: [[sortBy, sortOrder.toUpperCase()]],
          offset,
          limit
        }),
        Product.count({ where: whereClause })
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
  static async getProductById(id: number): Promise<Product | null> {
    try {
      const startTime = Date.now();
      
      const product = await Product.findByPk(id, {
        include: [{ model: Category, as: 'category' }]
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
      const product = await Product.findOne({
        where: { sku: sku.toUpperCase() },
        include: [{ model: Category, as: 'category' }]
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
  static async updateProduct(id: number, updateData: UpdateProductRequest, userId?: string): Promise<Product> {
    try {
      const startTime = Date.now();

      // Check if product exists
      const existingProduct = await Product.findByPk(id);

      if (!existingProduct) {
        throw new Error(`Product with ID ${id} not found`);
      }

      // Check SKU uniqueness if updating SKU
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const skuExists = await Product.findOne({
          where: { sku: updateData.sku.toUpperCase() }
        });

        if (skuExists) {
          throw new Error(`Product with SKU ${updateData.sku} already exists`);
        }
      }

      // Validate category if updating category
      if (updateData.categoryId) {
        const category = await Category.findByPk(updateData.categoryId);

        if (!category) {
          throw new Error(`Category with ID ${updateData.categoryId} not found`);
        }
      }

      // Prepare update data
      const updatePayload: any = {
        ...updateData,
        sku: updateData.sku?.toUpperCase(),
        updatedAt: new Date(),
      };

      // Handle JSON fields
      if (updateData.images) {
        updatePayload.images = JSON.stringify(updateData.images);
      }
      if (updateData.tags) {
        updatePayload.tags = JSON.stringify(updateData.tags);
      }
      if (updateData.supplier) {
        updatePayload.supplier = JSON.stringify(updateData.supplier);
      }
      if (updateData.dimensions) {
        updatePayload.dimensions = JSON.stringify(updateData.dimensions);
      }

      // Update the product
      await existingProduct.update(updatePayload);

      // Reload with category association
      const product = await Product.findByPk(id, {
        include: [{ model: Category, as: 'category' }]
      });

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('UPDATE', 'products', duration);

      if (userId) {
        logUtils.logUserAction(userId, 'product_update', {
          productId: product!.id,
          sku: product!.sku,
          changes: Object.keys(updateData)
        });
      }

      logger.info('Product updated successfully', {
        productId: product!.id,
        sku: product!.sku,
        userId,
        duration
      });

      return product!;
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
  static async deleteProduct(id: number, userId?: string): Promise<boolean> {
    try {
      const startTime = Date.now();

      // Check if product exists
      const existingProduct = await Product.findByPk(id);

      if (!existingProduct) {
        throw new Error(`Product with ID ${id} not found`);
      }

      // Check if product is used in any orders
      const orderItems = await OrderItem.findOne({
        where: { productId: id }
      });

      if (orderItems) {
        // Soft delete - mark as inactive instead of deleting
        await existingProduct.update({
          isActive: false,
          status: ProductStatus.DISCONTINUED
        });

        logger.warn('Product soft deleted due to order references', {
          productId: id,
          sku: existingProduct.sku,
          userId
        });
      } else {
        // Hard delete if no order references
        await existingProduct.destroy();

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
  static async updateStock(id: number, quantity: number, operation: 'add' | 'subtract' = 'subtract', userId?: string): Promise<Product> {
    try {
      const product = await Product.findByPk(id);

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

      await product.update({
        stock: newStock,
        status: newStatus
      });

      // Reload with category association
      const updatedProduct = await Product.findByPk(id, {
        include: [{ model: Category, as: 'category' }]
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

      return updatedProduct!;
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
      const products = await Product.findAll({
        where: {
          isActive: true,
          stock: {
            [Op.lte]: sequelize.col('minStock'),
            [Op.gt]: 0
          }
        },
        include: [{ model: Category, as: 'category' }],
        order: [['stock', 'ASC']]
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
      const products = await Product.findAll({
        where: {
          isActive: true,
          stock: 0
        },
        include: [{ model: Category, as: 'category' }],
        order: [['updatedAt', 'DESC']]
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
        Product.count(),
        
        // Active products count
        Product.count({
          where: { isActive: true, status: ProductStatus.ACTIVE }
        }),
        
        // Out of stock products count
        Product.count({
          where: { isActive: true, stock: 0 }
        }),
        
        // Low stock products count
        Product.count({
          where: {
            isActive: true,
            stock: {
              [Op.lte]: sequelize.col('minStock'),
              [Op.gt]: 0
            }
          }
        }),
        
        // Value statistics - using separate aggregations for sum and average
        Product.findAll({
          where: { isActive: true },
          attributes: [
            [sequelize.fn('SUM', sequelize.col('stock')), 'totalStock'],
            [sequelize.fn('AVG', sequelize.col('price')), 'averagePrice']
          ],
          raw: true
        }),
        
        // Top categories by product count
        Category.findAll({
          attributes: [
            'id',
            'name',
            [sequelize.fn('COUNT', sequelize.col('products.id')), 'productCount']
          ],
          include: [{
            model: Product,
            as: 'products',
            attributes: [],
            where: { isActive: true },
            required: false
          }],
          group: ['Category.id', 'Category.name'],
          order: [[sequelize.fn('COUNT', sequelize.col('products.id')), 'DESC']],
          limit: 5,
          raw: true
        })
      ]);

      // Calculate total inventory value
      const inventoryValue = await Product.findAll({
        where: { isActive: true },
        attributes: ['price', 'stock'],
        raw: true
      });

      const totalValue = inventoryValue.reduce((sum: number, product: any) => 
        sum + (product.price * product.stock), 0
      );

      const duration = Date.now() - startTime;
      logUtils.logDbOperation('AGGREGATE', 'products', duration);

      // Extract value stats from the result
      const statsResult = valueStats[0] as any;

      return {
        totalProducts,
        activeProducts,
        inactiveProducts: totalProducts - activeProducts,
        outOfStockProducts,
        lowStockProducts,
        totalValue,
        averagePrice: parseFloat(statsResult?.averagePrice || '0'),
        categoriesCount: topCategories.length,
        topCategories: (topCategories as any[]).map(cat => ({
          categoryId: cat.id,
          categoryName: cat.name,
          productCount: parseInt(cat.productCount || '0')
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
      const offset = (page - 1) * limit;

      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        return { products: [], total: 0 };
      }

      const normalizedQuery = trimmedQuery.toLowerCase();

      const searchCondition = {
        isActive: true,
        [Op.or]: [
          sequelize.where(
            sequelize.fn('lower', sequelize.col('name')),
            { [Op.like]: `%${normalizedQuery}%` }
          ),
          sequelize.where(
            sequelize.fn('lower', sequelize.col('description')),
            { [Op.like]: `%${normalizedQuery}%` }
          ),
          sequelize.where(
            sequelize.fn('lower', sequelize.col('sku')),
            { [Op.like]: `%${normalizedQuery}%` }
          )
        ]
      };

      const [products, total] = await Promise.all([
        Product.findAll({
          where: searchCondition,
          include: [{ model: Category, as: 'category' }],
          order: [['updatedAt', 'DESC']],
          offset,
          limit
        }),
        Product.count({ where: searchCondition })
      ]);

      return { products, total };
    } catch (error: any) {
      logUtils.logDbOperation('SEARCH', 'products', undefined, error);
      throw error;
    }
  }
}
