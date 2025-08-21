const mongoose = require("mongoose")

const emotionDataSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    emotionalState: {
      type: String,
      enum: ["calm", "anxious", "distressed", "comfortable", "agitated"],
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
    },
    vitalSignsContext: {
      heartRate: Number,
      bloodPressure: {
        systolic: Number,
        diastolic: Number,
      },
      oxygenSaturation: Number,
    },
    suggestedInterventions: [
      {
        type: {
          type: String,
          enum: ["music", "family_content", "breathing_exercise", "staff_attention"],
        },
        description: String,
        priority: {
          type: Number,
          min: 1,
          max: 5,
        },
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

emotionDataSchema.index({ patientId: 1, timestamp: -1 })

module.exports = mongoose.model("EmotionData", emotionDataSchema)
