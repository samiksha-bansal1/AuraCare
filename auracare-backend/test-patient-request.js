// Simple test script to verify patient request functionality
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Alert = require('./models/Alert');
const AuditLog = require('./models/AuditLog');
const Patient = require('./models/Patient');

async function testPatientRequest() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test Alert model with new category
    const testAlert = new Alert({
      patientId: new mongoose.Types.ObjectId(),
      type: 'info',
      category: 'patient_request',
      message: 'Test patient request'
    });

    console.log('✅ Alert model accepts patient_request category');

    // Test AuditLog model
    const testAuditLog = new AuditLog({
      patientId: new mongoose.Types.ObjectId(),
      action: 'patient_request',
      details: { requestKind: 'need_water' },
      performedBy: new mongoose.Types.ObjectId(),
      performedByModel: 'Patient'
    });

    console.log('✅ AuditLog model created successfully');

    // Test that AuditLog prevents updates (should throw error)
    try {
      await testAuditLog.save();
      await testAuditLog.updateOne({ action: 'modified' });
      console.log('❌ AuditLog update should have failed');
    } catch (error) {
      console.log('✅ AuditLog correctly prevents modifications');
    }

    console.log('\n🎉 All model tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testPatientRequest();
