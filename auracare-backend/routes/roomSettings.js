const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const RoomSetting = require('../models/RoomSetting');
const AuditLog = require('../models/AuditLog');

// Validation middleware for updating settings
const validateLightingUpdate = [
  body('mode')
    .optional()
    .isIn(['day', 'night', 'reading', 'calm'])
    .withMessage('Invalid lighting mode'),
  body('brightness')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Brightness must be between 0 and 100'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

/**
 * @route   GET /api/patients/:id/lighting
 * @desc    Get room lighting settings for a patient
 * @access  Patient, Family, or Staff with access to the patient
 */
router.get(
  '/patients/:id/lighting',
  authenticate,
  async (req, res) => {
    try {
      const { id: patientId } = req.params;
      
      // Check permissions
      if (req.userRole === 'family' && req.user.patientId?.toString() !== patientId) {
        return res.status(403).json({ error: 'Not authorized to view these settings' });
      }
      
      if (req.userRole === 'patient' && req.user._id.toString() !== patientId) {
        return res.status(403).json({ error: 'Not authorized to view these settings' });
      }
      
      // Get or create settings
      const settings = await RoomSetting.getOrCreate(patientId);
      
      res.json({
        success: true,
        data: settings
      });
      
    } catch (error) {
      console.error('Error fetching room settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch room settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   PUT /api/patients/:id/lighting
 * @desc    Update room lighting settings
 * @access  Patient (own settings) or Staff
 */
router.put(
  '/patients/:id/lighting',
  authenticate,
  validateLightingUpdate,
  async (req, res) => {
    try {
      const { id: patientId } = req.params;
      const { mode, brightness } = req.body;
      
      // Check permissions
      if (req.userRole === 'patient' && req.user._id.toString() !== patientId) {
        return res.status(403).json({ error: 'Not authorized to update these settings' });
      }
      
      if (req.userRole === 'family') {
        return res.status(403).json({ error: 'Not authorized to update settings' });
      }
      
      // Get current settings
      const currentSettings = await RoomSetting.getOrCreate(patientId);
      
      // Build update object
      const updates = {};
      if (mode !== undefined) updates.mode = mode;
      if (brightness !== undefined) updates.brightness = parseInt(brightness, 10);
      
      // If no valid updates, return current settings
      if (Object.keys(updates).length === 0) {
        return res.json({
          success: true,
          data: currentSettings
        });
      }
      
      // Update settings
      const updatedSettings = await RoomSetting.findOneAndUpdate(
        { patientId },
        {
          $set: updates,
          $set: {
            updatedBy: {
              id: req.user._id,
              model: req.user.role === 'patient' ? 'Patient' : 
                    (req.user.role === 'doctor' ? 'Doctor' : 'Staff'),
              name: req.user.name
            },
            lastUpdated: new Date()
          }
        },
        { new: true, upsert: true }
      );
      
      // Create audit log
      await AuditLog.create({
        action: 'update',
        entity: 'RoomSetting',
        entityId: updatedSettings._id,
        patientId,
        performedBy: {
          id: req.user._id,
          role: req.user.role,
          name: req.user.name
        },
        details: {
          changes: updates
        },
        timestamp: new Date()
      });
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`patient:${patientId}`).emit('lighting_update', {
          ...updatedSettings.toObject(),
          updatedBy: {
            id: req.user._id,
            name: req.user.name,
            role: req.user.role
          }
        });
      }
      
      res.json({
        success: true,
        data: updatedSettings
      });
      
    } catch (error) {
      console.error('Error updating room settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update room settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;
