const mongoose = require('mongoose');
const config = require('@/config/config');
const logger = require('@/utils/logger');

// Import models to ensure they're registered with Mongoose
require('@/models/User');
require('@/models/Patient');
require('@/models/Staff');
require('@/models/FamilyMember');
require('@/models/Alert');
require('@/models/Vitals');
require('@/models/Media');
require('@/models/Note');
require('@/models/Report');
require('@/models/RoomSetting');
require('@/models/AuditLog');

// Index definitions for each model
const indexes = {
  User: [
    { email: 1 }, // For login lookups
    { role: 1 }, // For role-based queries
    { status: 1 } // For filtering active/inactive users
  ],
  Patient: [
    { patientId: 1 }, // Primary patient identifier
    { roomNumber: 1 }, // For room-based lookups
    { status: 1 }, // For filtering active/inactive patients
    { 'contactInfo.phone': 1 }, // For contact lookups
    { 'contactInfo.email': 1 } // For contact lookups
  ],
  Staff: [
    { userId: 1 }, // Reference to User
    { department: 1 }, // For department-based queries
    { position: 1 }, // For position-based queries
    { 'contactInfo.phone': 1 }, // For contact lookups
    { 'contactInfo.email': 1 } // For contact lookups
  ],
  FamilyMember: [
    { userId: 1 }, // Reference to User
    { patientId: 1 }, // Reference to Patient
    { relationship: 1 } // For relationship-based queries
  ],
  Alert: [
    { patientId: 1 }, // For patient-specific alerts
    { type: 1 }, // For filtering by alert type
    { status: 1 }, // For filtering by status
    { severity: 1 }, // For filtering by severity
    { createdAt: -1 }, // For getting most recent alerts first
    { 'metadata.source': 1 } // For filtering by alert source
  ],
  Vitals: [
    { patientId: 1 }, // For patient-specific vitals
    { timestamp: -1 }, // For time-series queries
    { 'data.type': 1 }, // For filtering by vital type
    { 'data.value': 1 }, // For range queries on values
    { 'metadata.source': 1 } // For filtering by data source
  ],
  Media: [
    { patientId: 1 }, // For patient-specific media
    { type: 1 }, // For filtering by media type
    { category: 1 }, // For category-based queries
    { isApproved: 1 }, // For filtering approved media
    { uploadedBy: 1 }, // For user-specific uploads
    { createdAt: -1 } // For getting most recent uploads first
  ],
  Note: [
    { patientId: 1 }, // For patient-specific notes
    { author: 1 }, // For author-specific notes
    { category: 1 }, // For category-based queries
    { isPinned: 1 }, // For pinned notes
    { createdAt: -1 }, // For getting most recent notes first
    { updatedAt: -1 } // For recently updated notes
  ],
  Report: [
    { patientId: 1 }, // For patient-specific reports
    { type: 1 }, // For filtering by report type
    { status: 1 }, // For filtering by status
    { generatedBy: 1 }, // For user-specific reports
    { generatedAt: -1 }, // For getting most recent reports first
    { 'metadata.tags': 1 } // For tag-based filtering
  ],
  RoomSetting: [
    { patientId: 1 }, // For patient-specific settings
    { settingType: 1 }, // For filtering by setting type
    { isActive: 1 }, // For active/inactive settings
    { updatedAt: -1 } // For recently updated settings
  ],
  AuditLog: [
    { entity: 1, entityId: 1 }, // For entity-specific logs
    { userId: 1 }, // For user-specific logs
    { action: 1 }, // For filtering by action type
    { timestamp: -1 }, // For time-based queries
    { 'metadata.ip': 1 }, // For IP-based lookups
    { 'metadata.method': 1, 'metadata.url': 1 } // For request-based lookups
  ]
};

async function createIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.db.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info('Connected to MongoDB');

    // Get all model names
    const modelNames = Object.keys(mongoose.connection.models);
    
    // Create indexes for each model
    for (const modelName of modelNames) {
      const model = mongoose.model(modelName);
      const modelIndexes = indexes[modelName] || [];
      
      if (modelIndexes.length > 0) {
        logger.info(`Creating indexes for ${modelName}...`);
        
        for (const index of modelIndexes) {
          try {
            await model.collection.createIndex(index);
            logger.debug(`  - Created index: ${JSON.stringify(index)}`);
          } catch (error) {
            logger.error(`  - Error creating index ${JSON.stringify(index)}:`, error.message);
          }
        }
      }
    }

    logger.info('Index creation completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error creating indexes:', error);
    process.exit(1);
  }
}

// Run the index creation
createIndexes();
