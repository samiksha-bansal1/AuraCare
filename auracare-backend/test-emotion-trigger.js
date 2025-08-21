const axios = require('axios');
const { io } = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');
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
const staffApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Authorization': `Bearer ${STAFF_TOKEN}` }
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
socket.on('connect', async () => {
  console.log('Connected to WebSocket server');
  
  // Join the patient's room
  socket.emit('join', { room: `patient:${PATIENT_ID}` });
  
  console.log('\n=== Starting Emotion Trigger Test ===\n');
  
  // Test 1: Submit calm emotion (should not trigger auto-play)
  console.log('1. Testing with calm emotion (should not trigger auto-play)...');
  await testEmotionTrigger('calm', false);
  
  // Test 2: Submit anxious emotion (should trigger auto-play)
  console.log('\n2. Testing with anxious emotion (should trigger auto-play)...');
  await testEmotionTrigger('anxious', true);
  
  // Test 3: Submit distressed emotion (should trigger auto-play)
  console.log('\n3. Testing with distressed emotion (should trigger auto-play)...');
  await testEmotionTrigger('distressed', true);
  
  console.log('\n=== Test completed successfully ===\n');
  process.exit(0);
});

// Listen for auto-play events
socket.on('autoplay_media', (data) => {
  console.log('\n🎵 Received autoplay_media event:', {
    mediaId: data.mediaId,
    title: data.title,
    triggeredByEmotion: data.triggeredByEmotion
  });
  receivedEvents.push({
    type: 'autoplay_media',
    ...data
  });
});

// Listen for emotion detected events
socket.on('emotion_detected', (data) => {
  console.log('😊 Emotion detected:', data.emotionalState);
  receivedEvents.push({
    type: 'emotion_detected',
    ...data
  });
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error.message);
  process.exit(1);
});

/**
 * Test submitting an emotion and check if it triggers auto-play
 */
async function testEmotionTrigger(emotion, shouldTrigger) {
  try {
    // Clear previous events
    receivedEvents = [];
    
    // Submit emotion data
    console.log(`   - Submitting ${emotion} emotion...`);
    await staffApi.post(`/patients/${PATIENT_ID}/emotions`, {
      emotionalState: emotion,
      confidence: 0.95,
      vitalSignsContext: {
        heartRate: emotion === 'anxious' ? 110 : 75,
        bloodPressure: { systolic: 120, diastolic: 80 },
        oxygenSaturation: 98
      }
    });
    
    // Wait for events (with timeout)
    console.log('   - Waiting for events...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we got the expected events
    const emotionDetected = receivedEvents.some(e => e.type === 'emotion_detected' && e.emotionalState === emotion);
    const autoPlayTriggered = receivedEvents.some(e => e.type === 'autoplay_media');
    
    // Verify results
    if (!emotionDetected) {
      console.error('   ❌ emotion_detected event not received');
    } else if (shouldTrigger && !autoPlayTriggered) {
      console.error('   ❌ autoplay_media event not received (expected)');
    } else if (!shouldTrigger && autoPlayTriggered) {
      console.error('   ❌ autoplay_media event received (not expected)');
    } else {
      console.log(`   ✅ ${shouldTrigger ? 'Auto-play triggered as expected' : 'No auto-play triggered (as expected)'}`);
    }
    
  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
  }
}

// Install required packages if needed
const fs = require('fs');
const path = require('path');

if (!fs.existsSync(path.join(__dirname, 'node_modules', 'socket.io-client'))) {
  console.log('Installing socket.io-client...');
  require('child_process').execSync('npm install socket.io-client', { stdio: 'inherit' });
}

if (!fs.existsSync(path.join(__dirname, 'node_modules', 'uuid'))) {
  console.log('Installing uuid...');
  require('child_process').execSync('npm install uuid', { stdio: 'inherit' });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nTest stopped by user');
  process.exit(0);
});
