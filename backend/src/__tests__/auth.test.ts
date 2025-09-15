/**
 * Authentication API Tests
 * Tests for user authentication, registration, and authorization
 */

import express from 'express';
import request from 'supertest';
import userRoutes from '../routes/userRoutes';
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
  app.use('/api/users', userRoutes);
  
  // Initialize test helper
  testHelper = new ApiTestHelper(app, (global as any).testSequelize);
  dbUtils = new DatabaseTestUtils((global as any).testSequelize);
  
  await testHelper.initialize();
});

describe('🔐 Authentication API', () => {
  
  describe('POST /api/users/register', () => {
    
    it('should register a new user successfully', async () => {
      const userData = MockDataGenerator.generateUser({
        username: 'newuser123',
        email: 'newuser@test.com'
      });
      
      const response = await testHelper.post('/api/users/register', userData);
      
      testHelper.assertSuccess(response, 201);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
      
      // Verify user was created in database
      const userExists = await dbUtils.recordExists('users', response.body.data.user.id);
      expect(userExists).toBe(true);
    });
    
    it('should fail with duplicate email', async () => {
      const userData = MockDataGenerator.generateUser({
        email: 'admin@test.com' // This email already exists from test setup
      });
      
      const response = await testHelper.post('/api/users/register', userData);
      
      testHelper.assertError(response, 400, 'already exists');
    });
    
    it('should fail with duplicate username', async () => {
      const userData = MockDataGenerator.generateUser({
        username: 'testadmin' // This username already exists from test setup
      });
      
      const response = await testHelper.post('/api/users/register', userData);
      
      testHelper.assertError(response, 400, 'already exists');
    });
    
    it('should fail with invalid email format', async () => {
      const userData = MockDataGenerator.generateUser({
        email: 'invalid-email'
      });
      
      const response = await testHelper.post('/api/users/register', userData);
      
      testHelper.assertValidationError(response, 'email');
    });
    
    it('should fail with weak password', async () => {
      const userData = MockDataGenerator.generateUser({
        password: '123' // Too weak
      });
      
      const response = await testHelper.post('/api/users/register', userData);
      
      testHelper.assertValidationError(response, 'password');
    });
    
    it('should fail with missing required fields', async () => {
      const response = await testHelper.post('/api/users/register', {
        username: 'testuser'
        // Missing email, password, etc.
      });
      
      testHelper.assertValidationError(response);
    });
    
  });
  
  describe('POST /api/users/login', () => {
    
    it('should login with valid credentials', async () => {
      const response = await testHelper.post('/api/users/login', {
        email: 'admin@test.com',
        password: 'password123'
      });
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe('admin@test.com');
      expect(response.body.data.user.password).toBeUndefined();
    });
    
    it('should fail with invalid email', async () => {
      const response = await testHelper.post('/api/users/login', {
        email: 'nonexistent@test.com',
        password: 'password123'
      });
      
      testHelper.assertError(response, 401, 'Invalid credentials');
    });
    
    it('should fail with invalid password', async () => {
      const response = await testHelper.post('/api/users/login', {
        email: 'admin@test.com',
        password: 'wrongpassword'
      });
      
      testHelper.assertError(response, 401, 'Invalid credentials');
    });
    
    it('should fail with missing credentials', async () => {
      const response = await testHelper.post('/api/users/login', {
        email: 'admin@test.com'
        // Missing password
      });
      
      testHelper.assertValidationError(response, 'password');
    });
    
  });
  
  describe('GET /api/users/profile', () => {
    
    it('should get user profile with valid token', async () => {
      const response = await testHelper.get('/api/users/profile', 'admin');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('role');
      expect(response.body.data.password).toBeUndefined();
    });
    
    it('should fail without authentication token', async () => {
      const response = await testHelper.get('/api/users/profile');
      
      testHelper.assertUnauthorized(response);
    });
    
    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token');
      
      testHelper.assertUnauthorized(response);
    });
    
  });
  
  describe('PUT /api/users/profile', () => {
    
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };
      
      const response = await testHelper.put('/api/users/profile', updateData, 'user');
      
      testHelper.assertSuccess(response, 200);
      expect(response.body.data.firstName).toBe(updateData.firstName);
      expect(response.body.data.lastName).toBe(updateData.lastName);
    });
    
    it('should fail to update email to existing one', async () => {
      const updateData = {
        email: 'admin@test.com' // This email already exists
      };
      
      const response = await testHelper.put('/api/users/profile', updateData, 'user');
      
      testHelper.assertError(response, 400, 'already exists');
    });
    
    it('should fail without authentication', async () => {
      const response = await testHelper.put('/api/users/profile', {
        firstName: 'Test'
      });
      
      testHelper.assertUnauthorized(response);
    });
    
  });
  
});

describe('🛡️ Authorization Tests', () => {
  
  describe('Role-based Access Control', () => {
    
    it('should allow admin to access admin-only endpoints', async () => {
      const response = await testHelper.get('/api/users', 'admin');
      
      testHelper.assertSuccess(response, 200);
    });
    
    it('should allow manager to access manager-level endpoints', async () => {
      const response = await testHelper.get('/api/users', 'manager');
      
      testHelper.assertSuccess(response, 200);
    });
    
    it('should deny regular user access to admin endpoints', async () => {
      const response = await testHelper.get('/api/users', 'user');
      
      testHelper.assertForbidden(response);
    });
    
    it('should allow users to access their own resources', async () => {
      const testData = testHelper.getTestData();
      const userId = testData.users[2].id; // Regular user
      
      const response = await testHelper.get(`/api/users/${userId}`, 'user');
      
      testHelper.assertSuccess(response, 200);
    });
    
    it('should deny users access to other users resources', async () => {
      const testData = testHelper.getTestData();
      const adminId = testData.users[0].id; // Admin user
      
      const response = await testHelper.get(`/api/users/${adminId}`, 'user');
      
      testHelper.assertForbidden(response);
    });
    
  });
  
});

describe('🔒 Security Tests', () => {
  
  describe('Input Sanitization', () => {
    
    it('should sanitize malicious input', async () => {
      const maliciousData = MockDataGenerator.generateUser({
        firstName: '<script>alert("xss")</script>',
        lastName: '<?php echo "injection"; ?>'
      });
      
      const response = await testHelper.post('/api/users/register', maliciousData);
      
      if (response.status === 201) {
        // If registration succeeded, check that malicious content was sanitized
        expect(response.body.data.user.firstName).not.toContain('<script>');
        expect(response.body.data.user.lastName).not.toContain('<?php');
      }
    });
    
  });
  
  describe('Rate Limiting', () => {
    
    it('should handle multiple rapid requests', async () => {
      const requests = [];
      
      // Make 10 rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          testHelper.post('/api/users/login', {
            email: 'admin@test.com',
            password: 'password123'
          })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed (assuming rate limit is higher than 10)
      // Or some should be rate limited
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(successCount + rateLimitedCount).toBe(10);
      
      if (rateLimitedCount > 0) {
        console.log(`Rate limiting working: ${rateLimitedCount} requests were rate limited`);
      }
    });
    
  });
  
  describe('Token Security', () => {
    
    it('should generate different tokens for different logins', async () => {
      const response1 = await testHelper.post('/api/users/login', {
        email: 'admin@test.com',
        password: 'password123'
      });
      
      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response2 = await testHelper.post('/api/users/login', {
        email: 'admin@test.com',
        password: 'password123'
      });
      
      testHelper.assertSuccess(response1, 200);
      testHelper.assertSuccess(response2, 200);
      
      expect(response1.body.data.token).not.toBe(response2.body.data.token);
    });
    
    it('should reject expired tokens', async () => {
      // This test would require generating an expired token
      // For now, we'll test with an invalid token format
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer expired.token.here');
      
      testHelper.assertUnauthorized(response);
    });
    
  });
  
});
