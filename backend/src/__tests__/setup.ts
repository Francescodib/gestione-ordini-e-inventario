/**
 * Test Setup and Configuration
 * Global setup for Jest testing environment
 */

import { Sequelize } from 'sequelize';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

// Import models and enums
import { sequelize, User, Category, Product, Order, OrderItem, ProductImage, UserAvatar, UploadedFile } from '../models';
import { UserRole, ProductStatus, OrderStatus, PaymentStatus } from '../models';

// Test database configuration
const TEST_DATABASE_PATH = path.join(process.cwd(), 'test.db');

// Global test utilities
declare global {
  var testSequelize: Sequelize;
  var testPort: number;
  var testServer: any;
}

/**
 * Setup test database
 */
export async function setupTestDatabase(): Promise<Sequelize> {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = `file:${TEST_DATABASE_PATH}`;
  
  // Remove existing test database
  if (fs.existsSync(TEST_DATABASE_PATH)) {
    fs.unlinkSync(TEST_DATABASE_PATH);
  }
  
  try {
    // Test connection with main sequelize instance
    await sequelize.authenticate();
    
    // Sync all models to create tables
    await sequelize.sync({ force: true });
    
    console.log('✅ Test database setup completed');
    return sequelize;
    
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
}

/**
 * Cleanup test database
 */
export async function cleanupTestDatabase(testSequelize: Sequelize): Promise<void> {
  try {
    await testSequelize.close();
    
    // Remove test database file
    if (fs.existsSync(TEST_DATABASE_PATH)) {
      fs.unlinkSync(TEST_DATABASE_PATH);
    }
    
    console.log('✅ Test database cleanup completed');
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
  }
}

/**
 * Seed test database with sample data
 */
export async function seedTestDatabase(): Promise<{
  users: any[];
  categories: any[];
  products: any[];
  orders: any[];
}> {
  try {
    console.log('🌱 Seeding test database...');
    
    // Create test users
    const users = [];
    
    // Admin user
    const adminUser = await User.create({
      username: 'testadmin',
      email: 'admin@test.com',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFTFx8/tqB5U5.Xn.', // hashed "password123"
      firstName: 'Test',
      lastName: 'Admin',
      role: UserRole.ADMIN
    });
    users.push(adminUser);
    
    // Manager user
    const managerUser = await User.create({
      username: 'testmanager',
      email: 'manager@test.com',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFTFx8/tqB5U5.Xn.',
      firstName: 'Test',
      lastName: 'Manager',
      role: UserRole.MANAGER
    });
    users.push(managerUser);
    
    // Regular user
    const regularUser = await User.create({
      username: 'testuser',
      email: 'user@test.com',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFTFx8/tqB5U5.Xn.',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER
    });
    users.push(regularUser);
    
    // Create test categories
    const categories = [];
    
    const electronicsCategory = await Category.create({
      name: 'Electronics',
      description: 'Electronic devices and accessories',
      slug: 'electronics',
      sortOrder: 0
    });
    categories.push(electronicsCategory);
    
    const computersCategory = await Category.create({
      name: 'Computers',
      description: 'Desktop and laptop computers',
      slug: 'computers',
      parentId: electronicsCategory.id,
      sortOrder: 0
    });
    categories.push(computersCategory);
    
    const phonesCategory = await Category.create({
      name: 'Phones',
      description: 'Smartphones and accessories',
      slug: 'phones',
      parentId: electronicsCategory.id,
      sortOrder: 1
    });
    categories.push(phonesCategory);
    
    // Create test products
    const products = [];
    
    const laptop = await Product.create({
      name: 'Test Laptop',
      description: 'High-performance test laptop',
      sku: 'TEST-LAPTOP-001',
      barcode: '1234567890123',
      categoryId: computersCategory.id,
      price: 999.99,
      costPrice: 699.99,
      stock: 50,
      minStock: 5,
      maxStock: 100,
      weight: 2500,
      status: ProductStatus.ACTIVE
    });
    products.push(laptop);
    
    const smartphone = await Product.create({
      name: 'Test Smartphone',
      description: 'Latest test smartphone',
      sku: 'TEST-PHONE-001',
      barcode: '1234567890124',
      categoryId: phonesCategory.id,
      price: 599.99,
      costPrice: 399.99,
      stock: 25,
      minStock: 3,
      maxStock: 50,
      weight: 200,
      status: ProductStatus.ACTIVE
    });
    products.push(smartphone);
    
    // Create test orders
    const orders = [];
    
    const testOrder = await Order.create({
      orderNumber: 'TEST-ORD-001',
      userId: regularUser.id,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      subtotal: 999.99,
      shippingCost: 10.00,
      taxAmount: 100.00,
      discountAmount: 0,
      totalAmount: 1109.99,
      currency: 'EUR',
      shippingAddress: JSON.stringify({
        name: 'Test User',
        street: '123 Test Street',
        city: 'Test City',
        zipCode: '12345',
        country: 'Italy'
      }),
      billingAddress: JSON.stringify({
        name: 'Test User',
        street: '123 Test Street',
        city: 'Test City',
        zipCode: '12345',
        country: 'Italy'
      })
    });
    
    // Create order item
    await OrderItem.create({
      orderId: testOrder.id,
      productId: laptop.id,
      name: laptop.name,
      sku: laptop.sku,
      quantity: 1,
      price: laptop.price,
      totalPrice: laptop.price
    });
    
    orders.push(testOrder);
    
    console.log('✅ Test database seeded successfully');
    
    return {
      users,
      categories,
      products,
      orders
    };
    
  } catch (error) {
    console.error('❌ Test database seeding failed:', error);
    throw error;
  }
}

/**
 * Clear test database
 */
export async function clearTestDatabase(): Promise<void> {
  try {
    // Delete in correct order to avoid foreign key constraints
    await OrderItem.destroy({ where: {}, truncate: true });
    await Order.destroy({ where: {}, truncate: true });
    await ProductImage.destroy({ where: {}, truncate: true });
    await Product.destroy({ where: {}, truncate: true });
    await Category.destroy({ where: {}, truncate: true });
    await UserAvatar.destroy({ where: {}, truncate: true });
    await UploadedFile.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });
    
    console.log('✅ Test database cleared');
  } catch (error) {
    console.error('❌ Test database clear failed:', error);
    throw error;
  }
}

/**
 * Generate test JWT token
 */
export function generateTestToken(userId: string, role: string = 'USER'): string {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
  
  return jwt.sign(
    { 
      userId, 
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    },
    JWT_SECRET
  );
}

/**
 * Jest global setup
 */
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  
  // Setup test database
  global.testSequelize = await setupTestDatabase();
  
  // Set random test port
  global.testPort = 3001 + Math.floor(Math.random() * 1000);
  
  console.log(`✅ Test environment ready on port ${global.testPort}`);
});

/**
 * Jest global teardown
 */
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Close test server if running
  if (global.testServer) {
    await new Promise((resolve) => {
      global.testServer.close(resolve);
    });
  }
  
  // Cleanup test database
  if (global.testSequelize) {
    await cleanupTestDatabase(global.testSequelize);
  }
  
  console.log('✅ Test environment cleanup completed');
});

/**
 * Clear database before each test suite
 */
beforeEach(async () => {
  if (global.testSequelize) {
    await clearTestDatabase();
  }
});
