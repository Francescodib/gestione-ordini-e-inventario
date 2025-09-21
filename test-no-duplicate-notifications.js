const axios = require('axios');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function testNoDuplicateNotifications() {
  try {
    console.log('🎯 Test for single notification (no duplicates)...\n');

    // Login
    const loginResponse = await axios.post(`${API_BASE}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log(`User role: ${loginResponse.data.user.role}\n`);

    // Connect WebSocket
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected\n');
    });

    let notificationCount = 0;
    socket.on('notification', (notification) => {
      notificationCount++;
      console.log(`🔔 NOTIFICATION #${notificationCount}:`);
      console.log(`  Type: ${notification.type}`);
      console.log(`  Title: ${notification.title}`);
      console.log(`  Message: ${notification.message}`);
      console.log(`  Time: ${new Date(notification.timestamp).toLocaleString()}`);
      console.log('');
    });

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test with order #7 (SHIPPED → DELIVERED)
    const orderId = 7;
    console.log(`Testing order #${orderId}: SHIPPED → DELIVERED...`);

    const response = await axios.put(`${API_BASE}/orders/${orderId}/status`, {
      status: 'DELIVERED'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Status change response: ${response.status} - ${response.data.message}\n`);

    // Wait for notifications
    console.log('Waiting for notifications...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`📊 Total notifications received: ${notificationCount}`);

    if (notificationCount === 1) {
      console.log('✅ Perfect! Only one notification received (duplicates fixed)');
    } else if (notificationCount > 1) {
      console.log(`❌ Still receiving ${notificationCount} notifications (duplicates not fixed)`);
    } else {
      console.log('❌ No notifications received');
    }

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

testNoDuplicateNotifications();