const mongoose = require("mongoose")

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    condition: {
      type: String,
      required: true,
    },
    roomNumber: {
      type: String,
      required: true,
      default: "101",
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    assignedStaff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
      },
    ],
    familyMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FamilyMember",
      },
    ],
    vitalSigns: {
      heartRate: Number,
      bloodPressure: {
        systolic: Number,
        diastolic: Number,
      },
      oxygenSaturation: Number,
      temperature: Number,
      respiratoryRate: Number,
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    currentEmotionalState: {
      type: String,
      enum: ["calm", "anxious", "distressed", "comfortable", "unknown"],
      default: "unknown",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Index for faster queries
patientSchema.index({ patientId: 1 })
patientSchema.index({ assignedStaff: 1 })

module.exports = mongoose.model("Patient", patientSchema)
