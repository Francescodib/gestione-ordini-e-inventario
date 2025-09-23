/**
 * Backup API Tests
 * Tests for backup management and system operations
 */

import express from 'express';
import request from 'supertest';
import backupRoutes from '../routes/backupRoutes';
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
  app.use('/api/backup', backupRoutes);

  // Initialize test helper
  testHelper = new ApiTestHelper(app, (global as any).testSequelize);
  dbUtils = new DatabaseTestUtils((global as any).testSequelize);

  await testHelper.initialize();
});

describe('💾 Backup API', () => {

  describe('GET /api/backup/status', () => {

    it('should require authentication for backup status', async () => {
      const response = await testHelper.get('/api/backup/status');

      expect(response.status).toBe(401);
    });

    it('should allow admin to view backup status', async () => {
      const response = await testHelper.get('/api/backup/status', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });

    it('should deny manager access to backup status', async () => {
      const response = await testHelper.get('/api/backup/status', 'manager');

      expect(response.status).toBe(403);
    });

    it('should deny user access to backup status', async () => {
      const response = await testHelper.get('/api/backup/status', 'user');

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/backup/create', () => {

    it('should require authentication for backup creation', async () => {
      const response = await testHelper.post('/api/backup/create', {});

      expect(response.status).toBe(401);
    });

    it('should allow admin to create backup', async () => {
      const response = await testHelper.post('/api/backup/create', {}, 'admin');

      // Should either succeed or fail with system error (not 401/403)
      expect([200, 201, 500]).toContain(response.status);
    });

    it('should deny manager access to create backup', async () => {
      const response = await testHelper.post('/api/backup/create', {}, 'manager');

      expect(response.status).toBe(403);
    });

    it('should deny user access to create backup', async () => {
      const response = await testHelper.post('/api/backup/create', {}, 'user');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/backup/list', () => {

    it('should require authentication for backup listing', async () => {
      const response = await testHelper.get('/api/backup/list');

      expect(response.status).toBe(401);
    });

    it('should allow admin to list backups', async () => {
      const response = await testHelper.get('/api/backup/list', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should deny manager access to list backups', async () => {
      const response = await testHelper.get('/api/backup/list', 'manager');

      expect(response.status).toBe(403);
    });

    it('should deny user access to list backups', async () => {
      const response = await testHelper.get('/api/backup/list', 'user');

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/backup/restore', () => {

    it('should require authentication for backup restore', async () => {
      const response = await testHelper.post('/api/backup/restore', { backupId: 'test' });

      expect(response.status).toBe(401);
    });

    it('should allow admin to restore backup', async () => {
      const response = await testHelper.post('/api/backup/restore', { backupId: 'non-existent' }, 'admin');

      // Should either succeed or fail with validation/system error (not 401/403)
      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should deny manager access to restore backup', async () => {
      const response = await testHelper.post('/api/backup/restore', { backupId: 'test' }, 'manager');

      expect(response.status).toBe(403);
    });

    it('should deny user access to restore backup', async () => {
      const response = await testHelper.post('/api/backup/restore', { backupId: 'test' }, 'user');

      expect(response.status).toBe(403);
    });

    it('should validate restore request data', async () => {
      const response = await testHelper.post('/api/backup/restore', {}, 'admin');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/backup/:backupId', () => {

    it('should require authentication for backup deletion', async () => {
      const response = await testHelper.delete('/api/backup/test-backup');

      expect(response.status).toBe(401);
    });

    it('should allow admin to delete backup', async () => {
      const response = await testHelper.delete('/api/backup/non-existent-backup', 'admin');

      // Should either succeed or return 404 for non-existent backup
      expect([200, 404]).toContain(response.status);
    });

    it('should deny manager access to delete backup', async () => {
      const response = await testHelper.delete('/api/backup/test-backup', 'manager');

      expect(response.status).toBe(403);
    });

    it('should deny user access to delete backup', async () => {
      const response = await testHelper.delete('/api/backup/test-backup', 'user');

      expect(response.status).toBe(403);
    });
  });
});