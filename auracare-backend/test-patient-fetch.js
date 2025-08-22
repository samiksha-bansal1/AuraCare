// Test script to verify patient fetching and create test data if needed
const axios = require('axios');
const mongoose = require('mongoose');
const Patient = require('./models/Patient');
const Staff = require('./models/Staff');
const connectDB = require('./config/db');

const BASE_URL = 'http://localhost:5000/api';

// Test credentials - you should have a nurse/staff account
const TEST_NURSE_CREDENTIALS = {
  email: 'nurse@auracare.com',
  password: 'password123'
};

async function testPatientFetch() {
  try {
    console.log('🔍 Testing patient fetch functionality...\n');

    // 1. Login as nurse
    console.log('1. Logging in as nurse...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      type: 'nurse',
      email: TEST_NURSE_CREDENTIALS.email,
      password: TEST_NURSE_CREDENTIALS.password
    });

    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log(`✅ Logged in as: ${user.name} (${user.role})`);

    // 2. Try to fetch patients
    console.log('\n2. Fetching patients...');
    try {
      const patientsResponse = await axios.get(`${BASE_URL}/patients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`✅ Successfully fetched ${patientsResponse.data.length} patients`);
      
      if (patientsResponse.data.length > 0) {
        console.log('\nPatients found:');
        patientsResponse.data.forEach((patient, index) => {
          console.log(`  ${index + 1}. ${patient.name} - Room ${patient.roomNumber} (${patient.patientId})`);
        });
      } else {
        console.log('⚠️  No patients found in database');
      }

    } catch (fetchError) {
      console.error('❌ Failed to fetch patients:', fetchError.response?.data || fetchError.message);
      
      // If fetch failed, let's check what's in the database directly
      console.log('\n3. Checking database directly...');
      await connectDB();
      
      const dbPatients = await Patient.find({ isActive: true });
      console.log(`📊 Database contains ${dbPatients.length} active patients`);
      
      if (dbPatients.length === 0) {
        console.log('\n4. Creating test patients...');
        await createTestPatients();
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    // If login failed, let's check if we need to create a test nurse
    if (error.response?.status === 401) {
      console.log('\n🔧 Login failed, checking if test nurse exists...');
      await connectDB();
      
      const testNurse = await Staff.findOne({ email: TEST_NURSE_CREDENTIALS.email });
      if (!testNurse) {
        console.log('Creating test nurse account...');
        await createTestNurse();
      } else {
        console.log('Test nurse exists, but login failed. Check credentials.');
      }
    }
  }
}

async function createTestPatients() {
  const testPatients = [
    {
      patientId: 'PAT001',
      name: 'John Smith',
      email: 'john.smith@email.com',
      age: 45,
      condition: 'Post-surgery recovery',
      roomNumber: '101'
    },
    {
      patientId: 'PAT002',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      age: 32,
      condition: 'Cardiac monitoring',
      roomNumber: '102'
    },
    {
      patientId: 'PAT003',
      name: 'Michael Brown',
      email: 'michael.brown@email.com',
      age: 67,
      condition: 'Diabetes management',
      roomNumber: '103'
    }
  ];

  for (const patientData of testPatients) {
    try {
      const patient = new Patient({
        ...patientData,
        admissionDate: new Date(),
        isActive: true
      });
      await patient.save();
      console.log(`✅ Created patient: ${patient.name} (${patient.patientId})`);
    } catch (error) {
      if (error.code === 11000) {
        console.log(`⚠️  Patient ${patientData.patientId} already exists`);
      } else {
        console.error(`❌ Failed to create patient ${patientData.patientId}:`, error.message);
      }
    }
  }
}

async function createTestNurse() {
  try {
    const testNurse = new Staff({
      staffId: 'NUR001',
      name: 'Test Nurse',
      email: TEST_NURSE_CREDENTIALS.email,
      password: TEST_NURSE_CREDENTIALS.password,
      role: 'nurse',
      department: 'General Care',
      isActive: true
    });
    
    await testNurse.save();
    console.log('✅ Created test nurse account');
  } catch (error) {
    console.error('❌ Failed to create test nurse:', error.message);
  }
}

// Run the test
testPatientFetch()
  .then(() => {
    console.log('\n🎉 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
