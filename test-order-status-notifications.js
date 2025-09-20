/**
 * Test Order Status Change Notifications
 * Tests valid status transitions and notifications
 */

const io = require('socket.io-client');
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function testOrderStatusNotifications() {
  console.log('🧪 Testing Order Status Change Notifications...');

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

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    socket.on('notification', (notification) => {
      console.log('📬 NOTIFICATION:', {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        orderId: notification.orderId
      });
    });

    // 3. Wait for connection
    await new Promise(resolve => {
      socket.on('connect', resolve);
      setTimeout(() => resolve(), 5000);
    });

    // 4. Get products and categories
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

    // 5. Create category if needed
    let categoryId = categories.length > 0 ? categories[0].id : null;
    if (!categoryId) {
      const categoryResponse = await axios.post(`${API_BASE_URL}/categories`, {
        name: 'Test Category for Notifications',
        description: 'Test category',
        slug: 'test-notifications'
      }, { headers: { Authorization: `Bearer ${token}` } });

      categoryId = categoryResponse.data.id;
      console.log(`✅ Created test category: ${categoryId}`);
    }

    // 6. Use existing product or create one with valid SKU if needed
    let productId = products.length > 0 ? products[0].id : null;
    if (!productId) {
      const timestamp = Date.now().toString().slice(-8); // Last 8 digits
      const productResponse = await axios.post(`${API_BASE_URL}/products`, {
        name: 'Test Product for Notifications',
        description: 'Test product for order status notifications',
        sku: `TST-${timestamp}`,
        categoryId: categoryId,
        price: 29.99,
        costPrice: 15.00,
        stock: 50,
        minStock: 5
      }, { headers: { Authorization: `Bearer ${token}` } });

      productId = productResponse.data.id;
      console.log(`✅ Created test product: ${productId}`);
    } else {
      console.log(`✅ Using existing product: ${productId}`);
    }

    // 7. Create a test order
    console.log('🛒 Creating test order...');
    const orderResponse = await axios.post(`${API_BASE_URL}/orders`, {
      items: [{
        productId: productId,
        quantity: 2,
        price: 29.99
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

    // 8. Test valid status transitions with notifications
    const validTransitions = [
      { from: 'PENDING', to: 'PROCESSING', description: 'Start processing order' },
      { from: 'PROCESSING', to: 'SHIPPED', description: 'Ship the order' },
      { from: 'SHIPPED', to: 'DELIVERED', description: 'Deliver the order' }
    ];

    for (const transition of validTransitions) {
      console.log(`🔄 Testing transition: ${transition.from} → ${transition.to}`);
      console.log(`   Description: ${transition.description}`);

      try {
        await axios.put(`${API_BASE_URL}/orders/${order.id}`, {
          status: transition.to
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`✅ Successfully updated order to ${transition.to}`);

        // Wait for notification
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`❌ Failed to update to ${transition.to}:`, error.response?.data || error.message);
      }
    }

    // 9. Test invalid transition (should fail)
    console.log('\n🚫 Testing invalid transition: DELIVERED → PENDING (should fail)');
    try {
      await axios.put(`${API_BASE_URL}/orders/${order.id}`, {
        status: 'PENDING'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Unexpected success - invalid transition was allowed!');
    } catch (error) {
      console.log('✅ Correctly blocked invalid transition:', error.response?.data?.message || error.message);
    }

    // 10. Test valid return transition
    console.log('\n📦 Testing valid return transition: DELIVERED → RETURNED');
    try {
      await axios.put(`${API_BASE_URL}/orders/${order.id}`, {
        status: 'RETURNED'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Successfully processed return');

      // Wait for notification
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error('❌ Failed to process return:', error.response?.data || error.message);
    }

    console.log('\n🎉 Order status notification test completed!');
    socket.disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('📄 Error details:', error.response.data);
    }
  }
}

testOrderStatusNotifications();