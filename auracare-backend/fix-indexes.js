// Script to drop duplicate indexes and fix the warnings
require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Drop duplicate indexes on Staff collection
    try {
      const staffCollection = db.collection('staffs');
      await staffCollection.dropIndex('staffId_1');
      console.log('✅ Dropped staffId_1 index');
    } catch (err) {
      console.log('staffId_1 index not found or already dropped');
    }

    try {
      const staffCollection = db.collection('staffs');
      await staffCollection.dropIndex('email_1');
      console.log('✅ Dropped email_1 index');
    } catch (err) {
      console.log('email_1 index not found or already dropped');
    }

    // Drop duplicate indexes on other collections
    const collections = [
      { name: 'progressnotes', field: 'patientId_1' },
      { name: 'reports', field: 'patientId_1' },
      { name: 'mediacontents', field: 'patientId_1' },
      { name: 'mediacontents', field: 'isApproved_1' },
      { name: 'roomsettings', field: 'patientId_1' }
    ];

    for (const { name, field } of collections) {
      try {
        const collection = db.collection(name);
        await collection.dropIndex(field);
        console.log(`✅ Dropped ${field} index from ${name}`);
      } catch (err) {
        console.log(`${field} index not found in ${name} or already dropped`);
      }
    }

    console.log('✅ Index cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  }
}

fixIndexes();
