const axios = require('axios');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function testOrderStatusOnly() {
  try {
    console.log('🧪 Testing order status change only...\n');

    // 1. Login
    const loginResponse = await axios.post(`${API_BASE}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // 2. Connect WebSocket
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected\n');
    });

    socket.on('notification', (notification) => {
      console.log('🔔 NOTIFICATION:');
      console.log('  Type:', notification.type);
      console.log('  Title:', notification.title);
      console.log('  Message:', notification.message);
      console.log('  Time:', new Date(notification.timestamp).toLocaleString());
      if (notification.orderId) {
        console.log('  Order ID:', notification.orderId);
      }
      console.log('');
    });

    // Wait a bit for connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Use an existing order (hardcoded from notifications we saw)
    const orderId = 9; // From the notifications we just saw

    console.log(`Using order #${orderId} for status change test\n`);

    // 4. Update order status
    console.log(`Updating order #${orderId} status to 'PROCESSING'...`);
    const updateResponse = await axios.put(`${API_BASE}/orders/${orderId}/status`, {
      status: 'PROCESSING'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Status update response:', updateResponse.status);
    console.log('Response data:', JSON.stringify(updateResponse.data, null, 2));

    // 5. Wait for notification
    console.log('\nWaiting for status change notification...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 6. Try another status change
    console.log(`Updating order #${orderId} status to 'SHIPPED'...`);
    const updateResponse2 = await axios.put(`${API_BASE}/orders/${orderId}/status`, {
      status: 'SHIPPED'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Second status update response:', updateResponse2.status);

    // 7. Wait for final notification
    console.log('\nWaiting for final notification...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('✅ Test completed!');
    socket.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testOrderStatusOnly();