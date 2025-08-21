const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  uploadedBy: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'uploadedBy.model'
    },
    model: {
      type: String,
      required: true,
      enum: ['Staff', 'Doctor']
    },
    name: {
      type: String,
      required: true
    }
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  storage: {
    kind: {
      type: String,
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
    originalName: String
  },
  reportDate: {
    type: Date,
    default: Date.now
  },
  category: {
    type: String,
    trim: true,
    enum: ['lab', 'radiology', 'prescription', 'discharge_summary', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for common queries
reportSchema.index({ patientId: 1, createdAt: -1 });
reportSchema.index({ category: 1 });
reportSchema.index({ 'uploadedBy.id': 1 });
reportSchema.index({ isArchived: 1 });

// Virtual for file URL
reportSchema.virtual('url').get(function() {
  return `/api/reports/${this._id}/stream`;
});

// Virtual for formatted date
reportSchema.virtual('formattedDate').get(function() {
  return this.reportDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Static method to get reports for a patient with access control
reportSchema.statics.findByPatientId = function(patientId, userRole) {
  const query = { patientId };
  
  // Filter out archived reports for non-staff users
  if (userRole !== 'staff') {
    query.isArchived = false;
  }
  
  return this.find(query)
    .sort({ reportDate: -1, createdAt: -1 })
    .populate('uploadedBy.id', 'name email');
};

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
