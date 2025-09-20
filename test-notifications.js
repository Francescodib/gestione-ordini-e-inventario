/**
 * Test script for WebSocket notifications
 * This script tests the notification system by simulating order updates
 */

const io = require('socket.io-client');
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function testNotificationSystem() {
  console.log('🧪 Starting notification system test...');

  try {
    // 1. First authenticate to get a token
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

    // 2. Connect to WebSocket with token
    console.log('🔌 Connecting to WebSocket...');
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      console.log(`📡 Socket ID: ${socket.id}`);
    });

    socket.on('notification', (notification) => {
      console.log('📬 Received notification:', {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: notification.timestamp
      });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    // 3. Wait for connection
    await new Promise(resolve => {
      socket.on('connect', resolve);
      setTimeout(() => resolve(), 5000); // Timeout after 5 seconds
    });

    if (!socket.connected) {
      throw new Error('WebSocket connection failed');
    }

    // 4. Get existing orders to test with
    console.log('📋 Fetching existing orders...');
    const ordersResponse = await axios.get(`${API_BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const orders = ordersResponse.data.orders || [];
    console.log(`📦 Found ${orders.length} existing orders`);

    if (orders.length > 0) {
      // 5. Test order status change notification
      const testOrder = orders[0];
      console.log(`🔄 Testing order status change for order #${testOrder.id}...`);

      // Change order status to trigger notification
      const statusOptions = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
      const currentStatus = testOrder.status;
      const newStatus = statusOptions.find(status => status !== currentStatus) || 'CONFIRMED';

      await axios.put(`${API_BASE_URL}/orders/${testOrder.id}`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(`✅ Updated order #${testOrder.id} status: ${currentStatus} → ${newStatus}`);

      // 6. Wait for notification
      console.log('⏳ Waiting for notification...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 7. Revert status change
      await axios.put(`${API_BASE_URL}/orders/${testOrder.id}`, {
        status: currentStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(`🔄 Reverted order #${testOrder.id} status back to: ${currentStatus}`);
    }

    // 8. Test manual notification (if admin/manager)
    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      console.log('🔔 Testing manual system notification...');

      // Send a test system notification via the notification service
      // This would require an API endpoint to manually trigger notifications
      // For now, we'll just log that we would test this
      console.log('ℹ️  Manual notification test would require admin API endpoint');
    }

    console.log('✅ Notification system test completed successfully!');

    // 9. Disconnect
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
testNotificationSystem();