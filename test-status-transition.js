/**
 * Quick test for order status transitions and notifications
 */

const io = require('socket.io-client');
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function testStatusTransitions() {
  console.log('🧪 Testing Order Status Transitions...');

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

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Get existing orders
    const ordersResponse = await axios.get(`${API_BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const orders = ordersResponse.data.orders || [];
    console.log(`📦 Found ${orders.length} existing orders`);

    if (orders.length === 0) {
      console.log('❌ No orders found to test status transitions');
      socket.disconnect();
      return;
    }

    // Use the first order that's not DELIVERED or CANCELLED
    const testOrder = orders.find(order =>
      !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status)
    ) || orders[0];

    console.log(`🔄 Testing with order #${testOrder.id}, current status: ${testOrder.status}`);

    // Define valid next statuses based on current status
    const nextStatusMap = {
      'PENDING': ['PROCESSING', 'CANCELLED'],
      'PROCESSING': ['SHIPPED', 'CANCELLED'],
      'SHIPPED': ['DELIVERED', 'CANCELLED'],
      'DELIVERED': ['RETURNED'],
      'CANCELLED': [],
      'RETURNED': []
    };

    const validNextStatuses = nextStatusMap[testOrder.status] || [];

    if (validNextStatuses.length === 0) {
      console.log(`ℹ️  Order is in final status ${testOrder.status}, no valid transitions available`);
      socket.disconnect();
      return;
    }

    // Test first valid transition
    const newStatus = validNextStatuses[0];
    console.log(`🔄 Testing transition: ${testOrder.status} → ${newStatus}`);

    try {
      await axios.put(`${API_BASE_URL}/orders/${testOrder.id}`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(`✅ Successfully updated order to ${newStatus}`);

      // Wait for notification
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error(`❌ Failed to update to ${newStatus}:`, error.response?.data || error.message);
    }

    // Test invalid transition (should fail)
    console.log('\\n🚫 Testing invalid transition...');
    try {
      await axios.put(`${API_BASE_URL}/orders/${testOrder.id}`, {
        status: 'PENDING'  // This should fail from most statuses
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Unexpected success - invalid transition was allowed!');
    } catch (error) {
      console.log('✅ Correctly blocked invalid transition:', error.response?.data?.message || error.message);
    }

    console.log('\\n🎉 Status transition test completed!');
    socket.disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('📄 Error details:', error.response.data);
    }
  }
}

testStatusTransitions();