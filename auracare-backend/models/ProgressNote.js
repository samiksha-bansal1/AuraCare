const mongoose = require('mongoose');

const progressNoteSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  author: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'author.model'
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
  text: {
    type: String,
    required: true,
    trim: true
  },
  visibility: {
    type: String,
    enum: ['staff', 'family'],
    default: 'staff',
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }], 
  isPinned: {
    type: Boolean,
    default: false
  },
  lastEdited: {
    at: {
      type: Date,
      default: Date.now
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'author.model'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for common queries
progressNoteSchema.index({ patientId: 1, visibility: 1 });
progressNoteSchema.index({ 'author.id': 1 });
progressNoteSchema.index({ createdAt: -1 });
progressNoteSchema.index({ isPinned: -1, createdAt: -1 });

// Add text index for search functionality
progressNoteSchema.index(
  { text: 'text', 'tags': 'text' },
  { weights: { text: 3, 'tags': 2 } }
);

// Virtual for formatted date
progressNoteSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Pre-save hook to update lastEdited
progressNoteSchema.pre('save', function(next) {
  if (this.isModified('text') || this.isModified('visibility') || this.isModified('tags')) {
    this.lastEdited.at = new Date();
    this.lastEdited.by = this.author.id;
  }
  next();
});

// Static method to get notes for a patient with proper access control
progressNoteSchema.statics.findByPatientId = function(patientId, userRole, userId) {
  let query = { patientId };
  
  // Family members can only see notes marked as visible to family
  if (userRole === 'family') {
    query.visibility = 'family';
  }
  
  return this.find(query)
    .sort({ isPinned: -1, createdAt: -1 })
    .populate('author.id', 'name email')
    .populate('lastEdited.by', 'name');
};

const ProgressNote = mongoose.model('ProgressNote', progressNoteSchema);

module.exports = ProgressNote;
