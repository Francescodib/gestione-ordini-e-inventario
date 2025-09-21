const axios = require('axios');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

// Test credentials
const testUser = {
  email: 'demo@demo.com',
  password: 'Demo123!'
};

async function testNotifications() {
  try {
    console.log('🧪 Testing notification system...\n');

    // 1. Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/users/login`, testUser);
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // 2. Connect to WebSocket
    console.log('2. Connecting to WebSocket...');
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected\n');
    });

    socket.on('notification', (notification) => {
      console.log('🔔 Notification received:');
      console.log('  Type:', notification.type);
      console.log('  Title:', notification.title);
      console.log('  Message:', notification.message);
      console.log('  Time:', new Date(notification.timestamp).toLocaleString());
      if (notification.orderId) {
        console.log('  Order ID:', notification.orderId);
      }
      console.log('');
    });

    // 3. Get a product to create order
    console.log('3. Getting products...');
    const productsResponse = await axios.get(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!productsResponse.data.data || productsResponse.data.data.length === 0) {
      throw new Error('No products available for testing');
    }

    const product = productsResponse.data.data[0];
    console.log(`✅ Using product: ${product.name} (ID: ${product.id})\n`);

    // 4. Create a new order (should trigger notification)
    console.log('4. Creating new order...');
    const orderData = {
      items: [{
        productId: product.id,
        quantity: 1,
        price: product.price
      }],
      shippingAddress: {
        firstName: 'Mario',
        lastName: 'Rossi',
        address1: 'Via Roma 123',
        city: 'Milano',
        state: 'MI',
        postalCode: '20100',
        country: 'IT'
      },
      notes: 'Test order for notification'
    };

    const orderResponse = await axios.post(`${API_BASE}/orders`, orderData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const createdOrder = orderResponse.data;
    const orderId = createdOrder.id;
    console.log(`✅ Order created: #${orderId}\n`);

    // 5. Wait a bit for notification
    console.log('5. Waiting for new order notification...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. Update order status (should trigger notification)
    console.log('6. Updating order status...');
    await axios.put(`${API_BASE}/orders/${orderId}`, {
      status: 'confirmed'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Order status updated to confirmed\n');

    // 7. Wait for status change notification
    console.log('7. Waiting for status change notification...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 8. Update to another status
    console.log('8. Updating order status to shipped...');
    await axios.put(`${API_BASE}/orders/${orderId}`, {
      status: 'shipped'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Order status updated to shipped\n');

    // 9. Wait for final notification
    console.log('9. Waiting for final notification...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✅ Notification test completed successfully!');

    socket.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Handle socket connection errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  process.exit(1);
});

testNotifications();