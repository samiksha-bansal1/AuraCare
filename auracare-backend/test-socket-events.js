const { io } = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Configuration
const SOCKET_URL = process.env.API_URL || 'http://localhost:3000';
const PATIENT_TOKEN = process.env.TEST_PATIENT_TOKEN;
const STAFF_TOKEN = process.env.TEST_STAFF_TOKEN;
const PATIENT_ID = process.env.TEST_PATIENT_ID;

if (!PATIENT_TOKEN || !STAFF_TOKEN || !PATIENT_ID) {
  console.error('Error: Missing required environment variables');
  process.exit(1);
}

// Test data
const TEST_EVENTS = [
  {
    name: 'vitals_update',
    data: {
      patientId: PATIENT_ID,
      heartRate: 75,
      spo2: 98,
      temperature: 36.8,
      timestamp: new Date().toISOString()
    }
  },
  {
    name: 'alert_created',
    data: {
      id: uuidv4(),
      patientId: PATIENT_ID,
      type: 'vital_signs',
      severity: 'warning',
      message: 'Heart rate elevated',
      timestamp: new Date().toISOString()
    }
  },
  {
    name: 'lighting_update',
    data: {
      patientId: PATIENT_ID,
      mode: 'reading',
      brightness: 75,
      updatedBy: 'system',
      timestamp: new Date().toISOString()
    }
  },
  {
    name: 'emotion_detected',
    data: {
      patientId: PATIENT_ID,
      emotion: 'anxious',
      confidence: 0.85,
      timestamp: new Date().toISOString()
    }
  },
  {
    name: 'autoplay_media',
    data: {
      patientId: PATIENT_ID,
      mediaId: uuidv4(),
      type: 'voice',
      title: 'Calming Voice Message',
      url: 'https://example.com/media/calm.mp3',
      triggeredBy: 'emotion_detection',
      timestamp: new Date().toISOString()
    }
  },
  {
    name: 'history_update',
    data: {
      patientId: PATIENT_ID,
      type: 'vital_anomaly',
      data: {
        type: 'heartRate',
        value: 110,
        severity: 'warning',
        message: 'Elevated heart rate detected'
      },
      timestamp: new Date().toISOString()
    }
  }
];

// Create test clients
const createTestClient = (token, role) => {
  const client = io(SOCKET_URL, {
    auth: { token },
    reconnection: false,
    autoConnect: false
  });

  // Event handlers
  client.on('connect', () => {
    console.log(`[${role}] Connected to server`);
    
    // Join appropriate rooms
    if (role === 'patient') {
      client.emit('join', { room: `patient:${PATIENT_ID}` });
    } else if (role === 'staff') {
      client.emit('join', { room: 'staff' });
    }
  });

  client.on('disconnect', () => {
    console.log(`[${role}] Disconnected from server`);
  });

  client.on('connect_error', (error) => {
    console.error(`[${role}] Connection error:`, error.message);
  });

  // Log all received events
  client.onAny((event, data) => {
    console.log(`\n[${role}] Received event: ${event}`);
    console.log(JSON.stringify(data, null, 2));
  });

  return client;
};

// Main test function
async function runTests() {
  console.log('=== Starting Socket Event Standardization Tests ===\n');

  // Create test clients
  const patientClient = createTestClient(PATIENT_TOKEN, 'patient');
  const staffClient = createTestClient(STAFF_TOKEN, 'staff');

  // Connect clients
  patientClient.connect();
  staffClient.connect();

  // Wait for connections to establish
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test event emission
  console.log('\n=== Testing Event Emission ===');
  
  for (const testEvent of TEST_EVENTS) {
    console.log(`\nEmitting event: ${testEvent.name}`);
    patientClient.emit(testEvent.name, testEvent.data);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for events to propagate
  }

  // Test room isolation
  console.log('\n=== Testing Room Isolation ===');
  console.log('Emitting room-specific event to patient room only');
  patientClient.emit('room_test', { message: 'This should only be received by patient client' });
  
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test disconnection
  console.log('\n=== Testing Disconnection ===');
  patientClient.disconnect();
  staffClient.disconnect();

  console.log('\n=== Tests Complete ===');
  process.exit(0);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nTest stopped by user');
  process.exit(0);
});

// Run tests
runTests().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
