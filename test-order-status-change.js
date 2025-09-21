const axios = require('axios');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function testOrderStatusChange() {
  try {
    console.log('🧪 Testing order status change notifications...\n');

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

    // 3. Create a fresh order for testing
    console.log('3. Creating a fresh order for testing...');

    // Get a product first
    const productsResponse = await axios.get(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const product = productsResponse.data.data[0];

    // Create order
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
      }
    };

    const newOrderResponse = await axios.post(`${API_BASE}/orders`, orderData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const createdOrder = newOrderResponse.data;
    var orderId = createdOrder.id;
    console.log(`✅ Created test order #${orderId} (status: PENDING)\n`);

    // Wait for creation notification
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Update order status
    console.log(`4. Updating order #${orderId} status to 'PROCESSING'...`);
    const updateResponse = await axios.put(`${API_BASE}/orders/${orderId}/status`, {
      status: 'PROCESSING'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Order status update response:', updateResponse.status);
    console.log('Response data:', JSON.stringify(updateResponse.data, null, 2));

    // 5. Wait for notification
    console.log('\n5. Waiting for status change notification...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 6. Try another status change
    console.log(`6. Updating order #${orderId} status to 'SHIPPED'...`);
    const updateResponse2 = await axios.put(`${API_BASE}/orders/${orderId}/status`, {
      status: 'SHIPPED'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Second status update response:', updateResponse2.status);

    // 7. Wait for final notification
    console.log('\n7. Waiting for final notification...\n');
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

testOrderStatusChange();