// Simple script to seed database and test the Medical Records functionality
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Patient = require('./models/Patient');
const Staff = require('./models/Staff');

async function seedAndTest() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    
    // Check if we have patients
    const patientCount = await Patient.countDocuments({ isActive: true });
    console.log(`📊 Found ${patientCount} active patients in database`);
    
    if (patientCount === 0) {
      console.log('🌱 Creating test patients...');
      
      const testPatients = [
        {
          patientId: 'PAT001',
          name: 'John Smith',
          email: 'john.smith@test.com',
          age: 45,
          condition: 'Post-surgery recovery',
          roomNumber: '101',
          admissionDate: new Date(),
          isActive: true
        },
        {
          patientId: 'PAT002', 
          name: 'Sarah Johnson',
          email: 'sarah.johnson@test.com',
          age: 32,
          condition: 'Cardiac monitoring',
          roomNumber: '102',
          admissionDate: new Date(),
          isActive: true
        },
        {
          patientId: 'PAT003',
          name: 'Michael Brown', 
          email: 'michael.brown@test.com',
          age: 67,
          condition: 'Diabetes management',
          roomNumber: '103',
          admissionDate: new Date(),
          isActive: true
        }
      ];
      
      for (const patientData of testPatients) {
        try {
          await Patient.create(patientData);
          console.log(`✅ Created patient: ${patientData.name} (${patientData.patientId})`);
        } catch (error) {
          if (error.code === 11000) {
            console.log(`⚠️  Patient ${patientData.patientId} already exists`);
          } else {
            console.error(`❌ Error creating ${patientData.patientId}:`, error.message);
          }
        }
      }
    }
    
    // Check if we have a test nurse
    const nurseCount = await Staff.countDocuments({ role: 'nurse', isActive: true });
    console.log(`👩‍⚕️ Found ${nurseCount} active nurses in database`);
    
    if (nurseCount === 0) {
      console.log('🌱 Creating test nurse...');
      try {
        await Staff.create({
          staffId: 'NUR001',
          name: 'Test Nurse',
          email: 'nurse@auracare.com',
          password: 'password123',
          role: 'nurse',
          department: 'General Care',
          isActive: true
        });
        console.log('✅ Created test nurse account');
      } catch (error) {
        if (error.code === 11000) {
          console.log('⚠️  Test nurse already exists');
        } else {
          console.error('❌ Error creating test nurse:', error.message);
        }
      }
    }
    
    // Final summary
    const finalPatientCount = await Patient.countDocuments({ isActive: true });
    const finalNurseCount = await Staff.countDocuments({ role: 'nurse', isActive: true });
    
    console.log('\n🎉 Database setup complete!');
    console.log(`📊 Total active patients: ${finalPatientCount}`);
    console.log(`👩‍⚕️ Total active nurses: ${finalNurseCount}`);
    console.log('\n🔑 Test Credentials:');
    console.log('Nurse Login:');
    console.log('  Email: nurse@auracare.com');
    console.log('  Password: password123');
    console.log('  Type: nurse');
    
    console.log('\n✨ You can now test the Medical Records functionality in the Nurse Dashboard!');
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    process.exit(0);
  }
}

seedAndTest();
