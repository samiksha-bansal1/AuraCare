// Test script for media upload and streaming
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const PATIENT_ID = process.env.TEST_PATIENT_ID;
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;
const TEST_FILE = path.join(__dirname, 'test-assets', 'test-audio.mp3');

if (!PATIENT_ID || !AUTH_TOKEN) {
  console.error('Error: Please set TEST_PATIENT_ID and TEST_AUTH_TOKEN in .env');
  process.exit(1);
}

// Create test assets directory if it doesn't exist
const testAssetsDir = path.join(__dirname, 'test-assets');
if (!fs.existsSync(testAssetsDir)) {
  fs.mkdirSync(testAssetsDir);
  console.log(`Created test assets directory at ${testAssetsDir}`);
  console.log('Please add a test audio file named test-audio.mp3 to this directory');
  process.exit(0);
}

// Check if test file exists
if (!fs.existsSync(TEST_FILE)) {
  console.error(`Error: Test file not found at ${TEST_FILE}`);
  console.log('Please add a test audio file named test-audio.mp3 to the test-assets directory');
  process.exit(1);
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testMediaUpload() {
  try {
    console.log('Testing media upload...');
    
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(TEST_FILE));
    form.append('title', 'Test Audio File');
    form.append('description', 'This is a test audio file upload');
    
    // Upload file
    const uploadResponse = await axios.post(
      `${BASE_URL}/patients/${PATIENT_ID}/media`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Length': form.getLengthSync()
        }
      }
    );
    
    console.log('✅ Media uploaded successfully');
    const mediaId = uploadResponse.data.data._id;
    
    // Test listing media
    console.log('\nTesting media listing...');
    const listResponse = await api.get(`/patients/${PATIENT_ID}/media`);
    console.log(`✅ Found ${listResponse.data.data.length} media items`);
    
    // Test streaming
    console.log('\nTesting media streaming...');
    const streamResponse = await axios.get(
      `${BASE_URL}/media/${mediaId}/stream`,
      {
        responseType: 'stream',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      }
    );
    
    console.log(`✅ Media streaming successful (${streamResponse.headers['content-type']})`);
    
    // Test approval (if staff)
    if (process.env.TEST_USER_ROLE === 'staff') {
      console.log('\nTesting media approval...');
      await api.put(`/media/${mediaId}/approve`);
      console.log('✅ Media approved successfully');
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
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
testMediaUpload();
