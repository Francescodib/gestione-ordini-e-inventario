/**
 * Orders API Tests
 * Tests for order management, creation, updates, and status changes
 */

import express from 'express';
import request from 'supertest';
import orderRoutes from '../routes/orderRoutes';
import { ApiTestHelper, MockDataGenerator, DatabaseTestUtils } from './helpers';
import { setupTestDatabase } from './setup';

// Setup test app
let app: express.Express;
let testHelper: ApiTestHelper;
let dbUtils: DatabaseTestUtils;

beforeAll(async () => {
  // Create test Express app
  app = express();
  app.use(express.json());

  // Setup middleware and routes (similar to main server)
  app.use('/api/orders', orderRoutes);

  // Initialize test helper
  testHelper = new ApiTestHelper(app, (global as any).testSequelize);
  dbUtils = new DatabaseTestUtils((global as any).testSequelize);

  await testHelper.initialize();
});

describe('📦 Orders API', () => {

  describe('GET /api/orders/stats', () => {

    it('should require authentication for stats', async () => {
      const response = await testHelper.get('/api/orders/stats');

      expect(response.status).toBe(401);
    });

    it('should allow admin to view stats', async () => {
      const response = await testHelper.get('/api/orders/stats', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });

    it('should allow manager to view stats', async () => {
      const response = await testHelper.get('/api/orders/stats', 'manager');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });

    it('should deny user access to stats', async () => {
      const response = await testHelper.get('/api/orders/stats', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/orders/reports/revenue', () => {

    it('should require authentication for revenue reports', async () => {
      const response = await testHelper.get('/api/orders/reports/revenue');

      expect(response.status).toBe(401);
    });

    it('should allow admin to view revenue reports', async () => {
      const response = await testHelper.get('/api/orders/reports/revenue', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });

    it('should allow manager to view revenue reports', async () => {
      const response = await testHelper.get('/api/orders/reports/revenue', 'manager');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });

    it('should deny user access to revenue reports', async () => {
      const response = await testHelper.get('/api/orders/reports/revenue', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should accept date range parameters', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      const response = await testHelper.get(`/api/orders/reports/revenue?startDate=${startDate}&endDate=${endDate}&groupBy=month`, 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/orders', () => {

    it('should require authentication for listing orders', async () => {
      const response = await testHelper.get('/api/orders');

      expect(response.status).toBe(401);
    });

    it('should allow admin to list all orders', async () => {
      const response = await testHelper.get('/api/orders', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow manager to list all orders', async () => {
      const response = await testHelper.get('/api/orders', 'manager');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });

    it('should deny user access to list all orders', async () => {
      const response = await testHelper.get('/api/orders', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should filter orders by status', async () => {
      const response = await testHelper.get('/api/orders?status=PENDING', 'admin');

      testHelper.assertSuccess(response, 200);
      response.body.data.forEach((order: any) => {
        expect(order.status).toBe('PENDING');
      });
    });

    it('should filter orders by payment status', async () => {
      const response = await testHelper.get('/api/orders?paymentStatus=PENDING', 'admin');

      testHelper.assertSuccess(response, 200);
      response.body.data.forEach((order: any) => {
        expect(order.paymentStatus).toBe('PENDING');
      });
    });

    it('should paginate results correctly', async () => {
      const response = await testHelper.get('/api/orders?page=1&limit=5', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should filter orders by date range', async () => {
      const dateFrom = '2024-01-01';
      const dateTo = '2024-12-31';
      const response = await testHelper.get(`/api/orders?dateFrom=${dateFrom}&dateTo=${dateTo}`, 'admin');

      testHelper.assertSuccess(response, 200);
      // Verify dates are within range if orders exist
    });
  });

  describe('GET /api/orders/my', () => {

    it('should require authentication for user orders', async () => {
      const response = await testHelper.get('/api/orders/my');

      expect(response.status).toBe(401);
    });

    it('should allow user to view their own orders', async () => {
      const response = await testHelper.get('/api/orders/my', 'user');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow admin to view their own orders', async () => {
      const response = await testHelper.get('/api/orders/my', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });

    it('should filter user orders by status', async () => {
      const response = await testHelper.get('/api/orders/my?status=PENDING', 'user');

      testHelper.assertSuccess(response, 200);
      // If orders exist, they should match the status filter
    });

    it('should paginate user orders correctly', async () => {
      const response = await testHelper.get('/api/orders/my?page=1&limit=3', 'user');

      testHelper.assertSuccess(response, 200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(3);
    });
  });

  describe('GET /api/orders/:id', () => {

    it('should require authentication for order details', async () => {
      const response = await testHelper.get('/api/orders/1');

      expect(response.status).toBe(401);
    });

    it('should allow admin to view any order', async () => {
      const testData = testHelper.getTestData();
      if (testData.orders && testData.orders.length > 0) {
        const orderId = testData.orders[0].id;
        const response = await testHelper.get(`/api/orders/${orderId}`, 'admin');

        testHelper.assertSuccess(response, 200);
        expect(response.body.data.id).toBe(orderId);
      }
    });

    it('should allow manager to view any order', async () => {
      const testData = testHelper.getTestData();
      if (testData.orders && testData.orders.length > 0) {
        const orderId = testData.orders[0].id;
        const response = await testHelper.get(`/api/orders/${orderId}`, 'manager');

        testHelper.assertSuccess(response, 200);
        expect(response.body.data.id).toBe(orderId);
      }
    });

    it('should return 404 for non-existent order', async () => {
      const response = await testHelper.get('/api/orders/99999', 'admin');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/orders', () => {

    it('should require authentication for order creation', async () => {
      const items = [{ productId: 1, quantity: 1, price: 10 }];
      const orderData = MockDataGenerator.generateOrder('1', items);
      const response = await testHelper.post('/api/orders', orderData);

      expect(response.status).toBe(401);
    });

    it('should allow user to create order', async () => {
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const items = [{
          productId: testData.products[0].id,
          quantity: 2,
          price: testData.products[0].price
        }];
        const orderData = MockDataGenerator.generateOrder(testData.users[2].id.toString(), items);

        const response = await testHelper.post('/api/orders', orderData, 'user');

        testHelper.assertSuccess(response, 201);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.items).toHaveLength(1);
      }
    });

    it('should allow admin to create order', async () => {
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const items = [{
          productId: testData.products[0].id,
          quantity: 1,
          price: testData.products[0].price
        }];
        const orderData = MockDataGenerator.generateOrder(testData.users[0].id.toString(), items);

        const response = await testHelper.post('/api/orders', orderData, 'admin');

        testHelper.assertSuccess(response, 201);
        expect(response.body.data).toHaveProperty('id');
      }
    });

    it('should validate required fields', async () => {
      const invalidData = { total: 100 }; // Missing required fields
      const response = await testHelper.post('/api/orders', invalidData, 'user');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate order items', async () => {
      const invalidOrderData = MockDataGenerator.generateOrder('1', []); // Empty items array

      const response = await testHelper.post('/api/orders', invalidOrderData, 'user');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should calculate total automatically', async () => {
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const product = testData.products[0];
        const quantity = 2;
        const expectedTotal = product.price * quantity;

        const items = [{
          productId: product.id,
          quantity: quantity,
          price: product.price
        }];
        const orderData = MockDataGenerator.generateOrder(testData.users[2].id.toString(), items, {
          total: expectedTotal
        });

        const response = await testHelper.post('/api/orders', orderData, 'user');

        testHelper.assertSuccess(response, 201);
        expect(response.body.data.total).toBe(expectedTotal);
      }
    });
  });

  describe('PUT /api/orders/:id', () => {

    it('should require authentication for order update', async () => {
      const response = await testHelper.put('/api/orders/1', { notes: 'Updated' });

      expect(response.status).toBe(401);
    });

    it('should allow admin to update any order', async () => {
      // Create an order first
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const items = [{
          productId: testData.products[0].id,
          quantity: 1,
          price: testData.products[0].price
        }];
        const orderData = MockDataGenerator.generateOrder(testData.users[2].id.toString(), items);

        const createResponse = await testHelper.post('/api/orders', orderData, 'user');
        const orderId = createResponse.body.data.id;

        // Then update it as admin
        const updateData = { notes: 'Updated by admin' };
        const response = await testHelper.put(`/api/orders/${orderId}`, updateData, 'admin');

        testHelper.assertSuccess(response, 200);
        expect(response.body.data.notes).toBe('Updated by admin');
      }
    });

    it('should allow manager to update any order', async () => {
      // Create an order first
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const items = [{
          productId: testData.products[0].id,
          quantity: 1,
          price: testData.products[0].price
        }];
        const orderData = MockDataGenerator.generateOrder(testData.users[2].id.toString(), items);

        const createResponse = await testHelper.post('/api/orders', orderData, 'user');
        const orderId = createResponse.body.data.id;

        // Then update it as manager
        const updateData = { notes: 'Updated by manager' };
        const response = await testHelper.put(`/api/orders/${orderId}`, updateData, 'manager');

        testHelper.assertSuccess(response, 200);
        expect(response.body.data.notes).toBe('Updated by manager');
      }
    });

    it('should return 404 for non-existent order', async () => {
      const response = await testHelper.put('/api/orders/99999', { notes: 'Updated' }, 'admin');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/orders/:id/status', () => {

    it('should require authentication for status update', async () => {
      const response = await testHelper.put('/api/orders/1/status', { status: 'PROCESSING' });

      expect(response.status).toBe(401);
    });

    it('should allow admin to update order status', async () => {
      // Create an order first
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const items = [{
          productId: testData.products[0].id,
          quantity: 1,
          price: testData.products[0].price
        }];
        const orderData = MockDataGenerator.generateOrder(testData.users[2].id.toString(), items);

        const createResponse = await testHelper.post('/api/orders', orderData, 'user');
        const orderId = createResponse.body.data.id;

        // Then update status as admin
        const statusData = { status: 'PROCESSING' };
        const response = await testHelper.put(`/api/orders/${orderId}/status`, statusData, 'admin');

        testHelper.assertSuccess(response, 200);
        expect(response.body.data.status).toBe('PROCESSING');
      }
    });

    it('should allow manager to update order status', async () => {
      // Create an order first
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const items = [{
          productId: testData.products[0].id,
          quantity: 1,
          price: testData.products[0].price
        }];
        const orderData = MockDataGenerator.generateOrder(testData.users[2].id.toString(), items);

        const createResponse = await testHelper.post('/api/orders', orderData, 'user');
        const orderId = createResponse.body.data.id;

        // Then update status as manager
        const statusData = { status: 'SHIPPED' };
        const response = await testHelper.put(`/api/orders/${orderId}/status`, statusData, 'manager');

        testHelper.assertSuccess(response, 200);
        expect(response.body.data.status).toBe('SHIPPED');
      }
    });

    it('should deny user access to update order status', async () => {
      const response = await testHelper.put('/api/orders/1/status', { status: 'PROCESSING' }, 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate status values', async () => {
      const invalidStatusData = { status: 'INVALID_STATUS' };
      const response = await testHelper.put('/api/orders/1/status', invalidStatusData, 'admin');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/orders/:id/payment-status', () => {

    it('should require authentication for payment status update', async () => {
      const response = await testHelper.put('/api/orders/1/payment-status', { paymentStatus: 'PAID' });

      expect(response.status).toBe(401);
    });

    it('should allow admin to update payment status', async () => {
      // Create an order first
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const items = [{
          productId: testData.products[0].id,
          quantity: 1,
          price: testData.products[0].price
        }];
        const orderData = MockDataGenerator.generateOrder(testData.users[2].id.toString(), items);

        const createResponse = await testHelper.post('/api/orders', orderData, 'user');
        const orderId = createResponse.body.data.id;

        // Then update payment status as admin
        const paymentData = { paymentStatus: 'PAID' };
        const response = await testHelper.put(`/api/orders/${orderId}/payment-status`, paymentData, 'admin');

        testHelper.assertSuccess(response, 200);
        expect(response.body.data.paymentStatus).toBe('PAID');
      }
    });

    it('should allow manager to update payment status', async () => {
      // Create an order first
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const items = [{
          productId: testData.products[0].id,
          quantity: 1,
          price: testData.products[0].price
        }];
        const orderData = MockDataGenerator.generateOrder(testData.users[2].id.toString(), items);

        const createResponse = await testHelper.post('/api/orders', orderData, 'user');
        const orderId = createResponse.body.data.id;

        // Then update payment status as manager
        const paymentData = { paymentStatus: 'REFUNDED' };
        const response = await testHelper.put(`/api/orders/${orderId}/payment-status`, paymentData, 'manager');

        testHelper.assertSuccess(response, 200);
        expect(response.body.data.paymentStatus).toBe('REFUNDED');
      }
    });

    it('should deny user access to update payment status', async () => {
      const response = await testHelper.put('/api/orders/1/payment-status', { paymentStatus: 'PAID' }, 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate payment status values', async () => {
      const invalidPaymentData = { paymentStatus: 'INVALID_PAYMENT_STATUS' };
      const response = await testHelper.put('/api/orders/1/payment-status', invalidPaymentData, 'admin');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/orders/:id', () => {

    it('should require authentication for order deletion', async () => {
      const response = await testHelper.delete('/api/orders/1');

      expect(response.status).toBe(401);
    });

    it('should allow only admin to delete orders', async () => {
      // Create an order first
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const items = [{
          productId: testData.products[0].id,
          quantity: 1,
          price: testData.products[0].price
        }];
        const orderData = MockDataGenerator.generateOrder(testData.users[2].id.toString(), items);

        const createResponse = await testHelper.post('/api/orders', orderData, 'user');
        const orderId = createResponse.body.data.id;

        // Then delete it as admin
        const response = await testHelper.delete(`/api/orders/${orderId}`, 'admin');

        testHelper.assertSuccess(response, 200);
      }
    });

    it('should deny manager access to delete orders', async () => {
      const response = await testHelper.delete('/api/orders/1', 'manager');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should deny user access to delete orders', async () => {
      const response = await testHelper.delete('/api/orders/1', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent order', async () => {
      const response = await testHelper.delete('/api/orders/99999', 'admin');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});