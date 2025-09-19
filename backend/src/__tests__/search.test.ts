/**
 * Search API Tests
 * Tests for advanced search functionality
 */

import express from 'express';
import searchRoutes from '../routes/searchRoutes';
import { ApiTestHelper, PerformanceTestUtils } from './helpers';

let app: express.Express;
let testHelper: ApiTestHelper;

beforeAll(async () => {
  // Create test Express app
  app = express();
  app.use(express.json());
  
  // Setup routes
  app.use('/api/search', searchRoutes);
  
  // Initialize test helper
  testHelper = new ApiTestHelper(app, (global as any).testSequelize);
  await testHelper.initialize();
});

describe('🔍 Search API', () => {
  
  describe('GET /api/search', () => {
    
    it('should perform global search', async () => {
      const response = await testHelper.get('/api/search?q=test');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('totalByType');
      expect(response.body.data).toHaveProperty('searchTime');
      expect(response.body.data).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });
    
    it('should search specific entities', async () => {
      const response = await testHelper.get('/api/search?q=laptop&entities=products');
      
      testHelper.assertSuccess(response, 200);
      
      // All results should be products
      response.body.data.results.forEach((result: any) => {
        expect(result.type).toBe('product');
      });
    });
    
    it('should search with price filters', async () => {
      const response = await testHelper.get('/api/search?q=test&price.min=100&price.max=1000');
      
      testHelper.assertSuccess(response, 200);
      
      // Check that product results respect price filter
      response.body.data.results
        .filter((result: any) => result.type === 'product')
        .forEach((result: any) => {
          expect(result.metadata.price).toBeGreaterThanOrEqual(100);
          expect(result.metadata.price).toBeLessThanOrEqual(1000);
        });
    });
    
    it('should sort results by relevance', async () => {
      const response = await testHelper.get('/api/search?q=test&sortBy=relevance');
      
      testHelper.assertSuccess(response, 200);
      
      if (response.body.data.results.length > 1) {
        for (let i = 1; i < response.body.data.results.length; i++) {
          const prevScore = response.body.data.results[i-1].relevanceScore || 0;
          const currentScore = response.body.data.results[i].relevanceScore || 0;
          expect(currentScore).toBeLessThanOrEqual(prevScore);
        }
      }
    });
    
    it('should paginate search results', async () => {
      const response = await testHelper.get('/api/search?q=test&limit=5&page=1');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data.results.length).toBeLessThanOrEqual(5);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(5);
    });
    
    it('should return empty results for non-existent queries', async () => {
      const response = await testHelper.get('/api/search?q=nonexistentproduct12345');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data.results).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });
    
    it('should fail with missing query parameter', async () => {
      const response = await testHelper.get('/api/search');
      
      testHelper.assertValidationError(response, 'q');
    });
    
    it('should fail with empty query', async () => {
      const response = await testHelper.get('/api/search?q=');
      
      testHelper.assertValidationError(response, 'q');
    });
    
  });
  
  describe('GET /api/search/suggestions', () => {
    
    it('should get search suggestions', async () => {
      const response = await testHelper.get('/api/search/suggestions?q=test');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('query');
      expect(response.body.data).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
      expect(response.body.data.query).toBe('test');
    });
    
    it('should filter suggestions by type', async () => {
      const response = await testHelper.get('/api/search/suggestions?q=test&type=products');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data.suggestions).toBeDefined();
    });
    
    it('should return empty suggestions for short queries', async () => {
      const response = await testHelper.get('/api/search/suggestions?q=a');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data.suggestions).toEqual([]);
    });
    
  });
  
  describe('GET /api/search/autocomplete', () => {
    
    it('should get autocomplete suggestions', async () => {
      const response = await testHelper.get('/api/search/autocomplete?q=te');
      
      testHelper.assertSuccess(response, 200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should filter autocomplete by type', async () => {
      const response = await testHelper.get('/api/search/autocomplete?q=te&type=products');
      
      testHelper.assertSuccess(response, 200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should fail with very short query', async () => {
      const response = await testHelper.get('/api/search/autocomplete?q=t');
      
      testHelper.assertValidationError(response, 'q');
    });
    
  });
  
  describe('GET /api/search/products', () => {
    
    it('should search products specifically', async () => {
      const response = await testHelper.get('/api/search/products?q=laptop');
      
      testHelper.assertSuccess(response, 200);
      testHelper.assertPagination(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should search products with filters', async () => {
      const response = await testHelper.get('/api/search/products?q=test&price.min=50&inStock=true');
      
      testHelper.assertSuccess(response, 200);
      
      response.body.data.forEach((product: any) => {
        expect(product.price).toBeGreaterThanOrEqual(50);
        expect(product.stock).toBeGreaterThan(0);
      });
    });
    
    it('should include related data when requested', async () => {
      const response = await testHelper.get('/api/search/products?q=test&includeRelated=true');
      
      testHelper.assertSuccess(response, 200);
      
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('category');
      }
    });
    
  });
  
  describe('GET /api/search/categories', () => {
    
    it('should search categories specifically', async () => {
      const response = await testHelper.get('/api/search/categories?q=electronics');
      
      testHelper.assertSuccess(response, 200);
      testHelper.assertPagination(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should include related products when requested', async () => {
      const response = await testHelper.get('/api/search/categories?q=electronics&includeRelated=true');
      
      testHelper.assertSuccess(response, 200);
      
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('_count');
      }
    });
    
  });
  
  describe('GET /api/search/orders', () => {
    
    it('should search orders as admin', async () => {
      const response = await testHelper.get('/api/search/orders?q=test', 'admin');
      
      testHelper.assertSuccess(response, 200);
      testHelper.assertPagination(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should search orders as manager', async () => {
      const response = await testHelper.get('/api/search/orders?q=test', 'manager');
      
      testHelper.assertSuccess(response, 200);
    });
    
    it('should deny order search for regular user', async () => {
      const response = await testHelper.get('/api/search/orders?q=test', 'user');
      
      testHelper.assertForbidden(response);
    });
    
    it('should filter orders by status', async () => {
      const response = await testHelper.get('/api/search/orders?q=test&status=PENDING', 'admin');
      
      testHelper.assertSuccess(response, 200);
      
      response.body.data.forEach((order: any) => {
        expect(order.status).toBe('PENDING');
      });
    });
    
  });
  
  describe('GET /api/search/users', () => {
    
    it('should search users as admin', async () => {
      const response = await testHelper.get('/api/search/users?q=test', 'admin');
      
      testHelper.assertSuccess(response, 200);
      testHelper.assertPagination(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should deny user search for manager', async () => {
      const response = await testHelper.get('/api/search/users?q=test', 'manager');
      
      testHelper.assertForbidden(response);
    });
    
    it('should deny user search for regular user', async () => {
      const response = await testHelper.get('/api/search/users?q=test', 'user');
      
      testHelper.assertForbidden(response);
    });
    
    it('should filter users by role', async () => {
      const response = await testHelper.get('/api/search/users?q=test&role=ADMIN', 'admin');
      
      testHelper.assertSuccess(response, 200);
      
      response.body.data.forEach((user: any) => {
        expect(user.role).toBe('ADMIN');
      });
    });
    
  });
  
  describe('GET /api/search/analytics', () => {
    
    it('should get search analytics as admin', async () => {
      const response = await testHelper.get('/api/search/analytics', 'admin');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('totalSearches');
      expect(response.body.data).toHaveProperty('uniqueQueries');
      expect(response.body.data).toHaveProperty('topQueries');
      expect(response.body.data).toHaveProperty('searchesByEntity');
    });
    
    it('should deny analytics for manager', async () => {
      const response = await testHelper.get('/api/search/analytics', 'manager');
      
      testHelper.assertForbidden(response);
    });
    
    it('should deny analytics for regular user', async () => {
      const response = await testHelper.get('/api/search/analytics', 'user');
      
      testHelper.assertForbidden(response);
    });
    
  });
  
});

describe('⚡ Search Performance Tests', () => {
  
  it('should perform global search efficiently', async () => {
    const { duration } = await PerformanceTestUtils.measureTime(async () => {
      return await testHelper.get('/api/search?q=test');
    });
    
    // Should respond within 2 seconds
    PerformanceTestUtils.assertResponseTime(duration, 2000);
  });
  
  it('should handle concurrent search requests', async () => {
    const loadTestResult = await PerformanceTestUtils.runLoadTest(
      async () => {
        const response = await testHelper.get('/api/search?q=test&limit=10');
        expect(response.status).toBe(200);
        return response;
      },
      3, // 3 concurrent requests
      15  // 15 total requests
    );
    
    expect(loadTestResult.successCount).toBeGreaterThan(12); // At least 80% success rate
    expect(loadTestResult.averageTime).toBeLessThan(3000); // Average under 3 seconds
    
    console.log('Search load test results:', loadTestResult);
  });
  
  it('should handle autocomplete requests efficiently', async () => {
    const { duration } = await PerformanceTestUtils.measureTime(async () => {
      return await testHelper.get('/api/search/autocomplete?q=te');
    });
    
    // Autocomplete should be very fast (under 500ms)
    PerformanceTestUtils.assertResponseTime(duration, 500);
  });
  
});
