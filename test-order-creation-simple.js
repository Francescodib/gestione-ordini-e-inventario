/**
 * Simple test for order creation with corrected address format
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testOrderCreationSimple() {
  console.log('🧪 Testing Order Creation with Fixed Address Format (Simple)...');

  try {
    // 1. Authenticate
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });

    const { token } = loginResponse.data;
    console.log('✅ Authenticated successfully');

    // 2. Create a test order with proper address format (using a known product ID)
    console.log('🛒 Creating test order with corrected address format...');

    const orderData = {
      items: [{
        productId: 1, // Use a simple ID - it will be validated by the backend
        quantity: 1,
        price: 29.99
      }],
      shippingAddress: {
        firstName: 'Test',
        lastName: 'User',
        address1: '123 Test Street',
        city: 'Test City',
        state: 'Test State', // This was missing before and causing the 400 error!
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
    console.log(`   🎉 Order creation with fixed address format works!`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('📄 Error details:', error.response.data);
    }
    if (error.response?.status) {
      console.error(`📊 HTTP Status: ${error.response.status}`);
    }

    // If it's still a validation error, show what field is missing
    if (error.response?.status === 400 && error.response?.data?.errors) {
      console.error('🔍 Validation errors:');
      error.response.data.errors.forEach(err => {
        console.error(`   - ${err.field}: ${err.message}`);
      });
    }
  }
}

testOrderCreationSimple();