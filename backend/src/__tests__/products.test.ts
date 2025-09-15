/**
 * Product API Tests
 * Tests for product management endpoints
 */

import express from 'express';
import productRoutes from '../routes/productRoutes';
import { ApiTestHelper, MockDataGenerator, DatabaseTestUtils, PerformanceTestUtils } from './helpers';

let app: express.Express;
let testHelper: ApiTestHelper;
let dbUtils: DatabaseTestUtils;

beforeAll(async () => {
  // Create test Express app
  app = express();
  app.use(express.json());
  
  // Setup routes
  app.use('/api/products', productRoutes);
  
  // Initialize test helper
  testHelper = new ApiTestHelper(app, (global as any).testSequelize);
  dbUtils = new DatabaseTestUtils((global as any).testSequelize);
  
  await testHelper.initialize();
});

describe('📦 Product API', () => {
  
  describe('GET /api/products', () => {
    
    it('should get all products with pagination', async () => {
      const response = await testHelper.get('/api/products?limit=10&page=1');
      
      testHelper.assertSuccess(response, 200);
      testHelper.assertPagination(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should filter products by category', async () => {
      const testData = testHelper.getTestData();
      const categoryId = testData.categories[1].id; // Computers category
      
      const response = await testHelper.get(`/api/products?categoryId=${categoryId}`);
      
      testHelper.assertSuccess(response, 200);
      
      if (response.body.data.length > 0) {
        expect(response.body.data[0].categoryId).toBe(categoryId);
      }
    });
    
    it('should filter products by price range', async () => {
      const response = await testHelper.get('/api/products?minPrice=500&maxPrice=1500');
      
      testHelper.assertSuccess(response, 200);
      
      response.body.data.forEach((product: any) => {
        expect(product.price).toBeGreaterThanOrEqual(500);
        expect(product.price).toBeLessThanOrEqual(1500);
      });
    });
    
    it('should search products by name', async () => {
      const response = await testHelper.get('/api/products?search=laptop');
      
      testHelper.assertSuccess(response, 200);
      
      if (response.body.data.length > 0) {
        const productNames = response.body.data.map((p: any) => p.name.toLowerCase());
        expect(productNames.some((name: string) => name.includes('laptop'))).toBe(true);
      }
    });
    
    it('should sort products by price', async () => {
      const response = await testHelper.get('/api/products?sortBy=price&sortOrder=asc');
      
      testHelper.assertSuccess(response, 200);
      
      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          expect(response.body.data[i].price).toBeGreaterThanOrEqual(response.body.data[i-1].price);
        }
      }
    });
    
    it('should return only active products by default', async () => {
      const response = await testHelper.get('/api/products');
      
      testHelper.assertSuccess(response, 200);
      
      response.body.data.forEach((product: any) => {
        expect(product.isActive).toBe(true);
      });
    });
    
  });
  
  describe('GET /api/products/:id', () => {
    
    it('should get product by valid ID', async () => {
      const testData = testHelper.getTestData();
      const productId = testData.products[0].id;
      
      const response = await testHelper.get(`/api/products/${productId}`);
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('id', productId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('category');
    });
    
    it('should return 404 for non-existent product', async () => {
      const response = await testHelper.get('/api/products/nonexistent123');
      
      testHelper.assertNotFound(response);
    });
    
    it('should include category information', async () => {
      const testData = testHelper.getTestData();
      const productId = testData.products[0].id;
      
      const response = await testHelper.get(`/api/products/${productId}`);
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data.category).toBeDefined();
      expect(response.body.data.category).toHaveProperty('name');
    });
    
  });
  
  describe('POST /api/products', () => {
    
    it('should create product as admin', async () => {
      const testData = testHelper.getTestData();
      const productData = MockDataGenerator.generateProduct(testData.categories[0].id, {
        name: 'New Test Product',
        sku: 'NEW-TEST-SKU-001'
      });
      
      const response = await testHelper.post('/api/products', productData, 'admin');
      
      testHelper.assertSuccess(response, 201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.sku).toBe(productData.sku);
      
      // Verify product was created in database
      const productExists = await dbUtils.recordExists('products', response.body.data.id);
      expect(productExists).toBe(true);
    });
    
    it('should create product as manager', async () => {
      const testData = testHelper.getTestData();
      const productData = MockDataGenerator.generateProduct(testData.categories[0].id, {
        name: 'Manager Product',
        sku: 'MGR-TEST-SKU-001'
      });
      
      const response = await testHelper.post('/api/products', productData, 'manager');
      
      testHelper.assertSuccess(response, 201);
    });
    
    it('should deny product creation for regular user', async () => {
      const testData = testHelper.getTestData();
      const productData = MockDataGenerator.generateProduct(testData.categories[0].id);
      
      const response = await testHelper.post('/api/products', productData, 'user');
      
      testHelper.assertForbidden(response);
    });
    
    it('should fail with duplicate SKU', async () => {
      const testData = testHelper.getTestData();
      const existingProduct = testData.products[0];
      const productData = MockDataGenerator.generateProduct(testData.categories[0].id, {
        sku: existingProduct.sku // Duplicate SKU
      });
      
      const response = await testHelper.post('/api/products', productData, 'admin');
      
      testHelper.assertError(response, 400, 'already exists');
    });
    
    it('should fail with invalid category ID', async () => {
      const productData = MockDataGenerator.generateProduct('invalid-category-id');
      
      const response = await testHelper.post('/api/products', productData, 'admin');
      
      testHelper.assertError(response, 400, 'not found');
    });
    
    it('should fail without authentication', async () => {
      const testData = testHelper.getTestData();
      const productData = MockDataGenerator.generateProduct(testData.categories[0].id);
      
      const response = await testHelper.post('/api/products', productData);
      
      testHelper.assertUnauthorized(response);
    });
    
    it('should validate required fields', async () => {
      const response = await testHelper.post('/api/products', {
        name: 'Test Product'
        // Missing required fields
      }, 'admin');
      
      testHelper.assertValidationError(response);
    });
    
    it('should validate price is positive', async () => {
      const testData = testHelper.getTestData();
      const productData = MockDataGenerator.generateProduct(testData.categories[0].id, {
        price: -10 // Negative price
      });
      
      const response = await testHelper.post('/api/products', productData, 'admin');
      
      testHelper.assertValidationError(response, 'price');
    });
    
  });
  
  describe('PUT /api/products/:id', () => {
    
    it('should update product as admin', async () => {
      const testData = testHelper.getTestData();
      const productId = testData.products[0].id;
      const updateData = {
        name: 'Updated Product Name',
        price: 199.99
      };
      
      const response = await testHelper.put(`/api/products/${productId}`, updateData, 'admin');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.price).toBe(updateData.price);
    });
    
    it('should update product as manager', async () => {
      const testData = testHelper.getTestData();
      const productId = testData.products[0].id;
      const updateData = {
        description: 'Updated description'
      };
      
      const response = await testHelper.put(`/api/products/${productId}`, updateData, 'manager');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data.description).toBe(updateData.description);
    });
    
    it('should deny update for regular user', async () => {
      const testData = testHelper.getTestData();
      const productId = testData.products[0].id;
      const updateData = { name: 'Hacked Product' };
      
      const response = await testHelper.put(`/api/products/${productId}`, updateData, 'user');
      
      testHelper.assertForbidden(response);
    });
    
    it('should return 404 for non-existent product', async () => {
      const updateData = { name: 'Updated Name' };
      
      const response = await testHelper.put('/api/products/nonexistent123', updateData, 'admin');
      
      testHelper.assertNotFound(response);
    });
    
  });
  
  describe('DELETE /api/products/:id', () => {
    
    it('should delete product as admin', async () => {
      // First create a product to delete
      const testData = testHelper.getTestData();
      const productData = MockDataGenerator.generateProduct(testData.categories[0].id, {
        sku: 'DELETE-TEST-SKU'
      });
      
      const createResponse = await testHelper.post('/api/products', productData, 'admin');
      const productId = createResponse.body.data.id;
      
      // Now delete it
      const deleteResponse = await testHelper.delete(`/api/products/${productId}`, 'admin');
      
      testHelper.assertSuccess(deleteResponse, 200);
      
      // Verify product was deleted
      const productExists = await dbUtils.recordExists('products', productId);
      expect(productExists).toBe(false);
    });
    
    it('should deny delete for manager', async () => {
      const testData = testHelper.getTestData();
      const productId = testData.products[0].id;
      
      const response = await testHelper.delete(`/api/products/${productId}`, 'manager');
      
      testHelper.assertForbidden(response);
    });
    
    it('should deny delete for regular user', async () => {
      const testData = testHelper.getTestData();
      const productId = testData.products[0].id;
      
      const response = await testHelper.delete(`/api/products/${productId}`, 'user');
      
      testHelper.assertForbidden(response);
    });
    
    it('should return 404 for non-existent product', async () => {
      const response = await testHelper.delete('/api/products/nonexistent123', 'admin');
      
      testHelper.assertNotFound(response);
    });
    
  });
  
  describe('POST /api/products/:id/stock', () => {
    
    it('should update stock as admin', async () => {
      const testData = testHelper.getTestData();
      const productId = testData.products[0].id;
      const stockUpdate = {
        operation: 'set',
        quantity: 150
      };
      
      const response = await testHelper.post(`/api/products/${productId}/stock`, stockUpdate, 'admin');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data.stock).toBe(stockUpdate.quantity);
    });
    
    it('should increment stock', async () => {
      const testData = testHelper.getTestData();
      const productId = testData.products[0].id;
      
      // Get current stock
      const currentResponse = await testHelper.get(`/api/products/${productId}`);
      const currentStock = currentResponse.body.data.stock;
      
      const stockUpdate = {
        operation: 'increment',
        quantity: 25
      };
      
      const response = await testHelper.post(`/api/products/${productId}/stock`, stockUpdate, 'admin');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data.stock).toBe(currentStock + stockUpdate.quantity);
    });
    
    it('should decrement stock', async () => {
      const testData = testHelper.getTestData();
      const productId = testData.products[0].id;
      
      // Get current stock
      const currentResponse = await testHelper.get(`/api/products/${productId}`);
      const currentStock = currentResponse.body.data.stock;
      
      const stockUpdate = {
        operation: 'decrement',
        quantity: 10
      };
      
      const response = await testHelper.post(`/api/products/${productId}/stock`, stockUpdate, 'admin');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data.stock).toBe(currentStock - stockUpdate.quantity);
    });
    
    it('should prevent negative stock', async () => {
      const testData = testHelper.getTestData();
      const productId = testData.products[0].id;
      
      const stockUpdate = {
        operation: 'decrement',
        quantity: 999999 // More than current stock
      };
      
      const response = await testHelper.post(`/api/products/${productId}/stock`, stockUpdate, 'admin');
      
      testHelper.assertError(response, 400, 'negative');
    });
    
  });
  
  describe('GET /api/products/stats', () => {
    
    it('should get product statistics as admin', async () => {
      const response = await testHelper.get('/api/products/stats', 'admin');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('totalProducts');
      expect(response.body.data).toHaveProperty('activeProducts');
      expect(response.body.data).toHaveProperty('totalValue');
      expect(response.body.data).toHaveProperty('lowStockProducts');
      expect(response.body.data).toHaveProperty('topCategories');
    });
    
    it('should get product statistics as manager', async () => {
      const response = await testHelper.get('/api/products/stats', 'manager');
      
      testHelper.assertSuccess(response, 200);
    });
    
    it('should deny statistics for regular user', async () => {
      const response = await testHelper.get('/api/products/stats', 'user');
      
      testHelper.assertForbidden(response);
    });
    
  });
  
});

describe('⚡ Product Performance Tests', () => {
  
  it('should handle product list requests efficiently', async () => {
    const { duration } = await PerformanceTestUtils.measureTime(async () => {
      return await testHelper.get('/api/products?limit=50');
    });
    
    // Should respond within 1 second
    PerformanceTestUtils.assertResponseTime(duration, 1000);
  });
  
  it('should handle concurrent product requests', async () => {
    const loadTestResult = await PerformanceTestUtils.runLoadTest(
      async () => {
        const response = await testHelper.get('/api/products?limit=10');
        expect(response.status).toBe(200);
        return response;
      },
      5, // 5 concurrent requests
      20  // 20 total requests
    );
    
    expect(loadTestResult.successCount).toBeGreaterThan(15); // At least 75% success rate
    expect(loadTestResult.averageTime).toBeLessThan(2000); // Average under 2 seconds
    
    console.log('Load test results:', loadTestResult);
  });
  
});
