const axios = require('axios');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function finalNotificationTest() {
  try {
    console.log('🎯 Final notification test...\n');

    // Login
    const loginResponse = await axios.post(`${API_BASE}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Connect WebSocket
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected\n');
    });

    socket.on('notification', (notification) => {
      console.log('🔔 NOTIFICATION RECEIVED:');
      console.log(`  Type: ${notification.type}`);
      console.log(`  Title: ${notification.title}`);
      console.log(`  Message: ${notification.message}`);
      console.log(`  Time: ${new Date(notification.timestamp).toLocaleString()}`);
      console.log('');
    });

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test with order #8 (SHIPPED → DELIVERED)
    const orderId = 8;
    console.log(`Testing order #${orderId}: SHIPPED → DELIVERED...`);

    const response = await axios.put(`${API_BASE}/orders/${orderId}/status`, {
      status: 'DELIVERED'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Status change response: ${response.status} - ${response.data.message}\n`);

    // Wait for notification
    console.log('Waiting for notification...\n');
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

finalNotificationTest();