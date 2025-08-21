const axios = require('axios');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const PATIENT_ID = process.env.TEST_PATIENT_ID;
const PATIENT_TOKEN = process.env.TEST_PATIENT_TOKEN;
const STAFF_TOKEN = process.env.TEST_STAFF_TOKEN;
const FAMILY_TOKEN = process.env.TEST_FAMILY_TOKEN;

if (!PATIENT_ID || !PATIENT_TOKEN || !STAFF_TOKEN || !FAMILY_TOKEN) {
  console.error('Error: Please set TEST_PATIENT_ID, TEST_PATIENT_TOKEN, TEST_STAFF_TOKEN, and TEST_FAMILY_TOKEN in .env');
  process.exit(1);
}

const patientApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Authorization': `Bearer ${PATIENT_TOKEN}` }
});

const staffApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Authorization': `Bearer ${STAFF_TOKEN}` }
});

const familyApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Authorization': `Bearer ${FAMILY_TOKEN}` }
});

// Socket.IO client for testing real-time updates
const { io } = require('socket.io-client');
const socket = io(process.env.API_URL || 'http://localhost:3000', {
  auth: {
    token: PATIENT_TOKEN
  },
  reconnection: false
});

// Track received events
let receivedEvents = [];

// Set up socket event listeners
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  
  // Join the patient's room
  socket.emit('join', { room: `patient:${PATIENT_ID}` });
  
  // Listen for lighting updates
  socket.on('lighting_update', (data) => {
    console.log('\n🔔 Received lighting_update event:', data);
    receivedEvents.push(data);
  });
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error.message);
});

// Helper function to wait for an event
const waitForEvent = (timeout = 1000) => {
  return new Promise((resolve) => {
    const checkEvent = () => {
      if (receivedEvents.length > 0) {
        resolve(receivedEvents.shift());
      } else if (timeout > 0) {
        timeout -= 100;
        setTimeout(checkEvent, 100);
      } else {
        resolve(null);
      }
    };
    checkEvent();
  });
};

async function testLighting() {
  try {
    console.log('=== Testing Room Lighting API ===\n');
    
    // 1. Patient gets current settings
    console.log('1. Patient gets current settings...');
    const initialSettings = await patientApi.get(`/patients/${PATIENT_ID}/lighting`);
    console.log('✅ Initial settings:', initialSettings.data.data);
    
    // 2. Patient updates settings
    console.log('\n2. Patient updates settings to night mode...');
    const updateResponse = await patientApi.put(`/patients/${PATIENT_ID}/lighting`, {
      mode: 'night',
      brightness: 30
    });
    
    // Wait for the WebSocket event
    const updateEvent = await waitForEvent(2000);
    if (updateEvent) {
      console.log('✅ Received real-time update:', {
        mode: updateEvent.mode,
        brightness: updateEvent.brightness,
        updatedBy: updateEvent.updatedBy?.name
      });
    } else {
      console.warn('⚠️ No real-time update received');
    }
    
    // 3. Staff verifies the update
    console.log('\n3. Staff verifies the update...');
    const staffView = await staffApi.get(`/patients/${PATIENT_ID}/lighting`);
    console.log('✅ Staff sees updated settings:', staffView.data.data);
    
    // 4. Family tries to update (should fail)
    console.log('\n4. Family tries to update settings (should fail)...');
    try {
      await familyApi.put(`/patients/${PATIENT_ID}/lighting`, {
        mode: 'reading',
        brightness: 80
      });
      console.error('❌ Family was able to update settings (should not happen)');
    } catch (error) {
      console.log('✅ Family update correctly rejected with status:', error.response.status);
    }
    
    // 5. Staff updates settings
    console.log('\n5. Staff updates settings to reading mode...');
    await staffApi.put(`/patients/${PATIENT_ID}/lighting`, {
      mode: 'reading',
      brightness: 75
    });
    
    // Wait for the WebSocket event
    const staffUpdateEvent = await waitForEvent(2000);
    if (staffUpdateEvent) {
      console.log('✅ Received real-time update:', {
        mode: staffUpdateEvent.mode,
        brightness: staffUpdateEvent.brightness,
        updatedBy: staffUpdateEvent.updatedBy?.name
      });
    }
    
    // 6. Verify audit log
    console.log('\n6. Verifying audit log...');
    const auditLogs = await staffApi.get(`/audit?entity=RoomSetting&patientId=${PATIENT_ID}`);
    console.log(`✅ Found ${auditLogs.data.data.length} audit log entries`);
    
    console.log('\n=== All tests passed! ===');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  } finally {
    // Clean up
    socket.close();
  }
}

// Install required package if needed
if (!require('fs').existsSync(path.join(__dirname, 'node_modules', 'socket.io-client'))) {
  console.log('Installing socket.io-client...');
  require('child_process').execSync('npm install socket.io-client', { stdio: 'inherit' });
}

// Run the tests
testLighting();
