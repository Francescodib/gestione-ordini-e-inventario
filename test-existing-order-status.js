const axios = require('axios');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function testExistingOrderStatus() {
  try {
    console.log('🧪 Testing order status change notifications with existing order...\n');

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
      console.log('🔔 NOTIFICATION RECEIVED:');
      console.log('  Type:', notification.type);
      console.log('  Title:', notification.title);
      console.log('  Message:', notification.message);
      console.log('  Time:', new Date(notification.timestamp).toLocaleString());
      if (notification.orderId) {
        console.log('  Order ID:', notification.orderId);
      }
      if (notification.data) {
        console.log('  Data:', JSON.stringify(notification.data, null, 2));
      }
      console.log('');
    });

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Use order #4 which is PROCESSING (can transition to SHIPPED)
    const orderId = 4;

    console.log(`3. Testing with existing order #${orderId} (PROCESSING status)...`);

    // 4. Valid transition: PROCESSING → SHIPPED
    console.log(`4. Changing order #${orderId} status: PROCESSING → SHIPPED...`);
    const statusResponse1 = await axios.put(`${API_BASE}/orders/${orderId}/status`, {
      status: 'SHIPPED'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Status change successful:', statusResponse1.status);
    console.log('Response:', statusResponse1.data.message);

    // Wait for notification
    console.log('\\nWaiting for status change notification...\\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 5. Valid transition: SHIPPED → DELIVERED
    console.log(`5. Changing order #${orderId} status: SHIPPED → DELIVERED...`);
    const statusResponse2 = await axios.put(`${API_BASE}/orders/${orderId}/status`, {
      status: 'DELIVERED'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Status change successful:', statusResponse2.status);
    console.log('Response:', statusResponse2.data.message);

    // Wait for notification
    console.log('\\nWaiting for final notification...\\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

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

testExistingOrderStatus();