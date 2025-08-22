const axios = require('axios');

async function testAdminLogin() {
  try {
    console.log('Testing admin login...');
    const payload = {
      type: 'nurse',
      email: 'admin@hospital.test',
      password: 'Admin123!'
    };
    
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post('http://127.0.0.1:5000/api/auth/login', payload);
    
    console.log('Login successful:', response.data);
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testAdminLogin();
