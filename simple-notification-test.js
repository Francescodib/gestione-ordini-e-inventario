const io = require('socket.io-client');
const axios = require('axios');

async function testNotifications() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/users/login', {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });

    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');

    // Connect WebSocket
    const socket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    socket.on('notification', (notification) => {
      console.log('🔔 NOTIFICATION:');
      console.log('  Type:', notification.type);
      console.log('  Title:', notification.title);
      console.log('  Message:', notification.message);
      console.log('  Time:', new Date(notification.timestamp).toLocaleString());
      console.log('');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
    });

    console.log('Listening for notifications... (waiting 30 seconds)');

    // Keep alive for 30 seconds to listen for notifications
    setTimeout(() => {
      console.log('Test completed');
      socket.disconnect();
      process.exit(0);
    }, 30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testNotifications();