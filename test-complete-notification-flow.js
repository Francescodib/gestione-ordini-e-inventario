/**
 * Complete End-to-End Notification Flow Test
 * Creates order, tests status changes, and verifies notifications
 */

const io = require('socket.io-client');
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function testCompleteNotificationFlow() {
  console.log('🧪 Testing Complete Notification Flow...');

  try {
    // 1. Authenticate
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });

    const { token } = loginResponse.data;
    console.log('✅ Authenticated successfully');

    // 2. Connect to WebSocket
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    const notifications = [];

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    socket.on('notification', (notification) => {
      notifications.push(notification);
      console.log('📬 NOTIFICATION:', {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        orderId: notification.orderId
      });
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Get or create test data
    const [productsResponse, categoriesResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(`${API_BASE_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    const products = productsResponse.data.products || [];
    const categories = categoriesResponse.data.data || [];

    console.log(`📦 Found ${products.length} products and ${categories.length} categories`);

    // Use existing product or skip if none available
    if (products.length === 0) {
      console.log('⚠️  No products available for testing. Please create a product first.');
      socket.disconnect();
      return;
    }

    const testProduct = products[0];
    console.log(`Using product: ${testProduct.name} (ID: ${testProduct.id})`);

    // 4. Create a test order
    console.log('🛒 Creating test order...');
    const orderResponse = await axios.post(`${API_BASE_URL}/orders`, {
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
        postalCode: '12345',
        country: 'Italy'
      }
    }, { headers: { Authorization: `Bearer ${token}` } });

    const order = orderResponse.data;
    console.log(`✅ Created order #${order.id} with status: ${order.status}`);

    // Wait for new order notification
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Test valid status transitions with notifications
    const validTransitions = [
      { from: 'PENDING', to: 'PROCESSING', description: 'Start processing order' },
      { from: 'PROCESSING', to: 'SHIPPED', description: 'Ship the order' },
      { from: 'SHIPPED', to: 'DELIVERED', description: 'Deliver the order' }
    ];

    let currentStatus = order.status;

    for (const transition of validTransitions) {
      if (currentStatus !== transition.from) {
        console.log(`⏭️  Skipping ${transition.from} → ${transition.to} (current status: ${currentStatus})`);
        continue;
      }

      console.log(`🔄 Testing transition: ${transition.from} → ${transition.to}`);
      console.log(`   Description: ${transition.description}`);

      try {
        await axios.put(`${API_BASE_URL}/orders/${order.id}`, {
          status: transition.to
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`✅ Successfully updated order to ${transition.to}`);
        currentStatus = transition.to;

        // Wait for notification
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`❌ Failed to update to ${transition.to}:`, error.response?.data || error.message);
        break;
      }
    }

    // 6. Test invalid transition (should fail)
    console.log('\n🚫 Testing invalid transition...');
    try {
      await axios.put(`${API_BASE_URL}/orders/${order.id}`, {
        status: 'PENDING'  // Invalid backward transition
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Unexpected success - invalid transition was allowed!');
    } catch (error) {
      console.log('✅ Correctly blocked invalid transition:', error.response?.data?.message || error.message);
    }

    // 7. Summary
    console.log('\n📊 Notification Summary:');
    console.log(`Total notifications received: ${notifications.length}`);

    const notificationTypes = notifications.reduce((acc, notif) => {
      acc[notif.type] = (acc[notif.type] || 0) + 1;
      return acc;
    }, {});

    Object.entries(notificationTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    const orderNotifications = notifications.filter(n => n.orderId === order.id);
    console.log(`Order-specific notifications: ${orderNotifications.length}`);

    console.log('\n🎉 Complete notification flow test completed!');
    socket.disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('📄 Error details:', error.response.data);
    }
  }
}

testCompleteNotificationFlow();