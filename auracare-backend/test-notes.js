const axios = require('axios');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const PATIENT_ID = process.env.TEST_PATIENT_ID;
const STAFF_TOKEN = process.env.TEST_STAFF_TOKEN;
const FAMILY_TOKEN = process.env.TEST_FAMILY_TOKEN;

if (!PATIENT_ID || !STAFF_TOKEN || !FAMILY_TOKEN) {
  console.error('Error: Please set TEST_PATIENT_ID, TEST_STAFF_TOKEN, and TEST_FAMILY_TOKEN in .env');
  process.exit(1);
}

const staffApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Authorization': `Bearer ${STAFF_TOKEN}` }
});

const familyApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Authorization': `Bearer ${FAMILY_TOKEN}` }
});

async function testProgressNotes() {
  try {
    console.log('=== Testing Progress Notes API ===\n');
    
    // 1. Staff creates a staff-only note
    console.log('1. Staff creates a staff-only note...');
    const staffNote = await staffApi.post(`/patients/${PATIENT_ID}/notes`, {
      text: 'This is a staff-only note',
      visibility: 'staff',
      tags: ['vitals', 'medication']
    });
    console.log('✅ Staff note created:', staffNote.data._id);
    
    // 2. Staff creates a family-visible note
    console.log('\n2. Staff creates a family-visible note...');
    const familyNote = await staffApi.post(`/patients/${PATIENT_ID}/notes`, {
      text: 'This note is visible to family',
      visibility: 'family',
      tags: ['update', 'family']
    });
    console.log('✅ Family note created:', familyNote.data._id);
    
    // 3. Staff views all notes (should see both)
    console.log('\n3. Staff views all notes...');
    const staffNotes = await staffApi.get(`/patients/${PATIENT_ID}/notes`);
    console.log(`✅ Staff sees ${staffNotes.data.length} notes`);
    
    // 4. Family views notes (should see only family-visible)
    console.log('\n4. Family views notes...');
    const familyNotes = await familyApi.get(`/patients/${PATIENT_ID}/notes`);
    console.log(`✅ Family sees ${familyNotes.data.length} notes`);
    
    // 5. Staff updates a note
    console.log('\n5. Staff updates a note...');
    const updatedNote = await staffApi.put(`/notes/${familyNote.data._id}`, {
      text: 'Updated note text',
      tags: ['update', 'family', 'important']
    });
    console.log('✅ Note updated:', updatedNote.data._id);
    
    // 6. Verify family can see the updated note
    console.log('\n6. Verify family can see updated note...');
    const updatedFamilyView = await familyApi.get(`/patients/${PATIENT_ID}/notes`);
    const foundUpdatedNote = updatedFamilyView.data.find(n => n._id === familyNote.data._id);
    console.log(`✅ Family sees updated note: ${foundUpdatedNote.text}`);
    
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
  }
}

// Run the tests
testProgressNotes();
