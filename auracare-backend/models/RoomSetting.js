const mongoose = require('mongoose');

const roomSettingSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    unique: true,
    index: true
  },
  mode: {
    type: String,
    required: true,
    enum: ['day', 'night', 'reading', 'calm'],
    default: 'day'
  },
  brightness: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 70
  },
  updatedBy: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'updatedBy.model'
    },
    model: {
      type: String,
      required: true,
      enum: ['Patient', 'Staff', 'Doctor']
    },
    name: {
      type: String,
      required: true
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for faster lookups
roomSettingSchema.index({ patientId: 1 });

// Pre-save hook to update timestamps
roomSettingSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

// Static method to get or create settings for a patient
roomSettingSchema.statics.getOrCreate = async function(patientId) {
  let settings = await this.findOne({ patientId });
  
  if (!settings) {
    settings = await this.create({ 
      patientId,
      updatedBy: {
        id: patientId,
        model: 'Patient',
        name: 'System'
      }
    });
  }
  
  return settings;
};

const RoomSetting = mongoose.model('RoomSetting', roomSettingSchema);

module.exports = RoomSetting;
