const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const EmotionData = require('../models/EmotionData');
const { processEmotion } = require('../services/ruleEngine');

// Validation middleware for emotion data
const validateEmotionData = [
  body('emotionalState')
    .isIn(['calm', 'anxious', 'distressed', 'comfortable', 'agitated'])
    .withMessage('Invalid emotional state'),
  body('confidence')
    .isFloat({ min: 0, max: 1 })
    .withMessage('Confidence must be between 0 and 1'),
  body('vitalSignsContext.heartRate').optional().isInt({ min: 0 }),
  body('vitalSignsContext.bloodPressure.systolic').optional().isInt({ min: 0 }),
  body('vitalSignsContext.bloodPressure.diastolic').optional().isInt({ min: 0 }),
  body('vitalSignsContext.oxygenSaturation').optional().isFloat({ min: 0, max: 100 }),
  body('suggestedInterventions').optional().isArray(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

/**
 * @route   POST /api/patients/:id/emotions
 * @desc    Submit emotion data for a patient
 * @access  Staff or System
 */
router.post(
  '/patients/:id/emotions',
  authenticate,
  authorize(['staff', 'system']),
  validateEmotionData,
  async (req, res) => {
    try {
      const patientId = req.params.id;
      const { emotionalState, confidence, vitalSignsContext, suggestedInterventions } = req.body;

      // Create new emotion data record
      const emotionData = new EmotionData({
        patientId,
        emotionalState,
        confidence,
        vitalSignsContext: vitalSignsContext || {},
        suggestedInterventions: suggestedInterventions || []
      });

      // Save to database
      await emotionData.save();

      // Process emotion through rule engine
      const io = req.app.get('io');
      await processEmotion({
        patientId,
        emotionalState,
        confidence,
        timestamp: emotionData.timestamp
      }, io);

      res.status(201).json({
        success: true,
        data: emotionData
      });
    } catch (error) {
      console.error('Error saving emotion data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save emotion data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/patients/:id/emotions
 * @desc    Get emotion history for a patient
 * @access  Patient, Family, or Staff with access to the patient
 */
router.get(
  '/patients/:id/emotions',
  authenticate,
  async (req, res) => {
    try {
      const patientId = req.params.id;
      const { limit = 50, offset = 0 } = req.query;

      // Check permissions
      if (req.user.role === 'patient' && req.user.id !== patientId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      if (req.user.role === 'family' && req.user.patientId?.toString() !== patientId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Query emotion history
      const [emotions, total] = await Promise.all([
        EmotionData.find({ patientId })
          .sort({ timestamp: -1 })
          .skip(parseInt(offset))
          .limit(parseInt(limit)),
        EmotionData.countDocuments({ patientId })
      ]);

      res.json({
        success: true,
        data: emotions,
        meta: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Error fetching emotion data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch emotion data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;
