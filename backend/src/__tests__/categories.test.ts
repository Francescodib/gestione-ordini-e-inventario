/**
 * Categories API Tests
 * Tests for category management, hierarchy, and CRUD operations
 */

import express from 'express';
import request from 'supertest';
import categoryRoutes from '../routes/categoryRoutes';
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
  app.use('/api/categories', categoryRoutes);

  // Initialize test helper
  testHelper = new ApiTestHelper(app, (global as any).testSequelize);
  dbUtils = new DatabaseTestUtils((global as any).testSequelize);

  await testHelper.initialize();
});

describe('📂 Categories API', () => {

  describe('GET /api/categories', () => {

    it('should get categories without authentication (public)', async () => {
      const response = await testHelper.get('/api/categories');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter categories by parentId', async () => {
      const response = await testHelper.get('/api/categories?parentId=null');

      testHelper.assertSuccess(response, 200);
      response.body.data.forEach((category: any) => {
        expect(category.parentId).toBeNull();
      });
    });

    it('should filter active categories only', async () => {
      const response = await testHelper.get('/api/categories?isActive=true');

      testHelper.assertSuccess(response, 200);
      response.body.data.forEach((category: any) => {
        expect(category.isActive).toBe(true);
      });
    });

    it('should paginate results correctly', async () => {
      const response = await testHelper.get('/api/categories?page=1&limit=5');

      testHelper.assertSuccess(response, 200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should search categories by name', async () => {
      const response = await testHelper.get('/api/categories?search=test');

      testHelper.assertSuccess(response, 200);
      // Results should contain search term if any exist
    });
  });

  describe('GET /api/categories/tree', () => {

    it('should get category tree structure', async () => {
      const response = await testHelper.get('/api/categories/tree');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get tree from specific root', async () => {
      const testData = testHelper.getTestData();
      if (testData.categories && testData.categories.length > 0) {
        const rootId = testData.categories[0].id;
        const response = await testHelper.get(`/api/categories/tree?rootId=${rootId}`);

        testHelper.assertSuccess(response, 200);
        expect(response.body).toHaveProperty('data');
      }
    });
  });

  describe('GET /api/categories/slug/:slug', () => {

    it('should get category by slug', async () => {
      const testData = testHelper.getTestData();
      if (testData.categories && testData.categories.length > 0) {
        const category = testData.categories[0];
        const response = await testHelper.get(`/api/categories/slug/${category.slug}`);

        testHelper.assertSuccess(response, 200);
        expect(response.body.data.slug).toBe(category.slug);
      }
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await testHelper.get('/api/categories/slug/non-existent-slug');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/categories/:id', () => {

    it('should get category by ID', async () => {
      const testData = testHelper.getTestData();
      if (testData.categories && testData.categories.length > 0) {
        const categoryId = testData.categories[0].id;
        const response = await testHelper.get(`/api/categories/${categoryId}`);

        testHelper.assertSuccess(response, 200);
        expect(response.body.data.id).toBe(categoryId);
      }
    });

    it('should return 404 for non-existent category', async () => {
      const response = await testHelper.get('/api/categories/99999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should get category with full tree when requested', async () => {
      const testData = testHelper.getTestData();
      if (testData.categories && testData.categories.length > 0) {
        const categoryId = testData.categories[0].id;
        const response = await testHelper.get(`/api/categories/${categoryId}?includeFullTree=true`);

        testHelper.assertSuccess(response, 200);
        expect(response.body.data.id).toBe(categoryId);
      }
    });
  });

  describe('GET /api/categories/:id/path', () => {

    it('should get category breadcrumb path', async () => {
      const testData = testHelper.getTestData();
      if (testData.categories && testData.categories.length > 0) {
        const categoryId = testData.categories[0].id;
        const response = await testHelper.get(`/api/categories/${categoryId}/path`);

        testHelper.assertSuccess(response, 200);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('GET /api/categories/stats', () => {

    it('should require authentication for stats', async () => {
      const response = await testHelper.get('/api/categories/stats');

      expect(response.status).toBe(401);
    });

    it('should allow admin to view stats', async () => {
      const response = await testHelper.get('/api/categories/stats', 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });

    it('should allow manager to view stats', async () => {
      const response = await testHelper.get('/api/categories/stats', 'manager');

      testHelper.assertSuccess(response, 200);
      expect(response.body).toHaveProperty('data');
    });

    it('should deny user access to stats', async () => {
      const response = await testHelper.get('/api/categories/stats', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/categories', () => {

    it('should require authentication for creation', async () => {
      const categoryData = MockDataGenerator.generateCategory();
      const response = await testHelper.post('/api/categories', categoryData);

      expect(response.status).toBe(401);
    });

    it('should allow admin to create category', async () => {
      const categoryData = MockDataGenerator.generateCategory({
        name: 'Test Category Admin',
        slug: 'test-category-admin'
      });

      const response = await testHelper.post('/api/categories', categoryData, 'admin');

      testHelper.assertSuccess(response, 201);
      expect(response.body.data.name).toBe(categoryData.name);
      expect(response.body.data.slug).toBe(categoryData.slug);
    });

    it('should allow manager to create category', async () => {
      const categoryData = MockDataGenerator.generateCategory({
        name: 'Test Category Manager',
        slug: 'test-category-manager'
      });

      const response = await testHelper.post('/api/categories', categoryData, 'manager');

      testHelper.assertSuccess(response, 201);
      expect(response.body.data.name).toBe(categoryData.name);
    });

    it('should deny user access to create category', async () => {
      const categoryData = MockDataGenerator.generateCategory();
      const response = await testHelper.post('/api/categories', categoryData, 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const invalidData = { description: 'Missing required fields' };
      const response = await testHelper.post('/api/categories', invalidData, 'admin');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should prevent duplicate slug creation', async () => {
      const categoryData = MockDataGenerator.generateCategory({
        name: 'Duplicate Test',
        slug: 'duplicate-slug-test'
      });

      // Create first category
      await testHelper.post('/api/categories', categoryData, 'admin');

      // Try to create duplicate
      const duplicateData = MockDataGenerator.generateCategory({
        name: 'Another Category',
        slug: 'duplicate-slug-test' // Same slug
      });

      const response = await testHelper.post('/api/categories', duplicateData, 'admin');

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/categories/:id', () => {

    it('should require authentication for update', async () => {
      const response = await testHelper.put('/api/categories/1', { name: 'Updated' });

      expect(response.status).toBe(401);
    });

    it('should allow admin to update category', async () => {
      // First create a category
      const categoryData = MockDataGenerator.generateCategory({
        name: 'Original Name',
        slug: 'original-name'
      });

      const createResponse = await testHelper.post('/api/categories', categoryData, 'admin');
      const categoryId = createResponse.body.data.id;

      // Then update it
      const updateData = { name: 'Updated Name' };
      const response = await testHelper.put(`/api/categories/${categoryId}`, updateData, 'admin');

      testHelper.assertSuccess(response, 200);
      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should allow manager to update category', async () => {
      // First create a category
      const categoryData = MockDataGenerator.generateCategory({
        name: 'Manager Original',
        slug: 'manager-original'
      });

      const createResponse = await testHelper.post('/api/categories', categoryData, 'admin');
      const categoryId = createResponse.body.data.id;

      // Then update with manager role
      const updateData = { name: 'Manager Updated' };
      const response = await testHelper.put(`/api/categories/${categoryId}`, updateData, 'manager');

      testHelper.assertSuccess(response, 200);
      expect(response.body.data.name).toBe('Manager Updated');
    });

    it('should deny user access to update category', async () => {
      const response = await testHelper.put('/api/categories/1', { name: 'Updated' }, 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent category', async () => {
      const response = await testHelper.put('/api/categories/99999', { name: 'Updated' }, 'admin');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/categories/:id', () => {

    it('should require authentication for deletion', async () => {
      const response = await testHelper.delete('/api/categories/1');

      expect(response.status).toBe(401);
    });

    it('should allow only admin to delete category', async () => {
      // First create a category
      const categoryData = MockDataGenerator.generateCategory({
        name: 'To Delete',
        slug: 'to-delete'
      });

      const createResponse = await testHelper.post('/api/categories', categoryData, 'admin');
      const categoryId = createResponse.body.data.id;

      // Then delete it
      const response = await testHelper.delete(`/api/categories/${categoryId}`, 'admin');

      testHelper.assertSuccess(response, 200);
    });

    it('should deny manager access to delete category', async () => {
      const response = await testHelper.delete('/api/categories/1', 'manager');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should deny user access to delete category', async () => {
      const response = await testHelper.delete('/api/categories/1', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent category', async () => {
      const response = await testHelper.delete('/api/categories/99999', 'admin');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/categories/:id/move', () => {

    it('should require authentication for moving', async () => {
      const response = await testHelper.put('/api/categories/1/move', { newParentId: null });

      expect(response.status).toBe(401);
    });

    it('should allow admin to move category', async () => {
      // Create parent and child categories
      const parentData = MockDataGenerator.generateCategory({
        name: 'Parent Category',
        slug: 'parent-category'
      });

      const childData = MockDataGenerator.generateCategory({
        name: 'Child Category',
        slug: 'child-category'
      });

      const parentResponse = await testHelper.post('/api/categories', parentData, 'admin');
      const childResponse = await testHelper.post('/api/categories', childData, 'admin');

      const parentId = parentResponse.body.data.id;
      const childId = childResponse.body.data.id;

      // Move child to parent
      const response = await testHelper.put(`/api/categories/${childId}/move`, { newParentId: parentId }, 'admin');

      testHelper.assertSuccess(response, 200);
    });

    it('should allow manager to move category', async () => {
      const testData = testHelper.getTestData();
      if (testData.categories && testData.categories.length > 0) {
        const categoryId = testData.categories[0].id;
        const response = await testHelper.put(`/api/categories/${categoryId}/move`, { newParentId: null }, 'manager');

        testHelper.assertSuccess(response, 200);
      }
    });

    it('should deny user access to move category', async () => {
      const response = await testHelper.put('/api/categories/1/move', { newParentId: null }, 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/categories/bulk/reorder', () => {

    it('should require authentication for bulk reorder', async () => {
      const response = await testHelper.post('/api/categories/bulk/reorder', { categories: [] });

      expect(response.status).toBe(401);
    });

    it('should allow admin to reorder categories', async () => {
      const testData = testHelper.getTestData();
      if (testData.categories && testData.categories.length >= 2) {
        const reorderData = {
          categories: [
            { id: testData.categories[0].id.toString(), sortOrder: 1 },
            { id: testData.categories[1].id.toString(), sortOrder: 0 }
          ]
        };

        const response = await testHelper.post('/api/categories/bulk/reorder', reorderData, 'admin');

        testHelper.assertSuccess(response, 200);
        expect(response.body.data).toHaveProperty('successful');
      }
    });

    it('should allow manager to reorder categories', async () => {
      const testData = testHelper.getTestData();
      if (testData.categories && testData.categories.length >= 1) {
        const reorderData = {
          categories: [
            { id: testData.categories[0].id.toString(), sortOrder: 5 }
          ]
        };

        const response = await testHelper.post('/api/categories/bulk/reorder', reorderData, 'manager');

        testHelper.assertSuccess(response, 200);
      }
    });

    it('should deny user access to reorder categories', async () => {
      const response = await testHelper.post('/api/categories/bulk/reorder', { categories: [] }, 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate reorder data', async () => {
      const invalidData = { categories: [{ id: 'invalid' }] }; // Missing sortOrder
      const response = await testHelper.post('/api/categories/bulk/reorder', invalidData, 'admin');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/categories/bulk/update-status', () => {

    it('should require authentication for bulk status update', async () => {
      const response = await testHelper.post('/api/categories/bulk/update-status', { categoryIds: [], isActive: true });

      expect(response.status).toBe(401);
    });

    it('should allow only admin to bulk update status', async () => {
      const testData = testHelper.getTestData();
      if (testData.categories && testData.categories.length >= 1) {
        const updateData = {
          categoryIds: [testData.categories[0].id.toString()],
          isActive: false
        };

        const response = await testHelper.post('/api/categories/bulk/update-status', updateData, 'admin');

        testHelper.assertSuccess(response, 200);
        expect(response.body.data).toHaveProperty('successful');
      }
    });

    it('should deny manager access to bulk status update', async () => {
      const response = await testHelper.post('/api/categories/bulk/update-status', { categoryIds: ['1'], isActive: true }, 'manager');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should deny user access to bulk status update', async () => {
      const response = await testHelper.post('/api/categories/bulk/update-status', { categoryIds: ['1'], isActive: true }, 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate bulk status update data', async () => {
      const invalidData = { categoryIds: [] }; // Missing isActive
      const response = await testHelper.post('/api/categories/bulk/update-status', invalidData, 'admin');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});