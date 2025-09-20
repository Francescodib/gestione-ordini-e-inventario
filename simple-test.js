/**
 * Simple notification test using existing data
 */

const io = require('socket.io-client');
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function simpleNotificationTest() {
  console.log('🧪 Starting simple notification test...');

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
        message: notification.message
      });
    });

    // 3. Wait for connection
    await new Promise(resolve => {
      socket.on('connect', resolve);
      setTimeout(() => resolve(), 5000);
    });

    // 4. Create a simple order using existing product
    console.log('🛒 Creating order with existing product...');

    const orderData = {
      items: [
        {
          productId: 3, // Using existing product ID from the database
          quantity: 1,
          price: 899.99
        }
      ],
      shippingAddress: {
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
    console.log(`✅ Created order #${order.id}`);

    // 5. Wait for new order notification
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. Test status changes
    const statuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED'];

    for (const status of statuses) {
      console.log(`🔄 Updating order to ${status}...`);

      await axios.put(`${API_BASE_URL}/orders/${order.id}`, {
        status: status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(`✅ Updated order to ${status}`);

      // Wait for notification
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log('✅ Test completed successfully!');
    socket.disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('📄 Error details:', error.response.data);
    }
  }
}

simpleNotificationTest();