/**
 * Health API Tests
 * Tests for health check endpoints and system status
 */

import express from 'express';
import request from 'supertest';
import healthRoutes from '../routes/healthRoutes';
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
  app.use('/api/health', healthRoutes);

  // Initialize test helper
  testHelper = new ApiTestHelper(app, (global as any).testSequelize);
  dbUtils = new DatabaseTestUtils((global as any).testSequelize);

  await testHelper.initialize();
});

describe('🏥 Health API', () => {

  describe('GET /api/health', () => {

    it('should return basic health status without authentication', async () => {
      const response = await testHelper.get('/api/health');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include service status', async () => {
      const response = await testHelper.get('/api/health');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('services');
      expect(typeof response.body.services).toBe('object');
    });

    it('should return status quickly (performance check)', async () => {
      const startTime = Date.now();
      const response = await testHelper.get('/api/health');
      const responseTime = Date.now() - startTime;

      testHelper.assertSuccess(response, 200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('GET /api/health/detailed', () => {

    it('should require authentication for detailed health check', async () => {
      const response = await testHelper.get('/api/health/detailed');

      expect(response.status).toBe(401);
    });

    it('should allow admin to view detailed health', async () => {
      const response = await testHelper.get('/api/health/detailed', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('system');
    });

    it('should allow manager to view detailed health', async () => {
      const response = await testHelper.get('/api/health/detailed', 'manager');

      expect([200, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('status');
      }
    });

    it('should deny user access to detailed health', async () => {
      const response = await testHelper.get('/api/health/detailed', 'user');

      expect(response.status).toBe(403);
    });

    it('should include database connection status', async () => {
      const response = await testHelper.get('/api/health/detailed', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services.database).toHaveProperty('status');
    });

    it('should include memory and CPU usage', async () => {
      const response = await testHelper.get('/api/health/detailed', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body.system).toHaveProperty('memory');
      expect(response.body.system).toHaveProperty('cpu');
    });
  });

  describe('GET /api/health/database', () => {

    it('should require authentication for database health check', async () => {
      const response = await testHelper.get('/api/health/database');

      expect(response.status).toBe(401);
    });

    it('should allow admin to check database health', async () => {
      const response = await testHelper.get('/api/health/database', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('database');
    });

    it('should allow manager to check database health', async () => {
      const response = await testHelper.get('/api/health/database', 'manager');

      expect([200, 403]).toContain(response.status);
    });

    it('should deny user access to database health', async () => {
      const response = await testHelper.get('/api/health/database', 'user');

      expect(response.status).toBe(403);
    });

    it('should include connection status and response time', async () => {
      const response = await testHelper.get('/api/health/database', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body.database).toHaveProperty('connected');
      expect(response.body.database).toHaveProperty('responseTime');
      expect(typeof response.body.database.connected).toBe('boolean');
      expect(typeof response.body.database.responseTime).toBe('number');
    });
  });

  describe('GET /api/health/services', () => {

    it('should require authentication for services health check', async () => {
      const response = await testHelper.get('/api/health/services');

      expect(response.status).toBe(401);
    });

    it('should allow admin to check services health', async () => {
      const response = await testHelper.get('/api/health/services', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
    });

    it('should allow manager to check services health', async () => {
      const response = await testHelper.get('/api/health/services', 'manager');

      expect([200, 403]).toContain(response.status);
    });

    it('should deny user access to services health', async () => {
      const response = await testHelper.get('/api/health/services', 'user');

      expect(response.status).toBe(403);
    });

    it('should check multiple service statuses', async () => {
      const response = await testHelper.get('/api/health/services', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body.services).toHaveProperty('database');
      // May include other services like redis, external APIs, etc.
    });
  });

  describe('GET /api/health/readiness', () => {

    it('should return readiness status without authentication', async () => {
      const response = await testHelper.get('/api/health/readiness');

      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('ready');
      expect(typeof response.body.ready).toBe('boolean');
    });

    it('should include timestamp in readiness check', async () => {
      const response = await testHelper.get('/api/health/readiness');

      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('GET /api/health/liveness', () => {

    it('should return liveness status without authentication', async () => {
      const response = await testHelper.get('/api/health/liveness');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('alive');
      expect(response.body.alive).toBe(true);
    });

    it('should respond quickly (liveness performance check)', async () => {
      const startTime = Date.now();
      const response = await testHelper.get('/api/health/liveness');
      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500); // Should respond within 0.5 seconds
    });

    it('should include minimal response data', async () => {
      const response = await testHelper.get('/api/health/liveness');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('alive');
      expect(response.body).toHaveProperty('timestamp');
      expect(Object.keys(response.body).length).toBeLessThanOrEqual(3); // Minimal response
    });
  });

  describe('GET /api/health/metrics', () => {

    it('should require authentication for health metrics', async () => {
      const response = await testHelper.get('/api/health/metrics');

      expect(response.status).toBe(401);
    });

    it('should allow admin to view health metrics', async () => {
      const response = await testHelper.get('/api/health/metrics', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('metrics');
    });

    it('should deny manager access to health metrics', async () => {
      const response = await testHelper.get('/api/health/metrics', 'manager');

      expect(response.status).toBe(403);
    });

    it('should deny user access to health metrics', async () => {
      const response = await testHelper.get('/api/health/metrics', 'user');

      expect(response.status).toBe(403);
    });

    it('should include system performance metrics', async () => {
      const response = await testHelper.get('/api/health/metrics', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body.metrics).toHaveProperty('uptime');
      expect(response.body.metrics).toHaveProperty('memory');
      expect(response.body.metrics).toHaveProperty('cpu');
    });
  });
});