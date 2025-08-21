const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const familyMemberSchema = new mongoose.Schema(
  {
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
    phone: {
      type: String,
      required: true,
    },
    relationship: {
      type: String,
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    accessLevel: {
      type: String,
      enum: ["full", "limited"],
      default: "limited",
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Hash password before saving
familyMemberSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Compare password method
familyMemberSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

familyMemberSchema.index({ email: 1 })
familyMemberSchema.index({ patientId: 1 })

module.exports = mongoose.model("FamilyMember", familyMemberSchema)
