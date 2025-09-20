/**
 * Test inventory notifications
 */

const io = require('socket.io-client');
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function testInventoryNotifications() {
  console.log('🧪 Testing inventory notifications...');

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
        data: notification.data
      });
    });

    // 3. Wait for connection
    await new Promise(resolve => {
      socket.on('connect', resolve);
      setTimeout(() => resolve(), 3000);
    });

    // 4. Get products
    const productsResponse = await axios.get(`${API_BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const products = productsResponse.data.products || [];
    console.log(`📦 Found ${products.length} products`);

    if (products.length > 0) {
      const product = products[0];
      console.log(`📦 Testing with product: ${product.name} (ID: ${product.id})`);
      console.log(`📊 Current stock: ${product.stock}, Min stock: ${product.minStock}`);

      // 5. Trigger low inventory notification
      console.log('⚠️ Setting stock below minimum to trigger notification...');

      const lowStock = Math.max(0, (product.minStock || 10) - 1);

      await axios.put(`${API_BASE_URL}/products/${product.id}`, {
        stock: lowStock
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(`✅ Updated product stock to ${lowStock}`);

      // 6. Wait for notification
      console.log('⏳ Waiting for low inventory notification...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 7. Restore stock
      await axios.put(`${API_BASE_URL}/products/${product.id}`, {
        stock: (product.minStock || 10) + 10
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('🧹 Restored stock levels');
    }

    console.log('✅ Inventory notification test completed!');
    socket.disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('📄 Error details:', error.response.data);
    }
  }
}

testInventoryNotifications();