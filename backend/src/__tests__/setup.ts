/**
 * Test Setup and Configuration
 * Global setup for Jest testing environment
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

// Test database configuration
const TEST_DATABASE_URL = 'file:./test.db';

// Global test utilities
declare global {
  var testPrisma: PrismaClient;
  var testPort: number;
  var testServer: any;
}

/**
 * Setup test database
 */
export async function setupTestDatabase(): Promise<PrismaClient> {
  // Set test database URL
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.NODE_ENV = 'test';
  
  // Remove existing test database
  const testDbPath = path.join(process.cwd(), 'test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  try {
    // Push schema to test database
    execSync('npx prisma db push --force-reset', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }
    });
    
    console.log('✅ Test database setup completed');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
  
  // Create Prisma client for tests
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: TEST_DATABASE_URL
      }
    }
  });
  
  await prisma.$connect();
  
  return prisma;
}

/**
 * Cleanup test database
 */
export async function cleanupTestDatabase(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$disconnect();
    
    // Remove test database file
    const testDbPath = path.join(process.cwd(), 'test.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    console.log('✅ Test database cleanup completed');
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
  }
}

/**
 * Seed test database with sample data
 */
export async function seedTestDatabase(prisma: PrismaClient): Promise<{
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
    const adminUser = await prisma.user.create({
      data: {
        username: 'testadmin',
        email: 'admin@test.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFTFx8/tqB5U5.Xn.', // hashed "password123"
        firstName: 'Test',
        lastName: 'Admin',
        role: 'ADMIN'
      }
    });
    users.push(adminUser);
    
    // Manager user
    const managerUser = await prisma.user.create({
      data: {
        username: 'testmanager',
        email: 'manager@test.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFTFx8/tqB5U5.Xn.',
        firstName: 'Test',
        lastName: 'Manager',
        role: 'MANAGER'
      }
    });
    users.push(managerUser);
    
    // Regular user
    const regularUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'user@test.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFTFx8/tqB5U5.Xn.',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER'
      }
    });
    users.push(regularUser);
    
    // Create test categories
    const categories = [];
    
    const electronicsCategory = await prisma.category.create({
      data: {
        name: 'Electronics',
        description: 'Electronic devices and accessories',
        slug: 'electronics',
        sortOrder: 0
      }
    });
    categories.push(electronicsCategory);
    
    const computersCategory = await prisma.category.create({
      data: {
        name: 'Computers',
        description: 'Desktop and laptop computers',
        slug: 'computers',
        parentId: electronicsCategory.id,
        sortOrder: 0
      }
    });
    categories.push(computersCategory);
    
    const phonesCategory = await prisma.category.create({
      data: {
        name: 'Phones',
        description: 'Smartphones and accessories',
        slug: 'phones',
        parentId: electronicsCategory.id,
        sortOrder: 1
      }
    });
    categories.push(phonesCategory);
    
    // Create test products
    const products = [];
    
    const laptop = await prisma.product.create({
      data: {
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
        status: 'ACTIVE'
      }
    });
    products.push(laptop);
    
    const smartphone = await prisma.product.create({
      data: {
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
        status: 'ACTIVE'
      }
    });
    products.push(smartphone);
    
    // Create test orders
    const orders = [];
    
    const testOrder = await prisma.order.create({
      data: {
        orderNumber: 'TEST-ORD-001',
        userId: regularUser.id,
        status: 'PENDING',
        paymentStatus: 'PENDING',
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
        }),
        items: {
          create: [
            {
              productId: laptop.id,
              name: laptop.name,
              sku: laptop.sku,
              quantity: 1,
              price: laptop.price,
              totalPrice: laptop.price
            }
          ]
        }
      },
      include: {
        items: true,
        user: true
      }
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
export async function clearTestDatabase(prisma: PrismaClient): Promise<void> {
  try {
    // Delete in correct order to avoid foreign key constraints
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.userAvatar.deleteMany();
    await prisma.uploadedFile.deleteMany();
    await prisma.user.deleteMany();
    
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
  global.testPrisma = await setupTestDatabase();
  
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
  if (global.testPrisma) {
    await cleanupTestDatabase(global.testPrisma);
  }
  
  console.log('✅ Test environment cleanup completed');
});

/**
 * Clear database before each test suite
 */
beforeEach(async () => {
  if (global.testPrisma) {
    await clearTestDatabase(global.testPrisma);
  }
});
