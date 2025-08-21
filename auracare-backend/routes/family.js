const express = require("express")
const multer = require("multer")
const Joi = require("joi")
const FamilyMember = require("../models/FamilyMember")
const Patient = require("../models/Patient")
const { authenticate, authorize } = require("../middleware/authMiddleware")

const router = express.Router()

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "video/mp4", "audio/mpeg", "audio/wav"]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Invalid file type"), false)
    }
  },
})

// All routes require authentication
router.use(authenticate)

// Get family member profile
router.get("/profile", authorize("family"), async (req, res) => {
  try {
    const family = await FamilyMember.findById(req.user._id)
      .populate("patientId", "name patientId condition")
      .select("-password")

    res.json(family)
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
})

// Share content with patient
router.post("/share-content", authorize("family"), upload.single("file"), async (req, res) => {
  try {
    const contentSchema = Joi.object({
      type: Joi.string().valid("photo", "video", "voice_note", "text_message").required(),
      message: Joi.string().max(500),
      title: Joi.string().max(100),
    })

    const { error } = contentSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }

    const { type, message, title } = req.body

    // Verify family member has access to patient
    const family = await FamilyMember.findById(req.user._id).populate("patientId")
    if (!family || !family.isApproved) {
      return res.status(403).json({ error: "Access denied" })
    }

    const contentData = {
      id: Date.now().toString(),
      type,
      title: title || `${type} from ${family.name}`,
      message,
      fromFamily: {
        name: family.name,
        relationship: family.relationship,
      },
      patientId: family.patientId._id,
      timestamp: new Date(),
      file: req.file
        ? {
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            buffer: req.file.buffer.toString("base64"),
          }
        : null,
    }

    // In a real implementation, you would save this to a database
    // and emit via Socket.IO to connected clients

    res.json({
      message: "Content shared successfully",
      content: {
        ...contentData,
        file: req.file ? { ...contentData.file, buffer: undefined } : null,
      },
    })
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
})

// Get pending family approvals (staff only)
router.get("/pending-approvals", authorize("staff"), async (req, res) => {
  try {
    const pendingFamily = await FamilyMember.find({ isApproved: false })
      .populate("patientId", "name patientId")
      .select("-password")
      .sort({ createdAt: -1 })

    res.json(pendingFamily)
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
})

// Approve/reject family member (staff only)
router.put("/approve/:id", authorize("staff"), async (req, res) => {
  try {
    const approvalSchema = Joi.object({
      approved: Joi.boolean().required(),
      accessLevel: Joi.string().valid("full", "limited").default("limited"),
    })

    const { error } = approvalSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }

    const { approved, accessLevel } = req.body

    const family = await FamilyMember.findById(req.params.id)
    if (!family) {
      return res.status(404).json({ error: "Family member not found" })
    }

    if (approved) {
      family.isApproved = true
      family.accessLevel = accessLevel
      await family.save()

      res.json({ message: "Family member approved successfully" })
    } else {
      // Remove from patient's family list and delete
      await Patient.findByIdAndUpdate(family.patientId, { $pull: { familyMembers: family._id } })
      await FamilyMember.findByIdAndDelete(req.params.id)

      res.json({ message: "Family member registration rejected" })
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
