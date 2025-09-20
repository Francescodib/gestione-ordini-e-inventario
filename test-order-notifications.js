/**
 * Test script for Order notifications
 * Creates an order and tests status change notifications
 */

const io = require('socket.io-client');
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function testOrderNotifications() {
  console.log('🧪 Starting order notification test...');

  try {
    // 1. Authenticate
    console.log('📡 Authenticating...');
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });

    if (!loginResponse.data.success) {
      throw new Error('Authentication failed');
    }

    const { token, user } = loginResponse.data;
    console.log(`✅ Authenticated as: ${user.email} (${user.role})`);

    // 2. Connect to WebSocket
    console.log('🔌 Connecting to WebSocket...');
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
    });

    socket.on('notification', (notification) => {
      console.log('📬 Received notification:', {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: notification.timestamp,
        data: notification.data
      });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
    });

    // 3. Wait for connection
    await new Promise(resolve => {
      socket.on('connect', resolve);
      setTimeout(() => resolve(), 5000);
    });

    if (!socket.connected) {
      throw new Error('WebSocket connection failed');
    }

    // 4. Get available products and categories first
    console.log('📦 Fetching products and categories...');
    const [productsResponse, categoriesResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(`${API_BASE_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    const products = productsResponse.data.products || [];
    const categories = categoriesResponse.data || [];

    console.log(`📦 Found ${products.length} products and ${categories.length} categories`);

    // 5. Create a category if none exists
    let categoryId;
    if (categories.length === 0) {
      console.log('📁 Creating test category...');
      const categoryResponse = await axios.post(`${API_BASE_URL}/categories`, {
        name: 'Test Category',
        description: 'Test category for notifications',
        slug: 'test-category'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      categoryId = categoryResponse.data.id;
      console.log(`✅ Created category with ID: ${categoryId}`);
    } else {
      categoryId = categories[0].id;
      console.log(`📁 Using existing category: ${categories[0].name} (ID: ${categoryId})`);
    }

    // 6. Create a product if none exists
    let productId;
    if (products.length === 0) {
      console.log('📦 Creating test product...');
      const productResponse = await axios.post(`${API_BASE_URL}/products`, {
        name: 'Test Product',
        description: 'Test product for notifications',
        sku: 'TEST-001',
        categoryId: categoryId,
        price: 19.99,
        costPrice: 10.00,
        stock: 100,
        minStock: 10
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      productId = productResponse.data.id;
      console.log(`✅ Created product with ID: ${productId}`);
    } else {
      productId = products[0].id;
      console.log(`📦 Using existing product: ${products[0].name} (ID: ${productId})`);
    }

    // 7. Create an order
    console.log('🛒 Creating test order...');
    const orderData = {
      items: [
        {
          productId: productId,
          quantity: 2,
          price: 19.99
        }
      ],
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country'
      },
      billingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country'
      }
    };

    const orderResponse = await axios.post(`${API_BASE_URL}/orders`, orderData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const order = orderResponse.data;
    console.log(`✅ Created order #${order.id} with status: ${order.status}`);

    // 8. Wait for new order notification
    console.log('⏳ Waiting for new order notification...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 9. Test order status change notifications
    const statusChanges = [
      { from: 'PENDING', to: 'CONFIRMED' },
      { from: 'CONFIRMED', to: 'PROCESSING' },
      { from: 'PROCESSING', to: 'SHIPPED' },
      { from: 'SHIPPED', to: 'DELIVERED' }
    ];

    for (const change of statusChanges) {
      console.log(`🔄 Changing order status: ${change.from} → ${change.to}`);

      await axios.put(`${API_BASE_URL}/orders/${order.id}`, {
        status: change.to
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(`✅ Updated order #${order.id} to ${change.to}`);

      // Wait for notification
      console.log('⏳ Waiting for status change notification...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // 10. Test low inventory notification by updating stock
    console.log('📦 Testing low inventory notification...');

    await axios.put(`${API_BASE_URL}/products/${productId}`, {
      stock: 5, // Below minStock of 10
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Updated product stock to trigger low inventory notification');

    // Wait for low inventory notification
    console.log('⏳ Waiting for low inventory notification...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 11. Cleanup - restore product stock
    await axios.put(`${API_BASE_URL}/products/${productId}`, {
      stock: 100
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('🧹 Restored product stock');

    console.log('✅ Order notification test completed successfully!');

    // 12. Disconnect
    socket.disconnect();
    console.log('🔌 WebSocket disconnected');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📄 Response data:', error.response.data);
    }
  }
}

// Run the test
testOrderNotifications();