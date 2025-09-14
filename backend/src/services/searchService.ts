/**
 * Advanced Search Service
 * Unified search across products, categories, orders, and users
 */

import { Product, Category, Order, User, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
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
              searchResults.push(...entityResults.products.map(this.productToSearchResult));
              totalByType.products = entityResults.total;
              break;
            case 'categories':
              searchResults.push(...entityResults.categories.map(this.categoryToSearchResult));
              totalByType.categories = entityResults.total;
              break;
            case 'orders':
              if (userRole === 'ADMIN' || userRole === 'MANAGER') {
                searchResults.push(...entityResults.orders.map(this.orderToSearchResult));
                totalByType.orders = entityResults.total;
              }
              break;
            case 'users':
              if (userRole === 'ADMIN') {
                searchResults.push(...entityResults.users.map(this.userToSearchResult));
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

      const skip = (page - 1) * limit;
      const searchTerms = query.split(' ').filter(term => term.length > 2);

      // Build search conditions
      const searchConditions: Prisma.ProductWhereInput[] = searchTerms.map(term => ({
        OR: [
          { name: { contains: term } },
          { description: { contains: term } },
          { sku: { contains: term } },
          { tags: { contains: term } },
          { category: { name: { contains: term } } },
          { category: { description: { contains: term } } }
        ]
      }));

      const whereClause: Prisma.ProductWhereInput = {
        AND: [
          { isActive: true },
          ...searchConditions,
          // Apply filters
          filters.priceRange ? {
            price: {
              gte: filters.priceRange.min,
              lte: filters.priceRange.max
            }
          } : {},
          filters.categoryIds ? {
            categoryId: { in: filters.categoryIds }
          } : {},
          filters.inStock !== undefined ? {
            stock: filters.inStock ? { gt: 0 } : { lte: 0 }
          } : {},
          filters.status ? {
            status: { in: filters.status }
          } : {}
        ]
      };

      // Determine sort order
      let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
      if (sortBy === 'price') {
        orderBy = { price: sortOrder as any };
      } else if (sortBy === 'name') {
        orderBy = { name: sortOrder as any };
      } else if (sortBy === 'date') {
        orderBy = { createdAt: sortOrder as any };
      }

      // Execute search
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: whereClause,
          include: {
            category: true,
            ...(includeRelated ? {
              orderItems: {
                take: 3,
                orderBy: { order: { createdAt: 'desc' } },
                include: { order: { select: { orderNumber: true, status: true } } }
              }
            } : {})
          },
          orderBy,
          skip,
          take: limit
        }),
        prisma.product.count({ where: whereClause })
      ]);

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

      const skip = (page - 1) * limit;
      const searchTerms = query.split(' ').filter(term => term.length > 2);

      const searchConditions: Prisma.CategoryWhereInput[] = searchTerms.map(term => ({
        OR: [
          { name: { contains: term } },
          { description: { contains: term } },
          { slug: { contains: term } }
        ]
      }));

      const whereClause: Prisma.CategoryWhereInput = {
        AND: [
          { isActive: true },
          ...searchConditions
        ]
      };

      let orderBy: Prisma.CategoryOrderByWithRelationInput = { createdAt: 'desc' };
      if (sortBy === 'name') {
        orderBy = { name: sortOrder as any };
      }

      const [categories, total] = await Promise.all([
        prisma.category.findMany({
          where: whereClause,
          include: {
            parent: true,
            children: { where: { isActive: true }, take: 5 },
            _count: { select: { products: true, children: true } },
            ...(includeRelated ? {
              products: {
                where: { isActive: true },
                take: 3,
                select: { id: true, name: true, price: true, sku: true }
              }
            } : {})
          },
          orderBy,
          skip,
          take: limit
        }),
        prisma.category.count({ where: whereClause })
      ]);

      return { categories, total, page, limit };

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

      const skip = (page - 1) * limit;

      const whereClause: Prisma.OrderWhereInput = {
        AND: [
          userId ? { userId } : {},
          {
            OR: [
              { orderNumber: { contains: query } },
              { user: { firstName: { contains: query } } },
              { user: { lastName: { contains: query } } },
              { user: { email: { contains: query } } },
              { notes: { contains: query } }
            ]
          },
          filters.status ? { status: { in: filters.status } } : {},
          filters.dateRange ? {
            createdAt: {
              gte: filters.dateRange.from,
              lte: filters.dateRange.to
            }
          } : {}
        ]
      };

      let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: 'desc' };
      if (sortBy === 'total') {
        orderBy = { totalAmount: sortOrder as any };
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            items: {
              take: 3,
              include: {
                product: { select: { id: true, name: true, sku: true } }
              }
            },
            _count: { select: { items: true } }
          },
          orderBy,
          skip,
          take: limit
        }),
        prisma.order.count({ where: whereClause })
      ]);

      return { orders, total, page, limit };

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

      const skip = (page - 1) * limit;

      const whereClause: Prisma.UserWhereInput = {
        AND: [
          { isActive: true },
          {
            OR: [
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { email: { contains: query } },
              { username: { contains: query } }
            ]
          },
          filters.role ? { role: { in: filters.role } } : {}
        ]
      };

      let orderBy: Prisma.UserOrderByWithRelationInput = { firstName: 'asc' };
      if (sortBy === 'date') {
        orderBy = { createdAt: sortOrder as any };
      } else if (sortBy === 'email') {
        orderBy = { email: sortOrder as any };
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            emailVerified: true,
            lastLogin: true,
            createdAt: true,
            _count: { select: { orders: true } }
          },
          orderBy,
          skip,
          take: limit
        }),
        prisma.user.count({ where: whereClause })
      ]);

      return { users, total, page, limit };

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
      const productSuggestions = await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query } },
            { sku: { contains: query } }
          ]
        },
        select: { name: true, sku: true },
        take: 5
      });

      // Get category suggestions
      const categorySuggestions = await prisma.category.findMany({
        where: {
          isActive: true,
          name: { contains: query }
        },
        select: { name: true },
        take: 3
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
        const products = await prisma.product.findMany({
          where: {
            isActive: true,
            OR: [
              { name: { startsWith: query } },
              { sku: { startsWith: query } }
            ]
          },
          select: { name: true, sku: true },
          take: 5
        });
        suggestions.push(...products.map(p => p.name), ...products.map(p => p.sku));
      }

      if (!type || type === 'categories') {
        const categories = await prisma.category.findMany({
          where: {
            isActive: true,
            name: { startsWith: query }
          },
          select: { name: true },
          take: 3
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
    return {
      id: product.id,
      type: 'product',
      title: product.name,
      description: product.description,
      subtitle: `€${product.price} • ${product.category?.name || 'No Category'} • Stock: ${product.stock}`,
      url: `/products/${product.id}`,
      imageUrl: product.images?.[0] || null,
      metadata: {
        price: product.price,
        stock: product.stock,
        sku: product.sku,
        category: product.category?.name,
        status: product.status
      },
      relevanceScore: SearchService.calculateRelevanceScore('product', product)
    };
  }

  /**
   * Convert category to search result
   */
  private static categoryToSearchResult(category: any): SearchResultItem {
    return {
      id: category.id,
      type: 'category',
      title: category.name,
      description: category.description,
      subtitle: `${category._count?.products || 0} products • ${category.parent?.name ? `Parent: ${category.parent.name}` : 'Root category'}`,
      url: `/categories/${category.slug}`,
      metadata: {
        slug: category.slug,
        productCount: category._count?.products || 0,
        childrenCount: category._count?.children || 0,
        parent: category.parent?.name
      },
      relevanceScore: SearchService.calculateRelevanceScore('category', category)
    };
  }

  /**
   * Convert order to search result
   */
  private static orderToSearchResult(order: any): SearchResultItem {
    return {
      id: order.id,
      type: 'order',
      title: order.orderNumber,
      description: `Order by ${order.user?.firstName} ${order.user?.lastName}`,
      subtitle: `€${order.totalAmount} • ${order.status} • ${order._count?.items || 0} items`,
      url: `/orders/${order.id}`,
      metadata: {
        status: order.status,
        totalAmount: order.totalAmount,
        itemsCount: order._count?.items || 0,
        customer: `${order.user?.firstName} ${order.user?.lastName}`,
        email: order.user?.email,
        createdAt: order.createdAt
      },
      relevanceScore: SearchService.calculateRelevanceScore('order', order)
    };
  }

  /**
   * Convert user to search result
   */
  private static userToSearchResult(user: any): SearchResultItem {
    return {
      id: user.id,
      type: 'user',
      title: `${user.firstName} ${user.lastName}`,
      description: user.email,
      subtitle: `${user.role} • ${user._count?.orders || 0} orders • ${user.isActive ? 'Active' : 'Inactive'}`,
      url: `/users/${user.id}`,
      metadata: {
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        ordersCount: user._count?.orders || 0,
        lastLogin: user.lastLogin,
        emailVerified: user.emailVerified
      },
      relevanceScore: SearchService.calculateRelevanceScore('user', user)
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
