const axios = require('axios');
const { io } = require('socket.io-client');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const SOCKET_URL = process.env.API_URL || 'http://localhost:3000';
const PATIENT_ID = process.env.TEST_PATIENT_ID;
const PATIENT_TOKEN = process.env.TEST_PATIENT_TOKEN;
const STAFF_TOKEN = process.env.TEST_STAFF_TOKEN;

if (!PATIENT_ID || !PATIENT_TOKEN || !STAFF_TOKEN) {
  console.error('Error: Please set TEST_PATIENT_ID, TEST_PATIENT_TOKEN, and TEST_STAFF_TOKEN in .env');
  process.exit(1);
}

// API clients
const patientApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Authorization': `Bearer ${PATIENT_TOKEN}` }
});

const staffApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Authorization': `Bearer ${STAFF_TOKEN}` }
});

// Mock FastAPI server for testing
const express = require('express');
const mockApi = express();
const mockPort = 8000;

let mockVitals = {
  spo2: 98,
  heartRate: 75,
  systolicBp: 120,
  diastolicBp: 80,
  temperature: 36.8
};

// Mock FastAPI endpoint
mockApi.get('/vitals/:roomNumber', (req, res) => {
  // Simulate small variations in vitals
  mockVitals = {
    spo2: Math.max(85, Math.min(100, mockVitals.spo2 + (Math.random() * 4 - 2))),
    heartRate: Math.max(60, Math.min(120, mockVitals.heartRate + (Math.random() * 10 - 5))),
    systolicBp: Math.max(90, Math.min(160, mockVitals.systolicBp + (Math.random() * 10 - 5))),
    diastolicBp: Math.max(60, Math.min(100, mockVitals.diastolicBp + (Math.random() * 5 - 2.5))),
    temperature: Math.max(36, Math.min(38, mockVitals.temperature + (Math.random() * 0.4 - 0.2)))
  };
  
  // Occasionally simulate a critical condition (1 in 10 chance)
  if (Math.random() < 0.1) {
    const criticalVital = ['spo2', 'heartRate', 'systolicBp'][Math.floor(Math.random() * 3)];
    switch (criticalVital) {
      case 'spo2':
        mockVitals.spo2 = 85 + Math.random() * 3; // 85-88% (mild desaturation)
        break;
      case 'heartRate':
        mockVitals.heartRate = 110 + Math.random() * 20; // 110-130 bpm (tachycardia)
        break;
      case 'systolicBp':
        mockVitals.systolicBp = 150 + Math.random() * 20; // 150-170 mmHg (hypertension)
        break;
    }
  }
  
  res.json(mockVitals);
});

// Start mock server
const mockServer = mockApi.listen(mockPort, () => {
  console.log(`Mock FastAPI server running on port ${mockPort}`);
});

// Socket.IO client for testing
const socket = io(SOCKET_URL, {
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
  
  // Listen for vitals updates
  socket.on('vitals_update', (data) => {
    console.log('\n🔔 Received vitals_update:', {
      spo2: data.spo2,
      heartRate: data.heartRate,
      systolicBp: data.systolicBp,
      temperature: data.temperature,
      timestamp: new Date(data.timestamp).toLocaleTimeString()
    });
    receivedEvents.push(data);
  });
  
  // Listen for alerts
  socket.on('alert_created', (alert) => {
    console.log('\n🚨 Received alert_created:', {
      type: alert.type,
      message: alert.message,
      priority: alert.priority,
      timestamp: new Date(alert.createdAt).toLocaleTimeString()
    });
  });
  
  // Listen for history updates
  socket.on('history_update', (update) => {
    console.log('\n📝 Received history_update:', {
      type: update.type,
      details: update.details,
      timestamp: new Date(update.timestamp).toLocaleTimeString()
    });
  });
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error.message);
});

// Helper function to wait for an event
const waitForEvent = (eventType, timeout = 5000) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkEvent = () => {
      const event = receivedEvents.find(e => e.type === eventType);
      if (event) {
        receivedEvents = receivedEvents.filter(e => e !== event);
        resolve(event);
      } else if (Date.now() - startTime < timeout) {
        setTimeout(checkEvent, 100);
      } else {
        resolve(null);
      }
    };
    checkEvent();
  });
};

// Main test function
async function testVitalsPoller() {
  try {
    console.log('=== Testing Vitals Poller ===\n');
    
    // 1. Wait for WebSocket connection
    console.log('1. Waiting for WebSocket connection...');
    await new Promise(resolve => {
      if (socket.connected) resolve();
      else socket.once('connect', resolve);
    });
    
    console.log('✅ Connected to WebSocket server');
    
    // 2. Wait for vitals updates (polling happens every 3 seconds)
    console.log('\n2. Waiting for vitals updates (polling every 3s)...');
    console.log('   - Watching for abnormal vitals...');
    console.log('   - Press Ctrl+C to stop the test');
    
    // Keep the test running to observe updates
    await new Promise(resolve => {
      // Run for 30 seconds or until interrupted
      const timeout = setTimeout(() => {
        console.log('\n✅ Test completed successfully');
        process.exit(0);
      }, 30000);
      
      process.on('SIGINT', () => {
        clearTimeout(timeout);
        console.log('\nTest stopped by user');
        process.exit(0);
      });
    });
    
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
    mockServer.close();
    socket.close();
  }
}

// Install required packages if needed
const fs = require('fs');
const path = require('path');

if (!fs.existsSync(path.join(__dirname, 'node_modules', 'socket.io-client'))) {
  console.log('Installing socket.io-client...');
  require('child_process').execSync('npm install socket.io-client', { stdio: 'inherit' });
}

if (!fs.existsSync(path.join(__dirname, 'node_modules', 'express'))) {
  console.log('Installing express (for mock server)...');
  require('child_process').execSync('npm install express', { stdio: 'inherit' });
}

// Run the test
testVitalsPoller();
