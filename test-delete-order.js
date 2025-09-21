const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testDeleteOrder() {
  try {
    console.log('🗑️  Testing order deletion (admin only)...\n');

    // 1. Login as admin
    const loginResponse = await axios.post(`${API_BASE}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log(`User role: ${loginResponse.data.user.role}\n`);

    // 2. Check available orders
    const ordersResponse = await axios.get(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const orders = ordersResponse.data.data;
    console.log('📋 Available orders:');
    orders.slice(0, 5).forEach(order => {
      console.log(`  - ID: ${order.id}, Status: ${order.status}, Number: ${order.orderNumber}`);
    });

    // Use the first available order for testing
    const testOrder = orders[0];
    if (!testOrder) {
      console.log('❌ No orders available for testing');
      return;
    }

    console.log(`\n🎯 Testing deletion with order #${testOrder.id} (${testOrder.orderNumber})`);

    // 3. Get order details before deletion
    const orderDetailResponse = await axios.get(`${API_BASE}/orders/${testOrder.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const orderDetail = orderDetailResponse.data.data;
    console.log(`Order details:`);
    console.log(`  - Total: €${orderDetail.totalAmount}`);
    console.log(`  - Items: ${orderDetail.items?.length || 0}`);
    if (orderDetail.items && orderDetail.items.length > 0) {
      orderDetail.items.forEach(item => {
        console.log(`    - ${item.name} (Qty: ${item.quantity})`);
      });
    }

    // 4. Delete the order
    console.log(`\n🗑️  Deleting order ${testOrder.id}...`);
    const deleteResponse = await axios.delete(`${API_BASE}/orders/${testOrder.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Order deleted successfully!');
    console.log('Response:', deleteResponse.data.message);

    // 5. Verify order is deleted
    console.log('\n🔍 Verifying deletion...');
    try {
      await axios.get(`${API_BASE}/orders/${testOrder.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Order still exists (deletion failed)');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Order correctly deleted (404 Not Found)');
      } else {
        console.log('❓ Unexpected error:', error.message);
      }
    }

    console.log('\n✅ Order deletion test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

testDeleteOrder();