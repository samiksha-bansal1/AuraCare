const express = require("express");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const AuditLog = require("../models/AuditLog");
const Alert = require("../models/Alert");
const EmotionData = require("../models/EmotionData");
const mongoose = require("mongoose");

const router = express.Router();

/**
 * GET /api/patients/:id/history
 * Fetches a unified timeline of patient history including audit logs, alerts, and emotion data
 * Query params: page (default: 1), limit (default: 20)
 */
router.get("/patients/:id/history", authenticate, async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Validate patientId
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ error: "Invalid patient ID" });
    }

    // Check if the user has permission to view this patient's history
    const isAuthorized = 
      req.userRole === 'staff' || 
      (req.userRole === 'patient' && req.user._id.toString() === patientId) ||
      (req.userRole === 'family' && req.user.patientId?.toString() === patientId);

    if (!isAuthorized) {
      return res.status(403).json({ error: "Not authorized to view this patient's history" });
    }

    // Fetch audit logs with pagination
    const auditLogs = await AuditLog.find({ patientId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch related alerts and emotion data for the same time range if we have logs
    let relatedAlerts = [];
    let relatedEmotions = [];
    
    if (auditLogs.length > 0) {
      const oldestLog = auditLogs[auditLogs.length - 1];
      const newestLog = auditLogs[0];
      
      // Get alerts in the same time range
      relatedAlerts = await Alert.find({
        patientId,
        createdAt: { 
          $gte: new Date(oldestLog.timestamp.getTime() - 30000), // 30 seconds before
          $lte: new Date(newestLog.timestamp.getTime() + 30000)  // 30 seconds after
        }
      }).lean();

      // Get emotion data in the same time range
      relatedEmotions = await EmotionData.find({
        patientId,
        timestamp: { 
          $gte: new Date(oldestLog.timestamp.getTime() - 30000),
          $lte: new Date(newestLog.totion.getTime() + 30000)
        }
      }).lean();
    }

    // Map audit logs to unified format
    const unifiedLogs = auditLogs.map(log => ({
      id: log._id,
      type: 'audit_log',
      timestamp: log.timestamp,
      action: log.action,
      details: log.details,
      performedBy: log.performedBy,
      performedByModel: log.performedByModel,
      metadata: log.metadata
    }));

    // Map alerts to unified format
    const alertLogs = relatedAlerts.map(alert => ({
      id: alert._id,
      type: 'alert',
      timestamp: alert.createdAt,
      alertType: alert.type,
      category: alert.category,
      message: alert.message,
      isAcknowledged: alert.isAcknowledged,
      isResolved: alert.isResolved,
      data: alert.data
    }));

    // Map emotion data to unified format
    const emotionLogs = relatedEmotions.map(emotion => ({
      id: emotion._id,
      type: 'emotion',
      timestamp: emotion.timestamp || emotion.createdAt,
      emotionalState: emotion.emotionalState,
      confidence: emotion.confidence,
      vitalSignsContext: emotion.vitalSignsContext,
      suggestedInterventions: emotion.suggestedInterventions
    }));

    // Combine and sort all logs by timestamp (newest first)
    const allLogs = [...unifiedLogs, ...alertLogs, ...emotionLogs].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Get total count for pagination
    const totalLogs = await AuditLog.countDocuments({ patientId });
    const totalPages = Math.ceil(totalLogs / limit);

    res.json({
      success: true,
      data: allLogs,
      pagination: {
        page,
        limit,
        totalItems: totalLogs,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error("Error fetching patient history:", error);
    res.status(500).json({ 
      error: "Failed to fetch patient history",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
