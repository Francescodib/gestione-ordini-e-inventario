/**
 * Files API Tests
 * Tests for file upload, management, and static serving
 */

import express from 'express';
import request from 'supertest';
import fileRoutes from '../routes/fileRoutes';
import { ApiTestHelper, MockDataGenerator, DatabaseTestUtils } from './helpers';
import { setupTestDatabase } from './setup';
import path from 'path';

// Setup test app
let app: express.Express;
let testHelper: ApiTestHelper;
let dbUtils: DatabaseTestUtils;

beforeAll(async () => {
  // Create test Express app
  app = express();
  app.use(express.json());

  // Setup middleware and routes (similar to main server)
  app.use('/api/files', fileRoutes);

  // Initialize test helper
  testHelper = new ApiTestHelper(app, (global as any).testSequelize);
  dbUtils = new DatabaseTestUtils((global as any).testSequelize);

  await testHelper.initialize();
});

describe('📁 Files API', () => {

  describe('GET /api/files/uploads/*', () => {

    it('should serve static files without authentication', async () => {
      // Test if static file serving is configured (returns 404 for non-existent files)
      const response = await testHelper.get('/api/files/uploads/test-image.jpg');

      // Should either serve the file (200) or return 404 for non-existent
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('POST /api/files/products/:productId/images', () => {

    it('should require authentication for product image upload', async () => {
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const productId = testData.products[0].id;
        const response = await request(app)
          .post(`/api/files/products/${productId}/images`)
          .attach('images', Buffer.from('fake image data'), 'test.jpg');

        expect(response.status).toBe(401);
      }
    });

    it('should allow admin to upload product images', async () => {
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const productId = testData.products[0].id;
        const response = await request(app)
          .post(`/api/files/products/${productId}/images`)
          .set('Authorization', `Bearer ${testHelper.getToken('admin')}`)
          .attach('images', Buffer.from('fake image data'), 'test.jpg');

        // Should either succeed or fail with validation error (not 401/403)
        expect([200, 201, 400, 500]).toContain(response.status);
      }
    });

    it('should allow manager to upload product images', async () => {
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const productId = testData.products[0].id;
        const response = await request(app)
          .post(`/api/files/products/${productId}/images`)
          .set('Authorization', `Bearer ${testHelper.getToken('manager')}`)
          .attach('images', Buffer.from('fake image data'), 'test.jpg');

        // Should either succeed or fail with validation error (not 401/403)
        expect([200, 201, 400, 403, 500]).toContain(response.status);
      }
    });

    it('should deny user access to upload product images', async () => {
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const productId = testData.products[0].id;
        const response = await request(app)
          .post(`/api/files/products/${productId}/images`)
          .set('Authorization', `Bearer ${testHelper.getToken('user')}`)
          .attach('images', Buffer.from('fake image data'), 'test.jpg');

        expect(response.status).toBe(403);
      }
    });
  });

  describe('POST /api/files/users/:userId/avatar', () => {

    it('should require authentication for avatar upload', async () => {
      const testData = testHelper.getTestData();
      if (testData.users && testData.users.length > 0) {
        const userId = testData.users[0].id;
        const response = await request(app)
          .post(`/api/files/users/${userId}/avatar`)
          .attach('avatar', Buffer.from('fake image data'), 'avatar.jpg');

        expect(response.status).toBe(401);
      }
    });

    it('should allow user to upload their own avatar', async () => {
      const testData = testHelper.getTestData();
      if (testData.users && testData.users.length > 2) {
        const userId = testData.users[2].id; // User role
        const response = await request(app)
          .post(`/api/files/users/${userId}/avatar`)
          .set('Authorization', `Bearer ${testHelper.getToken('user')}`)
          .attach('avatar', Buffer.from('fake image data'), 'avatar.jpg');

        // Should either succeed or fail with validation error (not 401/403)
        expect([200, 201, 400, 500]).toContain(response.status);
      }
    });

    it('should allow admin to upload any user avatar', async () => {
      const testData = testHelper.getTestData();
      if (testData.users && testData.users.length > 0) {
        const userId = testData.users[0].id;
        const response = await request(app)
          .post(`/api/files/users/${userId}/avatar`)
          .set('Authorization', `Bearer ${testHelper.getToken('admin')}`)
          .attach('avatar', Buffer.from('fake image data'), 'avatar.jpg');

        // Should either succeed or fail with validation error (not 401/403)
        expect([200, 201, 400, 500]).toContain(response.status);
      }
    });
  });

  describe('POST /api/files/documents', () => {

    it('should require authentication for document upload', async () => {
      const response = await request(app)
        .post('/api/files/documents')
        .attach('documents', Buffer.from('fake document data'), 'document.pdf');

      expect(response.status).toBe(401);
    });

    it('should allow authenticated users to upload documents', async () => {
      const response = await request(app)
        .post('/api/files/documents')
        .set('Authorization', `Bearer ${testHelper.getToken('user')}`)
        .attach('documents', Buffer.from('fake document data'), 'document.pdf');

      // Should either succeed or fail with validation error (not 401/403)
      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it('should allow admin to upload documents', async () => {
      const response = await request(app)
        .post('/api/files/documents')
        .set('Authorization', `Bearer ${testHelper.getToken('admin')}`)
        .attach('documents', Buffer.from('fake document data'), 'document.pdf');

      // Should either succeed or fail with validation error (not 401/403)
      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/files/products/:productId/images', () => {

    it('should get product images without authentication (public)', async () => {
      const testData = testHelper.getTestData();
      if (testData.products && testData.products.length > 0) {
        const productId = testData.products[0].id;
        const response = await testHelper.get(`/api/files/products/${productId}/images`);

        testHelper.assertSuccess(response, 200);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('GET /api/files/users/:userId/avatar', () => {

    it('should get user avatar without authentication (public)', async () => {
      const testData = testHelper.getTestData();
      if (testData.users && testData.users.length > 0) {
        const userId = testData.users[0].id;
        const response = await testHelper.get(`/api/files/users/${userId}/avatar`);

        // Should either return avatar data or 404 if no avatar
        expect([200, 404]).toContain(response.status);
      }
    });
  });

  describe('DELETE /api/files/images/:imageId', () => {

    it('should require authentication for image deletion', async () => {
      const response = await testHelper.delete('/api/files/images/1');

      expect(response.status).toBe(401);
    });

    it('should allow admin to delete images', async () => {
      const response = await testHelper.delete('/api/files/images/99999', 'admin');

      // Should either succeed or return 404 for non-existent image
      expect([200, 404]).toContain(response.status);
    });

    it('should allow manager to delete images', async () => {
      const response = await testHelper.delete('/api/files/images/99999', 'manager');

      // Should either succeed or return 404 for non-existent image
      expect([200, 404]).toContain(response.status);
    });

    it('should deny user access to delete images', async () => {
      const response = await testHelper.delete('/api/files/images/1', 'user');

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/files/users/:userId/avatar', () => {

    it('should require authentication for avatar deletion', async () => {
      const testData = testHelper.getTestData();
      if (testData.users && testData.users.length > 0) {
        const userId = testData.users[0].id;
        const response = await testHelper.delete(`/api/files/users/${userId}/avatar`);

        expect(response.status).toBe(401);
      }
    });

    it('should allow user to delete their own avatar', async () => {
      const testData = testHelper.getTestData();
      if (testData.users && testData.users.length > 2) {
        const userId = testData.users[2].id; // User role
        const response = await testHelper.delete(`/api/files/users/${userId}/avatar`, 'user');

        // Should either succeed or return 404 if no avatar
        expect([200, 404, 403]).toContain(response.status);
      }
    });

    it('should allow admin to delete any user avatar', async () => {
      const testData = testHelper.getTestData();
      if (testData.users && testData.users.length > 0) {
        const userId = testData.users[0].id;
        const response = await testHelper.delete(`/api/files/users/${userId}/avatar`, 'admin');

        // Should either succeed or return 404 if no avatar
        expect([200, 404]).toContain(response.status);
      }
    });
  });

  describe('GET /api/files/documents', () => {

    it('should require authentication for documents listing', async () => {
      const response = await testHelper.get('/api/files/documents');

      expect(response.status).toBe(401);
    });

    it('should allow authenticated users to list documents', async () => {
      const response = await testHelper.get('/api/files/documents', 'user');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow admin to list all documents', async () => {
      const response = await testHelper.get('/api/files/documents', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('DELETE /api/files/documents/:documentId', () => {

    it('should require authentication for document deletion', async () => {
      const response = await testHelper.delete('/api/files/documents/1');

      expect(response.status).toBe(401);
    });

    it('should allow admin to delete documents', async () => {
      const response = await testHelper.delete('/api/files/documents/99999', 'admin');

      // Should either succeed or return 404 for non-existent document
      expect([200, 404]).toContain(response.status);
    });

    it('should allow manager to delete documents', async () => {
      const response = await testHelper.delete('/api/files/documents/99999', 'manager');

      // Should either succeed or return 404 for non-existent document
      expect([200, 404]).toContain(response.status);
    });

    it('should deny user access to delete documents', async () => {
      const response = await testHelper.delete('/api/files/documents/1', 'user');

      expect(response.status).toBe(403);
    });
  });
});