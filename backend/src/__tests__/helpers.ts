/**
 * Test Helper Utilities
 * Common utilities and helpers for testing
 */

import request from 'supertest';
import { Express } from 'express';
import { Sequelize } from 'sequelize';
import { User, Category, Product, Order, OrderItem, ProductImage, UserAvatar, UploadedFile, UserRole, ProductStatus, OrderStatus, PaymentStatus } from '../models';
import { generateTestToken, seedTestDatabase } from './setup';

/**
 * API Test Helper Class
 */
export class ApiTestHelper {
  private app: Express;
  private sequelize: Sequelize;
  private tokens: Map<string, string> = new Map();
  private testData: any = {};

  constructor(app: Express, sequelize: Sequelize) {
    this.app = app;
    this.sequelize = sequelize;
  }

  /**
   * Initialize test data and tokens
   */
  async initialize(): Promise<void> {
    // Seed database
    this.testData = await seedTestDatabase();
    
    // Generate tokens for different user roles
    this.tokens.set('admin', generateTestToken(this.testData.users[0].id, UserRole.ADMIN));
    this.tokens.set('manager', generateTestToken(this.testData.users[1].id, UserRole.MANAGER));
    this.tokens.set('user', generateTestToken(this.testData.users[2].id, UserRole.USER));
  }

  /**
   * Get test data
   */
  getTestData(): any {
    return this.testData;
  }

  /**
   * Get auth token for role
   */
  getToken(role: 'admin' | 'manager' | 'user'): string {
    const token = this.tokens.get(role);
    if (!token) {
      throw new Error(`Token not found for role: ${role}`);
    }
    return token;
  }

  /**
   * Make authenticated GET request
   */
  async get(endpoint: string, role?: 'admin' | 'manager' | 'user') {
    const req = request(this.app).get(endpoint);
    
    if (role) {
      req.set('Authorization', `Bearer ${this.getToken(role)}`);
    }
    
    return req;
  }

  /**
   * Make authenticated POST request
   */
  async post(endpoint: string, data: any, role?: 'admin' | 'manager' | 'user') {
    const req = request(this.app)
      .post(endpoint)
      .send(data);
    
    if (role) {
      req.set('Authorization', `Bearer ${this.getToken(role)}`);
    }
    
    return req;
  }

  /**
   * Make authenticated PUT request
   */
  async put(endpoint: string, data: any, role?: 'admin' | 'manager' | 'user') {
    const req = request(this.app)
      .put(endpoint)
      .send(data);
    
    if (role) {
      req.set('Authorization', `Bearer ${this.getToken(role)}`);
    }
    
    return req;
  }

  /**
   * Make authenticated DELETE request
   */
  async delete(endpoint: string, role?: 'admin' | 'manager' | 'user') {
    const req = request(this.app).delete(endpoint);
    
    if (role) {
      req.set('Authorization', `Bearer ${this.getToken(role)}`);
    }
    
    return req;
  }

  /**
   * Upload file with authentication
   */
  async uploadFile(endpoint: string, fieldName: string, filePath: string, role: 'admin' | 'manager' | 'user') {
    return request(this.app)
      .post(endpoint)
      .set('Authorization', `Bearer ${this.getToken(role)}`)
      .attach(fieldName, filePath);
  }

  /**
   * Assert successful response
   */
  assertSuccess(response: any, expectedStatus: number = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(true);
  }

  /**
   * Assert error response
   */
  assertError(response: any, expectedStatus: number, expectedMessage?: string): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(false);
    
    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }

  /**
   * Assert validation error
   */
  assertValidationError(response: any, field?: string): void {
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Validation');
    
    if (field) {
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field })
        ])
      );
    }
  }

  /**
   * Assert pagination structure
   */
  assertPagination(response: any, expectedTotal?: number): void {
    this.assertSuccess(response);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination).toHaveProperty('page');
    expect(response.body.pagination).toHaveProperty('limit');
    expect(response.body.pagination).toHaveProperty('total');
    expect(response.body.pagination).toHaveProperty('totalPages');
    expect(response.body.pagination).toHaveProperty('hasNext');
    expect(response.body.pagination).toHaveProperty('hasPrev');
    
    if (expectedTotal !== undefined) {
      expect(response.body.pagination.total).toBe(expectedTotal);
    }
  }

  /**
   * Assert unauthorized access
   */
  assertUnauthorized(response: any): void {
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  }

  /**
   * Assert forbidden access
   */
  assertForbidden(response: any): void {
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  }

  /**
   * Assert not found
   */
  assertNotFound(response: any): void {
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  }
}

/**
 * Mock Data Generators
 */
export class MockDataGenerator {
  
  /**
   * Generate mock user data
   */
  static generateUser(overrides: any = {}): any {
    return {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER,
      ...overrides
    };
  }

  /**
   * Generate mock product data
   */
  static generateProduct(categoryId: string, overrides: any = {}): any {
    const timestamp = Date.now();
    return {
      name: `Test Product ${timestamp}`,
      description: `Test product description ${timestamp}`,
      sku: `TEST-SKU-${timestamp}`,
      barcode: `123456789${timestamp.toString().slice(-4)}`,
      categoryId,
      price: 99.99,
      costPrice: 59.99,
      stock: 100,
      minStock: 10,
      maxStock: 500,
      weight: 1000,
      status: ProductStatus.ACTIVE,
      ...overrides
    };
  }

  /**
   * Generate mock category data
   */
  static generateCategory(overrides: any = {}): any {
    const timestamp = Date.now();
    return {
      name: `Test Category ${timestamp}`,
      description: `Test category description ${timestamp}`,
      slug: `test-category-${timestamp}`,
      sortOrder: 0,
      ...overrides
    };
  }

  /**
   * Generate mock order data
   */
  static generateOrder(userId: string, items: any[], overrides: any = {}): any {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = 10.00;
    const taxAmount = subtotal * 0.1;
    const totalAmount = subtotal + shippingCost + taxAmount;

    return {
      userId,
      items,
      subtotal,
      shippingCost,
      taxAmount,
      discountAmount: 0,
      totalAmount,
      currency: 'EUR',
      shippingAddress: {
        name: 'Test User',
        street: '123 Test Street',
        city: 'Test City',
        zipCode: '12345',
        country: 'Italy'
      },
      billingAddress: {
        name: 'Test User',
        street: '123 Test Street',
        city: 'Test City',
        zipCode: '12345',
        country: 'Italy'
      },
      notes: 'Test order notes',
      ...overrides
    };
  }

  /**
   * Generate mock order item
   */
  static generateOrderItem(productId: string, overrides: any = {}): any {
    return {
      productId,
      quantity: 1,
      unitPrice: 99.99,
      ...overrides
    };
  }
}

/**
 * Database Test Utilities
 */
export class DatabaseTestUtils {
  private sequelize: Sequelize;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }

  /**
   * Count records in table
   */
  async countRecords(table: string): Promise<number> {
    switch (table) {
      case 'users':
        return await User.count();
      case 'products':
        return await Product.count();
      case 'categories':
        return await Category.count();
      case 'orders':
        return await Order.count();
      case 'orderItems':
        return await OrderItem.count();
      default:
        throw new Error(`Unknown table: ${table}`);
    }
  }

  /**
   * Check if record exists
   */
  async recordExists(table: string, id: string): Promise<boolean> {
    try {
      let record;
      switch (table) {
        case 'users':
          record = await User.findByPk(id);
          break;
        case 'products':
          record = await Product.findByPk(id);
          break;
        case 'categories':
          record = await Category.findByPk(id);
          break;
        case 'orders':
          record = await Order.findByPk(id);
          break;
        default:
          throw new Error(`Unknown table: ${table}`);
      }
      return record !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get record by ID
   */
  async getRecord(table: string, id: string): Promise<any> {
    switch (table) {
      case 'users':
        return await User.findByPk(id);
      case 'products':
        return await Product.findByPk(id);
      case 'categories':
        return await Category.findByPk(id);
      case 'orders':
        return await Order.findByPk(id);
      default:
        throw new Error(`Unknown table: ${table}`);
    }
  }
}

/**
 * Performance Test Utilities
 */
export class PerformanceTestUtils {
  
  /**
   * Measure execution time
   */
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = process.hrtime();
    const result = await fn();
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
    
    return { result, duration };
  }

  /**
   * Assert response time
   */
  static assertResponseTime(duration: number, maxDuration: number): void {
    expect(duration).toBeLessThan(maxDuration);
  }

  /**
   * Run load test
   */
  static async runLoadTest(
    testFn: () => Promise<any>,
    concurrency: number = 10,
    iterations: number = 100
  ): Promise<{
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    successCount: number;
    errorCount: number;
  }> {
    const results: number[] = [];
    const errors: any[] = [];
    
    const startTime = Date.now();
    
    const batches = Math.ceil(iterations / concurrency);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchPromises: Promise<void>[] = [];
      
      for (let i = 0; i < concurrency && (batch * concurrency + i) < iterations; i++) {
        batchPromises.push(
          (async () => {
            try {
              const { duration } = await this.measureTime(testFn);
              results.push(duration);
            } catch (error) {
              errors.push(error);
            }
          })()
        );
      }
      
      await Promise.all(batchPromises);
    }
    
    const totalTime = Date.now() - startTime;
    const averageTime = results.length > 0 ? results.reduce((a, b) => a + b, 0) / results.length : 0;
    const minTime = results.length > 0 ? Math.min(...results) : 0;
    const maxTime = results.length > 0 ? Math.max(...results) : 0;
    
    return {
      totalTime,
      averageTime,
      minTime,
      maxTime,
      successCount: results.length,
      errorCount: errors.length
    };
  }
}
