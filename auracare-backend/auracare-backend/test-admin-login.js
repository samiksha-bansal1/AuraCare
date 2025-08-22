const axios = require('axios');

async function testAdminLogin() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      type: 'nurse',
      email: 'admin@hospital.test',
      password: 'Admin123!'
    });
    
    console.log('Login successful:', response.data);
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
  }
}

testAdminLogin();
