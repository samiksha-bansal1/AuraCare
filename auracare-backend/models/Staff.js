const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const staffSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["doctor", "nurse", "admin"],
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    assignedPatients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Hash password before saving
staffSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Compare password method
staffSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

staffSchema.index({ staffId: 1 })
staffSchema.index({ email: 1 })

module.exports = mongoose.model("Staff", staffSchema)
