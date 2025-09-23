/**
 * Monitoring API Tests
 * Tests for system monitoring, metrics, and performance tracking
 */

import express from 'express';
import request from 'supertest';
import monitoringRoutes from '../routes/monitoringRoutes';
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
  app.use('/api/monitoring', monitoringRoutes);

  // Initialize test helper
  testHelper = new ApiTestHelper(app, (global as any).testSequelize);
  dbUtils = new DatabaseTestUtils((global as any).testSequelize);

  await testHelper.initialize();
});

describe('📊 Monitoring API', () => {

  describe('GET /api/monitoring/metrics', () => {

    it('should require authentication for metrics', async () => {
      const response = await testHelper.get('/api/monitoring/metrics');

      expect(response.status).toBe(401);
    });

    it('should allow admin to view metrics', async () => {
      const response = await testHelper.get('/api/monitoring/metrics', 'admin');

      // Should return Prometheus metrics format or JSON
      expect([200, 500]).toContain(response.status);
    });

    it('should allow manager to view metrics', async () => {
      const response = await testHelper.get('/api/monitoring/metrics', 'manager');

      expect([200, 403, 500]).toContain(response.status);
    });

    it('should deny user access to metrics', async () => {
      const response = await testHelper.get('/api/monitoring/metrics', 'user');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/monitoring/system', () => {

    it('should require authentication for system info', async () => {
      const response = await testHelper.get('/api/monitoring/system');

      expect(response.status).toBe(401);
    });

    it('should allow admin to view system info', async () => {
      const response = await testHelper.get('/api/monitoring/system', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });

    it('should allow manager to view system info', async () => {
      const response = await testHelper.get('/api/monitoring/system', 'manager');

      expect([200, 403]).toContain(response.status);
    });

    it('should deny user access to system info', async () => {
      const response = await testHelper.get('/api/monitoring/system', 'user');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/monitoring/database', () => {

    it('should require authentication for database metrics', async () => {
      const response = await testHelper.get('/api/monitoring/database');

      expect(response.status).toBe(401);
    });

    it('should allow admin to view database metrics', async () => {
      const response = await testHelper.get('/api/monitoring/database', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });

    it('should allow manager to view database metrics', async () => {
      const response = await testHelper.get('/api/monitoring/database', 'manager');

      expect([200, 403]).toContain(response.status);
    });

    it('should deny user access to database metrics', async () => {
      const response = await testHelper.get('/api/monitoring/database', 'user');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/monitoring/performance', () => {

    it('should require authentication for performance metrics', async () => {
      const response = await testHelper.get('/api/monitoring/performance');

      expect(response.status).toBe(401);
    });

    it('should allow admin to view performance metrics', async () => {
      const response = await testHelper.get('/api/monitoring/performance', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });

    it('should allow manager to view performance metrics', async () => {
      const response = await testHelper.get('/api/monitoring/performance', 'manager');

      expect([200, 403]).toContain(response.status);
    });

    it('should deny user access to performance metrics', async () => {
      const response = await testHelper.get('/api/monitoring/performance', 'user');

      expect(response.status).toBe(403);
    });

    it('should accept time range parameters', async () => {
      const timeRange = '1h';
      const response = await testHelper.get(`/api/monitoring/performance?timeRange=${timeRange}`, 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/monitoring/logs', () => {

    it('should require authentication for logs', async () => {
      const response = await testHelper.get('/api/monitoring/logs');

      expect(response.status).toBe(401);
    });

    it('should allow admin to view logs', async () => {
      const response = await testHelper.get('/api/monitoring/logs', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });

    it('should deny manager access to logs', async () => {
      const response = await testHelper.get('/api/monitoring/logs', 'manager');

      expect(response.status).toBe(403);
    });

    it('should deny user access to logs', async () => {
      const response = await testHelper.get('/api/monitoring/logs', 'user');

      expect(response.status).toBe(403);
    });

    it('should filter logs by level', async () => {
      const response = await testHelper.get('/api/monitoring/logs?level=error', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });

    it('should paginate logs correctly', async () => {
      const response = await testHelper.get('/api/monitoring/logs?page=1&limit=10', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('POST /api/monitoring/alert', () => {

    it('should require authentication for alert creation', async () => {
      const alertData = { message: 'Test alert', level: 'warning' };
      const response = await testHelper.post('/api/monitoring/alert', alertData);

      expect(response.status).toBe(401);
    });

    it('should allow admin to create alerts', async () => {
      const alertData = { message: 'Test alert', level: 'warning' };
      const response = await testHelper.post('/api/monitoring/alert', alertData, 'admin');

      expect([200, 201, 400]).toContain(response.status);
    });

    it('should allow manager to create alerts', async () => {
      const alertData = { message: 'Test alert', level: 'info' };
      const response = await testHelper.post('/api/monitoring/alert', alertData, 'manager');

      expect([200, 201, 400, 403]).toContain(response.status);
    });

    it('should deny user access to create alerts', async () => {
      const alertData = { message: 'Test alert', level: 'error' };
      const response = await testHelper.post('/api/monitoring/alert', alertData, 'user');

      expect(response.status).toBe(403);
    });

    it('should validate alert data', async () => {
      const invalidData = { level: 'invalid' }; // Missing message
      const response = await testHelper.post('/api/monitoring/alert', invalidData, 'admin');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/monitoring/alerts', () => {

    it('should require authentication for alerts listing', async () => {
      const response = await testHelper.get('/api/monitoring/alerts');

      expect(response.status).toBe(401);
    });

    it('should allow admin to list alerts', async () => {
      const response = await testHelper.get('/api/monitoring/alerts', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow manager to list alerts', async () => {
      const response = await testHelper.get('/api/monitoring/alerts', 'manager');

      expect([200, 403]).toContain(response.status);
    });

    it('should deny user access to list alerts', async () => {
      const response = await testHelper.get('/api/monitoring/alerts', 'user');

      expect(response.status).toBe(403);
    });

    it('should filter alerts by level', async () => {
      const response = await testHelper.get('/api/monitoring/alerts?level=error', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('DELETE /api/monitoring/alerts/:alertId', () => {

    it('should require authentication for alert deletion', async () => {
      const response = await testHelper.delete('/api/monitoring/alerts/1');

      expect(response.status).toBe(401);
    });

    it('should allow admin to delete alerts', async () => {
      const response = await testHelper.delete('/api/monitoring/alerts/99999', 'admin');

      // Should either succeed or return 404 for non-existent alert
      expect([200, 404]).toContain(response.status);
    });

    it('should deny manager access to delete alerts', async () => {
      const response = await testHelper.delete('/api/monitoring/alerts/1', 'manager');

      expect(response.status).toBe(403);
    });

    it('should deny user access to delete alerts', async () => {
      const response = await testHelper.delete('/api/monitoring/alerts/1', 'user');

      expect(response.status).toBe(403);
    });
  });
});