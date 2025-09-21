const axios = require('axios');

async function checkUserRole() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/users/login', {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });

    const token = loginResponse.data.token;
    console.log('Login successful');
    console.log('User data:', loginResponse.data.user);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

checkUserRole();