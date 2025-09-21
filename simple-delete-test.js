const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function simpleDeleteTest() {
  try {
    console.log('🔑 Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    console.log('📋 Getting orders...');
    const ordersResponse = await axios.get(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const orders = ordersResponse.data.data;
    if (!orders || orders.length === 0) {
      console.log('❌ No orders found');
      return;
    }

    const testOrder = orders[0];
    console.log(`🎯 Found order ${testOrder.id} (${testOrder.orderNumber})`);

    console.log('🗑️ Attempting deletion...');
    const deleteResponse = await axios.delete(`${API_BASE}/orders/${testOrder.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000 // 10 second timeout
    });

    console.log('✅ Delete response:', deleteResponse.data);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Request timed out');
    }
  }
}

simpleDeleteTest();