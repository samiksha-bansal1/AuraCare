const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const { uploadFile, getFileStream } = require('../storage/gridfs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: './uploads/temp',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Upload report
router.post(
  '/patients/:id/reports',
  authenticate,
  authorize(['staff', 'doctor']),
  upload.single('file'),
  async (req, res) => {
    try {
      const { title, description = '', category = 'other', tags = [] } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Upload to GridFS
      const uploadResult = await uploadFile(req.file, {
        originalName: req.file.originalname,
        uploadedBy: req.user._id,
        patientId: req.params.id,
        reportTitle: title
      });

      // Create report
      const report = new Report({
        patientId: req.params.id,
        uploadedBy: {
          id: req.user._id,
          model: req.user.role === 'doctor' ? 'Doctor' : 'Staff',
          name: req.user.name
        },
        title,
        description,
        category,
        tags: [...new Set(tags.map(tag => tag.toLowerCase().trim()))],
        storage: {
          kind: 'gridfs',
          key: uploadResult.fileId,
          mime: uploadResult.mimeType,
          size: uploadResult.size,
          originalName: req.file.originalname
        }
      });

      await report.save();

      // Log the action
      await AuditLog.create({
        action: 'upload',
        entity: 'Report',
        entityId: report._id,
        patientId: req.params.id,
        performedBy: { id: req.user._id, role: req.user.role, name: req.user.name },
        timestamp: new Date()
      });

      // Clean up temp file
      fs.unlink(req.file.path, () => {});

      res.status(201).json(report);
    } catch (error) {
      console.error('Error uploading report:', error);
      res.status(500).json({ error: 'Failed to upload report' });
    }
  }
);

// Get patient reports
router.get('/patients/:id/reports', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions
    if (req.userRole === 'family' && req.user.patientId?.toString() !== id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (req.userRole === 'patient' && req.user._id.toString() !== id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const reports = await Report.find({ patientId: id })
      .sort({ createdAt: -1 })
      .populate('uploadedBy.id', 'name');
      
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Stream report file
router.get('/reports/:id/stream', authenticate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Check permissions
    if (req.userRole === 'family' && req.user.patientId?.toString() !== report.patientId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (req.userRole === 'patient' && req.user._id.toString() !== report.patientId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { stream, contentType } = await getFileStream(report.storage.key);
    
    res.set({
      'Content-Type': contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${report.title}${path.extname(report.storage.originalName || '')}"`
    });
    
    stream.pipe(res);
  } catch (error) {
    console.error('Error streaming report:', error);
    res.status(500).json({ error: 'Failed to stream report' });
  }
});

module.exports = router;
