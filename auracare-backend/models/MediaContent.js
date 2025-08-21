const mongoose = require('mongoose');

const mediaContentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'uploadedByModel',
    required: true
  },
  uploadedByModel: {
    type: String,
    required: true,
    enum: ['Staff', 'FamilyMember']
  },
  type: {
    type: String,
    required: true,
    enum: ['image', 'audio', 'video']
  },
  title: {
    type: String,
    maxlength: 200,
    trim: true
  },
  description: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  storage: {
    kind: {
      type: String,
      required: true,
      default: 'gridfs',
      enum: ['gridfs']
    },
    key: {
      type: String,
      required: true
    },
    mime: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    dimensions: {
      width: Number,
      height: Number
    },
    duration: Number // in seconds, for audio/video
  },
  isApproved: {
    type: Boolean,
    default: false,
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  approvedAt: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.storage.key; // Don't expose internal storage key
      return ret;
    }
  }
});

// Indexes for common queries
mediaContentSchema.index({ patientId: 1, isApproved: 1, type: 1 });
mediaContentSchema.index({ 'storage.mime': 1 });
mediaContentSchema.index({ createdAt: -1 });

// Virtual for public URL (to be implemented in routes)
mediaContentSchema.virtual('url').get(function() {
  return `/api/media/${this._id}/stream`;
});

// Middleware to clean up GridFS files when media is removed
mediaContentSchema.pre('remove', async function(next) {
  // This will be implemented after we create the GridFS service
  next();
});

const MediaContent = mongoose.model('MediaContent', mediaContentSchema);

module.exports = MediaContent;
