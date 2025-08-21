const express = require("express")
const { authenticate, authorize } = require("../middleware/authMiddleware")
const Alert = require("../models/Alert")
const AuditLog = require("../models/AuditLog")

const router = express.Router()

// Define valid request kinds and their corresponding alert types
const REQUEST_KINDS = {
  'need_water': { type: 'info', message: 'Patient needs water' },
  'in_pain': { type: 'warning', message: 'Patient is in pain' },
  'need_bathroom': { type: 'info', message: 'Patient needs bathroom assistance' },
  'need_medication': { type: 'warning', message: 'Patient needs medication' },
  'feeling_unwell': { type: 'warning', message: 'Patient is feeling unwell' },
  'need_help': { type: 'info', message: 'Patient needs general assistance' },
  'emergency': { type: 'critical', message: 'Patient emergency' },
  'visitor_request': { type: 'info', message: 'Patient requesting visitor' }
}

// POST /api/patient-requests - Create a patient request
router.post("/", authenticate, authorize("patient"), async (req, res) => {
  try {
    const { kind, note } = req.body
    const patientId = req.user._id

    // Validate request kind
    if (!kind || !REQUEST_KINDS[kind]) {
      return res.status(400).json({ 
        error: "Invalid request kind", 
        validKinds: Object.keys(REQUEST_KINDS)
      })
    }

    const requestConfig = REQUEST_KINDS[kind]
    
    // Create alert
    const alertData = {
      patientId,
      type: requestConfig.type,
      category: "patient_request",
      message: requestConfig.message,
      data: {
        requestKind: kind,
        note: note || null,
        timestamp: new Date()
      }
    }

    const alert = new Alert(alertData)
    await alert.save()

    // Create audit log entry
    const auditLogData = {
      patientId,
      action: "patient_request",
      details: {
        requestKind: kind,
        note: note || null,
        alertId: alert._id
      },
      performedBy: patientId,
      performedByModel: "Patient",
      metadata: {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }
    }

    const auditLog = new AuditLog(auditLogData)
    await auditLog.save()

    // Get socket.io instance from app
    const io = req.app.get('io')
    
    if (io) {
      // Emit to patient room
      io.to(`patient:${patientId}`).emit('alert_created', {
        alert: alert.toObject(),
        timestamp: new Date()
      })

      // Emit to staff room
      io.to('staff').emit('alert_created', {
        alert: alert.toObject(),
        timestamp: new Date()
      })

      // Create history update payload
      const historyUpdate = {
        type: 'audit_log',
        timestamp: new Date(),
        action: 'patient_request',
        details: {
          requestKind: kind,
          note: note || null,
          alertId: alert._id.toString()
        },
        performedBy: patientId,
        performedByModel: 'Patient',
        metadata: {
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      };

      // Emit history update to patient room and staff
      io.to(`patient:${patientId}`).emit('history_update', historyUpdate);
      io.to('staff').emit('history_update', { ...historyUpdate, patientId });
    }

    res.status(201).json({
      success: true,
      alert: alert.toObject(),
      auditLog: auditLog.toObject(),
      message: "Request submitted successfully"
    })

  } catch (error) {
    console.error("Error creating patient request:", error)
    res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// GET /api/patient-requests/kinds - Get available request kinds
router.get("/kinds", authenticate, authorize("patient"), (req, res) => {
  const kinds = Object.keys(REQUEST_KINDS).map(kind => ({
    kind,
    type: REQUEST_KINDS[kind].type,
    message: REQUEST_KINDS[kind].message
  }))
  
  res.json({
    success: true,
    kinds
  })
})

module.exports = router
