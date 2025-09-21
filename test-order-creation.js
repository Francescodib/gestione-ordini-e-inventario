/**
 * Test order creation with corrected address format
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testOrderCreation() {
  console.log('🧪 Testing Order Creation with Fixed Address Format...');

  try {
    // 1. Authenticate
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });

    const { token } = loginResponse.data;
    console.log('✅ Authenticated successfully');

    // 2. Get products
    const productsResponse = await axios.get(`${API_BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const products = productsResponse.data.products || [];
    console.log(`📦 Found ${products.length} products`);

    if (products.length === 0) {
      console.log('❌ No products available for testing');
      return;
    }

    const testProduct = products[0];
    console.log(`Using product: ${testProduct.name} (ID: ${testProduct.id})`);

    // 3. Create a test order with proper address format
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

testOrderCreation();