/**
 * Create a test product for notification testing
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function createTestProduct() {
  console.log('🛠️  Creating test product...');

  try {
    // 1. Authenticate
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });

    const { token } = loginResponse.data;
    console.log('✅ Authenticated successfully');

    // 2. Get categories
    const categoriesResponse = await axios.get(`${API_BASE_URL}/categories`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const categories = categoriesResponse.data.data || [];
    console.log(`📁 Found ${categories.length} categories`);

    if (categories.length === 0) {
      console.log('❌ No categories found. Creating a test category first...');

      const categoryResponse = await axios.post(`${API_BASE_URL}/categories`, {
        name: 'Test Category',
        description: 'Category for testing notifications',
        slug: 'test-category'
      }, { headers: { Authorization: `Bearer ${token}` } });

      const categoryId = categoryResponse.data.id;
      console.log(`✅ Created test category: ${categoryId}`);
    }

    const categoryId = categories.length > 0 ? categories[0].id : null;

    // 3. Create test product
    const productResponse = await axios.post(`${API_BASE_URL}/products`, {
      name: 'Test Product',
      description: 'Product for testing order notifications',
      sku: 'TEST-001',
      categoryId: categoryId,
      price: 29.99,
      costPrice: 15.00,
      stock: 100,
      minStock: 10
    }, { headers: { Authorization: `Bearer ${token}` } });

    console.log(`✅ Created test product: ${productResponse.data.id}`);
    console.log(`   Name: ${productResponse.data.name}`);
    console.log(`   SKU: ${productResponse.data.sku}`);
    console.log(`   Price: €${productResponse.data.price}`);

  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️  Test product already exists');
    } else {
      console.error('❌ Failed to create test product:', error.response?.data || error.message);
    }
  }
}

createTestProduct();