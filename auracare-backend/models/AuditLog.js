const mongoose = require("mongoose")

const auditLogSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: ["patient_request", "alert_created", "alert_acknowledged", "alert_resolved", "vital_signs_recorded", "family_notification"]
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "performedByModel",
    },
    performedByModel: {
      type: String,
      enum: ["Patient", "Staff", "FamilyMember"],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    }
  },
  {
    timestamps: false, // We use our own timestamp field
    collection: "auditlogs"
  }
)

// Index for efficient querying
auditLogSchema.index({ patientId: 1, timestamp: -1 })  // Optimized for history endpoint
auditLogSchema.index({ action: 1, timestamp: -1 })

// Compound index for patient history queries
auditLogSchema.index(
  { patientId: 1, timestamp: -1 },
  { name: 'patient_history' }
)

// Make the schema append-only by preventing updates and deletes
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function() {
  throw new Error('AuditLog entries cannot be modified')
})

auditLogSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function() {
  throw new Error('AuditLog entries cannot be deleted')
})

module.exports = mongoose.model("AuditLog", auditLogSchema)
