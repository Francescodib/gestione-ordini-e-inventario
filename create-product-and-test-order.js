/**
 * Create a product and test order creation with corrected address format
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function createProductAndTestOrder() {
  console.log('🧪 Creating Product and Testing Order Creation...');

  try {
    // 1. Authenticate
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });

    const { token } = loginResponse.data;
    console.log('✅ Authenticated successfully');

    // 2. Get categories first
    const categoriesResponse = await axios.get(`${API_BASE_URL}/categories`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const categories = categoriesResponse.data.data || [];
    console.log(`📁 Found ${categories.length} categories`);

    if (categories.length === 0) {
      console.log('❌ No categories available');
      return;
    }

    // 3. Create a test product
    console.log('🛠️  Creating test product...');
    const productData = {
      name: 'Test Product for Notifications',
      description: 'This is a test product for testing order notifications',
      sku: 'TEST-NOTIF-002',
      categoryId: categories[0].id,
      price: 29.99,
      costPrice: 15.00,
      stock: 100,
      minStock: 10
    };

    let testProduct;
    try {
      const productResponse = await axios.post(`${API_BASE_URL}/products`, productData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      testProduct = productResponse.data;
      console.log(`✅ Created test product: ${testProduct.id || 'ID missing'}`, testProduct);
    } catch (err) {
      if (err.response?.status === 409) {
        console.log('ℹ️  Product already exists, fetching existing product...');
        // Get existing products
        const productsResponse = await axios.get(`${API_BASE_URL}/products`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const products = productsResponse.data.products || [];
        testProduct = products.find(p => p.sku === 'TEST-NOTIF-002') || products[0];
        if (!testProduct) {
          console.log('❌ Could not find any products');
          return;
        }
        console.log(`✅ Using existing product: ${testProduct.id}`);
      } else {
        throw err;
      }
    }

    // 4. Create a test order with proper address format
    console.log('🛒 Creating test order with corrected address format...');

    const orderData = {
      items: [{
        productId: testProduct.id,
        quantity: 1,
        price: testProduct.price || 29.99
      }],
      shippingAddress: {
        firstName: 'Test',
        lastName: 'User',
        address1: '123 Test Street',
        city: 'Test City',
        state: 'Test State', // This was missing before!
        postalCode: '12345',
        country: 'Italy'
      }
    };

    console.log('📋 Order data:', JSON.stringify(orderData, null, 2));

    const orderResponse = await axios.post(`${API_BASE_URL}/orders`, orderData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const order = orderResponse.data;
    console.log(`✅ Successfully created order #${order.id} with status: ${order.status}`);
    console.log(`   Order Number: ${order.orderNumber}`);
    console.log(`   Total Amount: €${order.totalAmount}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('📄 Error details:', error.response.data);
    }
    if (error.response?.status) {
      console.error(`📊 HTTP Status: ${error.response.status}`);
    }
  }
}

createProductAndTestOrder();