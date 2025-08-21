const mongoose = require("mongoose")

const alertSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    type: {
      type: String,
      enum: ["critical", "warning", "info"],
      required: true,
    },
    category: {
      type: String,
      enum: ["vital_signs", "emotional_state", "system", "family_request", "patient_request"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
    },
    isAcknowledged: {
      type: Boolean,
      default: false,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    acknowledgedAt: {
      type: Date,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

alertSchema.index({ patientId: 1, createdAt: -1 })
alertSchema.index({ type: 1, isAcknowledged: 1 })

module.exports = mongoose.model("Alert", alertSchema)
