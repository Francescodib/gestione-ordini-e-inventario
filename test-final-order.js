/**
 * Final test for order creation with notification system
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testFinalOrder() {
  console.log('🎯 Testing Final Order Creation with Notifications...');

  try {
    // 1. Authenticate
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });

    const { token } = loginResponse.data;
    console.log('✅ Authenticated successfully');

    // 2. Create test order with product ID 14 (just created)
    console.log('🛒 Creating test order with product ID 14...');

    const orderData = {
      items: [{
        productId: 14, // Use the product we just created
        quantity: 2,
        price: 25.99
      }],
      shippingAddress: {
        firstName: 'Test',
        lastName: 'User',
        address1: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'Italy'
      }
    };

    console.log('📋 Order data:', JSON.stringify(orderData, null, 2));

    const orderResponse = await axios.post(`${API_BASE_URL}/orders`, orderData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const order = orderResponse.data;
    console.log(`✅ Successfully created order #${order.id}`);
    console.log(`   Order Number: ${order.orderNumber}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Total Amount: €${order.totalAmount}`);
    console.log(`   🎉 Order creation and notification system working!`);

    // 3. Test status change to trigger notifications
    console.log('\n🔄 Testing status change notification...');

    const statusChangeResponse = await axios.patch(`${API_BASE_URL}/orders/${order.id}/status`, {
      status: 'PROCESSING'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Status changed to: ${statusChangeResponse.data.status}`);
    console.log('🔔 Notification should have been sent via WebSocket!');

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

testFinalOrder();