const express = require("express")
const Joi = require("joi")
const Alert = require("../models/Alert")
const { authenticate, authorize } = require("../middleware/authMiddleware")

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// Get alerts (staff only)
router.get("/", authorize("staff"), async (req, res) => {
  try {
    const { page = 1, limit = 20, type, acknowledged } = req.query

    const filter = {}
    if (type) filter.type = type
    if (acknowledged !== undefined) filter.isAcknowledged = acknowledged === "true"

    const alerts = await Alert.find(filter)
      .populate("patientId", "name patientId")
      .populate("acknowledgedBy", "name")
      .populate("resolvedBy", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Alert.countDocuments(filter)

    res.json({
      alerts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    })
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
})

// Create alert (staff only)
router.post("/", authorize("staff"), async (req, res) => {
  try {
    const alertSchema = Joi.object({
      patientId: Joi.string().required(),
      type: Joi.string().valid("critical", "warning", "info").required(),
      category: Joi.string().valid("vital_signs", "emotional_state", "system", "family_request").required(),
      message: Joi.string().required(),
      data: Joi.object(),
    })

    const { error } = alertSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }

    const alert = new Alert(req.body)
    await alert.save()

    const populatedAlert = await Alert.findById(alert._id).populate("patientId", "name patientId")

    res.status(201).json(populatedAlert)
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
})

// Acknowledge alert (staff only)
router.put("/:id/acknowledge", authorize("staff"), async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
    if (!alert) {
      return res.status(404).json({ error: "Alert not found" })
    }

    alert.isAcknowledged = true
    alert.acknowledgedBy = req.user._id
    alert.acknowledgedAt = new Date()

    await alert.save()

    res.json({ message: "Alert acknowledged successfully" })
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
})

// Resolve alert (staff only)
router.put("/:id/resolve", authorize("staff"), async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
    if (!alert) {
      return res.status(404).json({ error: "Alert not found" })
    }

    alert.isResolved = true
    alert.resolvedBy = req.user._id
    alert.resolvedAt = new Date()

    if (!alert.isAcknowledged) {
      alert.isAcknowledged = true
      alert.acknowledgedBy = req.user._id
      alert.acknowledgedAt = new Date()
    }

    await alert.save()

    res.json({ message: "Alert resolved successfully" })
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
