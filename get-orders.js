const axios = require('axios');

async function getOrders() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/users/login', {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });

    const token = loginResponse.data.token;

    // Get orders
    const ordersResponse = await axios.get('http://localhost:3000/api/orders', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Orders found:');
    ordersResponse.data.data.forEach(order => {
      console.log(`ID: ${order.id}, Status: ${order.status}, OrderNumber: ${order.orderNumber}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

getOrders();