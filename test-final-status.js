const axios = require('axios');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function finalTest() {
  try {
    console.log('🧪 Final notification test...\n');

    // 1. Login
    const loginResponse = await axios.post(`${API_BASE}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // 2. Connect WebSocket and setup notification listener
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
      if (notification.data) {
        console.log('  Data:', JSON.stringify(notification.data, null, 2));
      }
      console.log('');
    });

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Create a new order (should get PENDING status)
    console.log('3. Creating new order...');
    const productsResponse = await axios.get(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const product = productsResponse.data.data[0];

    const orderData = {
      items: [{
        productId: product.id,
        quantity: 1,
        price: product.price
      }],
      shippingAddress: {
        firstName: 'Test',
        lastName: 'User',
        address1: 'Via Test 123',
        city: 'Milano',
        state: 'MI',
        postalCode: '20100',
        country: 'IT'
      }
    };

    const orderResponse = await axios.post(`${API_BASE}/orders`, orderData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Raw order response:', JSON.stringify(orderResponse.data, null, 2));

    const orderId = orderResponse.data.data?.id || orderResponse.data.id;
    console.log(`✅ Created order #${orderId}\n`);

    // Wait for creation notification
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Change status PENDING -> PROCESSING
    console.log(`4. Changing order #${orderId} status: PENDING -> PROCESSING...`);
    const statusResponse1 = await axios.put(`${API_BASE}/orders/${orderId}/status`, {
      status: 'PROCESSING'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Status change response:', statusResponse1.status, statusResponse1.data.message);

    // Wait for notification
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Change status PROCESSING -> SHIPPED
    console.log(`5. Changing order #${orderId} status: PROCESSING -> SHIPPED...`);
    const statusResponse2 = await axios.put(`${API_BASE}/orders/${orderId}/status`, {
      status: 'SHIPPED'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Status change response:', statusResponse2.status, statusResponse2.data.message);

    // Wait for final notification
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

finalTest();