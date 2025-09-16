/**
 * Advanced Search Service
 * Unified search across products, categories, orders, and users
 */

import { Op } from 'sequelize';
import { Product, Category, Order, User, OrderItem } from '../models';
import { logger, logUtils } from '../config/logger';
// Note: Search types are defined inline in this service for now
// Future migration: move to ../types/search.ts

/**
 * Search interfaces and types
 */
export interface GlobalSearchOptions {
  query: string;
  entities?: ('products' | 'categories' | 'orders' | 'users')[];
  limit?: number;
  page?: number;
  sortBy?: 'relevance' | 'date' | 'name' | 'price';
  sortOrder?: 'asc' | 'desc';
  filters?: {
    priceRange?: { min?: number; max?: number; };
    categoryIds?: string[];
    status?: string[];
    dateRange?: { from?: Date; to?: Date; };
    inStock?: boolean;
    isActive?: boolean;
  };
  userId?: string; // For permission-based filtering
  userRole?: string;
}

export interface SearchResultItem {
  id: string;
  type: 'product' | 'category' | 'order' | 'user';
  title: string;
  description?: string;
  subtitle?: string;
  url?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
  relevanceScore?: number;
}

export interface GlobalSearchResults {
  results: SearchResultItem[];
  total: number;
  totalByType: {
    products: number;
    categories: number;
    orders: number;
    users: number;
  };
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  searchTime: number;
  suggestions?: string[];
}

export interface EntitySearchOptions {
  query: string;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  includeRelated?: boolean;
}

/**
 * Advanced Search Service Class
 */
export class SearchService {

  // ==========================================
  // GLOBAL UNIFIED SEARCH
  // ==========================================

  /**
   * Global search across all entities
   */
  static async globalSearch(options: GlobalSearchOptions): Promise<GlobalSearchResults> {
    try {
      const startTime = Date.now();
      const {
        query,
        entities = ['products', 'categories', 'orders', 'users'],
        limit = 20,
        page = 1,
        sortBy = 'relevance',
        sortOrder = 'desc',
        filters = {},
        userId,
        userRole
      } = options;

      if (!query || query.trim().length === 0) {
        throw new Error('Search query is required');
      }

      const searchQuery = query.trim().toLowerCase();
      const skip = (page - 1) * limit;

      // Parallel searches across all requested entities
      const searchPromises: Promise<any>[] = [];
      const searchResults: SearchResultItem[] = [];
      const totalByType = { products: 0, categories: 0, orders: 0, users: 0 };

      // Products search
      if (entities.includes('products')) {
        searchPromises.push(
          this.searchProducts({
            query: searchQuery,
            limit: Math.ceil(limit / entities.length),
            page: 1,
            filters,
            includeRelated: true
          })
        );
      }

      // Categories search
      if (entities.includes('categories')) {
        searchPromises.push(
          this.searchCategories({
            query: searchQuery,
            limit: Math.ceil(limit / entities.length),
            page: 1,
            filters,
            includeRelated: true
          })
        );
      }

      // Orders search (admin/manager only)
      if (entities.includes('orders') && (userRole === 'ADMIN' || userRole === 'MANAGER')) {
        searchPromises.push(
          this.searchOrders({
            query: searchQuery,
            limit: Math.ceil(limit / entities.length),
            page: 1,
            filters,
            userId: userRole === 'ADMIN' ? undefined : userId
          })
        );
      }

      // Users search (admin only)
      if (entities.includes('users') && userRole === 'ADMIN') {
        searchPromises.push(
          this.searchUsers({
            query: searchQuery,
            limit: Math.ceil(limit / entities.length),
            page: 1,
            filters
          })
        );
      }

      // Execute all searches in parallel
      const results = await Promise.allSettled(searchPromises);

      // Process results
      let entityIndex = 0;
      for (const entityType of entities) {
        if (results[entityIndex] && results[entityIndex].status === 'fulfilled') {
          const entityResults = (results[entityIndex] as PromiseFulfilledResult<any>).value;
          
          switch (entityType) {
            case 'products':
              searchResults.push(...entityResults.products.map((product: any) => this.productToSearchResult(product)));
              totalByType.products = entityResults.total;
              break;
            case 'categories':
              searchResults.push(...entityResults.categories.map((category: any) => this.categoryToSearchResult(category)));
              totalByType.categories = entityResults.total;
              break;
            case 'orders':
              if (userRole === 'ADMIN' || userRole === 'MANAGER') {
                searchResults.push(...entityResults.orders.map((order: any) => this.orderToSearchResult(order)));
                totalByType.orders = entityResults.total;
              }
              break;
            case 'users':
              if (userRole === 'ADMIN') {
                searchResults.push(...entityResults.users.map((user: any) => this.userToSearchResult(user)));
                totalByType.users = entityResults.total;
              }
              break;
          }
        }
        entityIndex++;
      }

      // Sort results by relevance/date
      const sortedResults = this.sortSearchResults(searchResults, sortBy, sortOrder);

      // Apply pagination to final results
      const paginatedResults = sortedResults.slice(skip, skip + limit);

      // Calculate totals
      const total = searchResults.length;
      const totalPages = Math.ceil(total / limit);
      const searchTime = Date.now() - startTime;

      // Generate search suggestions
      const suggestions = await this.generateSuggestions(searchQuery);

      logUtils.logDbOperation('SEARCH', 'global', searchTime);

      logger.info('Global search completed', {
        query: searchQuery,
        entities,
        totalResults: total,
        searchTime,
        userId,
        userRole
      });

      return {
        results: paginatedResults,
        total,
        totalByType,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        searchTime,
        suggestions
      };

    } catch (error: any) {
      logUtils.logDbOperation('SEARCH', 'global', undefined, error);
      logger.error('Global search failed', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  // ==========================================
  // ENTITY-SPECIFIC SEARCHES
  // ==========================================

  /**
   * Search products with advanced filtering
   */
  static async searchProducts(options: EntitySearchOptions): Promise<{
    products: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const {
        query,
        limit = 10,
        page = 1,
        sortBy = 'relevance',
        sortOrder = 'desc',
        filters = {},
        includeRelated = false
      } = options;

      const offset = (page - 1) * limit;
      const searchTerms = query.split(' ').filter(term => term.length > 2);

      // Build search conditions using Sequelize Op.like for SQLite compatibility (case-insensitive)
      const searchConditions = searchTerms.map(term => ({
        [Op.or]: [
          { name: { [Op.like]: `%${term.toLowerCase()}%` } },
          { description: { [Op.like]: `%${term.toLowerCase()}%` } },
          { sku: { [Op.like]: `%${term.toLowerCase()}%` } },
          { tags: { [Op.like]: `%${term.toLowerCase()}%` } },
          { '$category.name$': { [Op.like]: `%${term.toLowerCase()}%` } },
          { '$category.description$': { [Op.like]: `%${term.toLowerCase()}%` } }
        ]
      }));

      // Build where clause
      const whereClause: any = {
        [Op.and]: [
          { isActive: true },
          ...searchConditions
        ]
      };

      // Apply filters
      if (filters.priceRange) {
        if (filters.priceRange.min !== undefined) {
          whereClause[Op.and].push({ price: { [Op.gte]: filters.priceRange.min } });
        }
        if (filters.priceRange.max !== undefined) {
          whereClause[Op.and].push({ price: { [Op.lte]: filters.priceRange.max } });
        }
      }

      if (filters.categoryIds) {
        whereClause[Op.and].push({ categoryId: { [Op.in]: filters.categoryIds } });
      }

      if (filters.inStock !== undefined) {
        whereClause[Op.and].push({
          stock: filters.inStock ? { [Op.gt]: 0 } : { [Op.lte]: 0 }
        });
      }

      if (filters.status) {
        whereClause[Op.and].push({ status: { [Op.in]: filters.status } });
      }

      // Determine sort order
      let order: any[] = [['createdAt', 'DESC']];
      if (sortBy === 'price') {
        order = [['price', sortOrder.toUpperCase()]];
      } else if (sortBy === 'name') {
        order = [['name', sortOrder.toUpperCase()]];
      } else if (sortBy === 'date') {
        order = [['createdAt', sortOrder.toUpperCase()]];
      }

      // Build include options
      const includeOptions: any[] = [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'description', 'slug']
        }
      ];

      if (includeRelated) {
        includeOptions.push({
          model: OrderItem,
          as: 'orderItems',
          limit: 3,
          include: [{
            model: Order,
            as: 'order',
            attributes: ['orderNumber', 'status']
          }],
          order: [['createdAt', 'DESC']]
        });
      }

      // Execute search using findAndCountAll
      const { rows: products, count: total } = await Product.findAndCountAll({
        where: whereClause,
        include: includeOptions,
        order,
        offset,
        limit
      });

      return { products, total, page, limit };

    } catch (error: any) {
      logUtils.logDbOperation('SEARCH', 'products', undefined, error);
      throw error;
    }
  }

  /**
   * Search categories with hierarchy
   */
  static async searchCategories(options: EntitySearchOptions): Promise<{
    categories: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const {
        query,
        limit = 10,
        page = 1,
        sortBy = 'relevance',
        sortOrder = 'desc',
        filters = {},
        includeRelated = false
      } = options;

      const offset = (page - 1) * limit;
      const searchTerms = query.split(' ').filter(term => term.length > 2);

      // Build search conditions using Sequelize Op.like for SQLite compatibility (case-insensitive)
      const searchConditions = searchTerms.map(term => ({
        [Op.or]: [
          { name: { [Op.like]: `%${term.toLowerCase()}%` } },
          { description: { [Op.like]: `%${term.toLowerCase()}%` } },
          { slug: { [Op.like]: `%${term.toLowerCase()}%` } }
        ]
      }));

      const whereClause: any = {
        [Op.and]: [
          { isActive: true },
          ...searchConditions
        ]
      };

      // Determine sort order
      let order: any[] = [['createdAt', 'DESC']];
      if (sortBy === 'name') {
        order = [['name', sortOrder.toUpperCase()]];
      }

      // Build include options for hierarchical data
      const includeOptions: any[] = [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name', 'slug']
        },
        {
          model: Category,
          as: 'children',
          where: { isActive: true },
          required: false,
          limit: 5,
          attributes: ['id', 'name', 'slug', 'description']
        }
      ];

      if (includeRelated) {
        includeOptions.push({
          model: Product,
          as: 'products',
          where: { isActive: true },
          required: false,
          limit: 3,
          attributes: ['id', 'name', 'price', 'sku']
        });
      }

      // Execute search using findAndCountAll
      const { rows: categories, count: total } = await Category.findAndCountAll({
        where: whereClause,
        include: includeOptions,
        order,
        offset,
        limit,
        distinct: true // Important for correct count with includes
      });

      // Add counts manually since Sequelize doesn't have direct _count equivalent
      const categoriesWithCounts = await Promise.all(categories.map(async (category: any) => {
        const [productCount, childrenCount] = await Promise.all([
          Product.count({ where: { categoryId: category.id, isActive: true } }),
          Category.count({ where: { parentId: category.id, isActive: true } })
        ]);

        return {
          ...category.toJSON(),
          _count: {
            products: productCount,
            children: childrenCount
          }
        };
      }));

      return { categories: categoriesWithCounts, total, page, limit };

    } catch (error: any) {
      logUtils.logDbOperation('SEARCH', 'categories', undefined, error);
      throw error;
    }
  }

  /**
   * Search orders (admin/manager only)
   */
  static async searchOrders(options: EntitySearchOptions & { userId?: string }): Promise<{
    orders: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const {
        query,
        limit = 10,
        page = 1,
        sortBy = 'date',
        sortOrder = 'desc',
        filters = {},
        userId
      } = options;

      const offset = (page - 1) * limit;

      // Build where clause for orders
      const whereClause: any = {
        [Op.and]: [
          ...(userId ? [{ userId }] : []),
          {
            [Op.or]: [
              { orderNumber: { [Op.like]: `%${query.toLowerCase()}%` } },
              { '$user.firstName$': { [Op.like]: `%${query.toLowerCase()}%` } },
              { '$user.lastName$': { [Op.like]: `%${query.toLowerCase()}%` } },
              { '$user.email$': { [Op.like]: `%${query.toLowerCase()}%` } },
              { notes: { [Op.like]: `%${query.toLowerCase()}%` } }
            ]
          }
        ]
      };

      // Apply filters
      if (filters.status) {
        whereClause[Op.and].push({ status: { [Op.in]: filters.status } });
      }

      if (filters.dateRange) {
        const dateFilter: any = {};
        if (filters.dateRange.from) {
          dateFilter[Op.gte] = filters.dateRange.from;
        }
        if (filters.dateRange.to) {
          dateFilter[Op.lte] = filters.dateRange.to;
        }
        whereClause[Op.and].push({ createdAt: dateFilter });
      }

      // Determine sort order
      let order: any[] = [['createdAt', 'DESC']];
      if (sortBy === 'total') {
        order = [['totalAmount', sortOrder.toUpperCase()]];
      }

      // Execute search using findAndCountAll
      const { rows: orders, count: total } = await Order.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: OrderItem,
            as: 'items',
            limit: 3,
            include: [{
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku']
            }]
          }
        ],
        order,
        offset,
        limit,
        distinct: true // Important for correct count with includes
      });

      // Add counts manually since Sequelize doesn't have direct _count equivalent
      const ordersWithCounts = await Promise.all(orders.map(async (order: any) => {
        const itemsCount = await OrderItem.count({ where: { orderId: order.id } });

        return {
          ...order.toJSON(),
          _count: {
            items: itemsCount
          }
        };
      }));

      return { orders: ordersWithCounts, total, page, limit };

    } catch (error: any) {
      logUtils.logDbOperation('SEARCH', 'orders', undefined, error);
      throw error;
    }
  }

  /**
   * Search users (admin only)
   */
  static async searchUsers(options: EntitySearchOptions): Promise<{
    users: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const {
        query,
        limit = 10,
        page = 1,
        sortBy = 'name',
        sortOrder = 'asc',
        filters = {}
      } = options;

      const offset = (page - 1) * limit;

      // Build where clause for users
      const whereClause: any = {
        [Op.and]: [
          { isActive: true },
          {
            [Op.or]: [
              { firstName: { [Op.like]: `%${query.toLowerCase()}%` } },
              { lastName: { [Op.like]: `%${query.toLowerCase()}%` } },
              { email: { [Op.like]: `%${query.toLowerCase()}%` } },
              { username: { [Op.like]: `%${query.toLowerCase()}%` } }
            ]
          }
        ]
      };

      // Apply filters
      if (filters.role) {
        whereClause[Op.and].push({ role: { [Op.in]: filters.role } });
      }

      // Determine sort order
      let order: any[] = [['firstName', 'ASC']];
      if (sortBy === 'date') {
        order = [['createdAt', sortOrder.toUpperCase()]];
      } else if (sortBy === 'email') {
        order = [['email', sortOrder.toUpperCase()]];
      }

      // Execute search using findAndCountAll
      const { rows: users, count: total } = await User.findAndCountAll({
        where: whereClause,
        attributes: [
          'id',
          'username',
          'email',
          'firstName',
          'lastName',
          'role',
          'isActive',
          'emailVerified',
          'lastLogin',
          'createdAt'
        ],
        order,
        offset,
        limit
      });

      // Add counts manually since Sequelize doesn't have direct _count equivalent
      const usersWithCounts = await Promise.all(users.map(async (user: any) => {
        const ordersCount = await Order.count({ where: { userId: user.id } });

        return {
          ...user.toJSON(),
          _count: {
            orders: ordersCount
          }
        };
      }));

      return { users: usersWithCounts, total, page, limit };

    } catch (error: any) {
      logUtils.logDbOperation('SEARCH', 'users', undefined, error);
      throw error;
    }
  }

  // ==========================================
  // SEARCH SUGGESTIONS AND AUTOCOMPLETE
  // ==========================================

  /**
   * Generate search suggestions based on popular terms
   */
  static async generateSuggestions(query: string): Promise<string[]> {
    try {
      if (query.length < 3) return [];

      // Get product suggestions
      const productSuggestions = await Product.findAll({
        where: {
          isActive: true,
          [Op.or]: [
            { name: { [Op.like]: `%${query.toLowerCase()}%` } },
            { sku: { [Op.like]: `%${query.toLowerCase()}%` } }
          ]
        },
        attributes: ['name', 'sku'],
        limit: 5
      });

      // Get category suggestions
      const categorySuggestions = await Category.findAll({
        where: {
          isActive: true,
          name: { [Op.like]: `%${query.toLowerCase()}%` }
        },
        attributes: ['name'],
        limit: 3
      });

      const suggestions = [
        ...productSuggestions.map(p => p.name),
        ...productSuggestions.map(p => p.sku),
        ...categorySuggestions.map(c => c.name)
      ].filter((value, index, self) => self.indexOf(value) === index);

      return suggestions.slice(0, 8);

    } catch (error: any) {
      logger.error('Failed to generate suggestions', { error: error.message, query });
      return [];
    }
  }

  /**
   * Get autocomplete suggestions for search input
   */
  static async getAutocomplete(query: string, type?: string): Promise<string[]> {
    try {
      if (query.length < 2) return [];

      const suggestions: string[] = [];

      if (!type || type === 'products') {
        const products = await Product.findAll({
          where: {
            isActive: true,
            [Op.or]: [
              { name: { [Op.like]: `${query.toLowerCase()}%` } },
              { sku: { [Op.like]: `${query.toLowerCase()}%` } }
            ]
          },
          attributes: ['name', 'sku'],
          limit: 5
        });
        suggestions.push(...products.map(p => p.name), ...products.map(p => p.sku));
      }

      if (!type || type === 'categories') {
        const categories = await Category.findAll({
          where: {
            isActive: true,
            name: { [Op.like]: `${query.toLowerCase()}%` }
          },
          attributes: ['name'],
          limit: 3
        });
        suggestions.push(...categories.map(c => c.name));
      }

      return suggestions.filter((value, index, self) => self.indexOf(value) === index).slice(0, 10);

    } catch (error: any) {
      logger.error('Failed to get autocomplete', { error: error.message, query, type });
      return [];
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Convert product to search result
   */
  private static productToSearchResult(product: any): SearchResultItem {
    // Convert Sequelize model to plain object if needed
    const productData = product.toJSON ? product.toJSON() : product;
    
    // Parse images array from JSON string if needed
    let imagesArray: string[] = [];
    if (productData.images) {
      try {
        imagesArray = typeof productData.images === 'string' ? JSON.parse(productData.images) : productData.images;
      } catch {
        imagesArray = [];
      }
    }

    return {
      id: productData.id,
      type: 'product',
      title: productData.name,
      description: productData.description,
      subtitle: `€${productData.price} • ${productData.category?.name || 'No Category'} • Stock: ${productData.stock}`,
      url: `/products/${productData.id}`,
      imageUrl: imagesArray[0] || undefined,
      metadata: {
        price: productData.price,
        stock: productData.stock,
        sku: productData.sku,
        category: productData.category?.name,
        status: productData.status
      },
      relevanceScore: SearchService.calculateRelevanceScore('product', productData)
    };
  }

  /**
   * Convert category to search result
   */
  private static categoryToSearchResult(category: any): SearchResultItem {
    // Convert Sequelize model to plain object if needed
    const categoryData = category.toJSON ? category.toJSON() : category;

    return {
      id: categoryData.id,
      type: 'category',
      title: categoryData.name,
      description: categoryData.description,
      subtitle: `${categoryData._count?.products || 0} products • ${categoryData.parent?.name ? `Parent: ${categoryData.parent.name}` : 'Root category'}`,
      url: `/categories/${categoryData.slug}`,
      metadata: {
        slug: categoryData.slug,
        productCount: categoryData._count?.products || 0,
        childrenCount: categoryData._count?.children || 0,
        parent: categoryData.parent?.name
      },
      relevanceScore: SearchService.calculateRelevanceScore('category', categoryData)
    };
  }

  /**
   * Convert order to search result
   */
  private static orderToSearchResult(order: any): SearchResultItem {
    // Convert Sequelize model to plain object if needed
    const orderData = order.toJSON ? order.toJSON() : order;

    return {
      id: orderData.id,
      type: 'order',
      title: orderData.orderNumber,
      description: `Order by ${orderData.user?.firstName} ${orderData.user?.lastName}`,
      subtitle: `€${orderData.totalAmount} • ${orderData.status} • ${orderData._count?.items || 0} items`,
      url: `/orders/${orderData.id}`,
      metadata: {
        status: orderData.status,
        totalAmount: orderData.totalAmount,
        itemsCount: orderData._count?.items || 0,
        customer: `${orderData.user?.firstName} ${orderData.user?.lastName}`,
        email: orderData.user?.email,
        createdAt: orderData.createdAt
      },
      relevanceScore: SearchService.calculateRelevanceScore('order', orderData)
    };
  }

  /**
   * Convert user to search result
   */
  private static userToSearchResult(user: any): SearchResultItem {
    // Convert Sequelize model to plain object if needed
    const userData = user.toJSON ? user.toJSON() : user;

    return {
      id: userData.id,
      type: 'user',
      title: `${userData.firstName} ${userData.lastName}`,
      description: userData.email,
      subtitle: `${userData.role} • ${userData._count?.orders || 0} orders • ${userData.isActive ? 'Active' : 'Inactive'}`,
      url: `/users/${userData.id}`,
      metadata: {
        email: userData.email,
        role: userData.role,
        isActive: userData.isActive,
        ordersCount: userData._count?.orders || 0,
        lastLogin: userData.lastLogin,
        emailVerified: userData.emailVerified
      },
      relevanceScore: SearchService.calculateRelevanceScore('user', userData)
    };
  }

  /**
   * Calculate relevance score for search results
   */
  private static calculateRelevanceScore(type: string, item: any): number {
    let score = 0;

    switch (type) {
      case 'product':
        // Higher score for products with more stock, lower price variance, recent updates
        score += item.stock > 0 ? 10 : 0;
        score += item.price < 100 ? 5 : item.price < 500 ? 3 : 1;
        score += item.status === 'ACTIVE' ? 5 : 0;
        break;
      case 'category':
        // Higher score for categories with more products
        score += Math.min(item._count?.products || 0, 20);
        score += item.parent ? 3 : 5; // Root categories get slightly higher score
        break;
      case 'order':
        // Higher score for recent orders
        const daysSinceOrder = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 30 - daysSinceOrder);
        score += item.status === 'PENDING' ? 10 : item.status === 'PROCESSING' ? 8 : 5;
        break;
      case 'user':
        // Higher score for active users with more orders
        score += item.isActive ? 10 : 0;
        score += Math.min(item._count?.orders || 0, 15);
        score += item.emailVerified ? 5 : 0;
        break;
    }

    return Math.min(score, 100);
  }

  /**
   * Sort search results
   */
  private static sortSearchResults(
    results: SearchResultItem[],
    sortBy: string,
    sortOrder: string
  ): SearchResultItem[] {
    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
          break;
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          const aDate = a.metadata?.createdAt || new Date(0);
          const bDate = b.metadata?.createdAt || new Date(0);
          comparison = new Date(bDate).getTime() - new Date(aDate).getTime();
          break;
        case 'price':
          const aPrice = a.metadata?.price || a.metadata?.totalAmount || 0;
          const bPrice = b.metadata?.price || b.metadata?.totalAmount || 0;
          comparison = aPrice - bPrice;
          break;
        default:
          comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
      }

      return sortOrder === 'desc' ? comparison : -comparison;
    });
  }
}
