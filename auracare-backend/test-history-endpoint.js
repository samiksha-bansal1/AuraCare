// Test script for the unified history endpoint
const axios = require('axios');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const PATIENT_ID = process.env.TEST_PATIENT_ID; // Set this in .env
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN; // Set this in .env

if (!PATIENT_ID || !AUTH_TOKEN) {
  console.error('Error: Please set TEST_PATIENT_ID and TEST_AUTH_TOKEN in .env');
  process.exit(1);
}

// Test the history endpoint
async function testHistoryEndpoint() {
  try {
    console.log('Testing history endpoint...');
    
    // Make request to history endpoint
    const response = await axios.get(
      `${BASE_URL}/patients/${PATIENT_ID}/history?page=1&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ History endpoint test passed!');
    console.log('Response status:', response.status);
    console.log('Total items:', response.data.pagination.totalItems);
    console.log('First item:', JSON.stringify(response.data.data[0], null, 2));
    
  } catch (error) {
    console.error('❌ History endpoint test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Run the test
testHistoryEndpoint();
