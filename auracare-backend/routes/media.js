const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { uploadSingle } = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const MediaContent = require('../models/MediaContent');
const { uploadFile, getFileStream } = require('../storage/gridfs');

// Get all media for a patient
router.get('/patients/:id/media', authenticate, async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const { type } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Validate and check permissions
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }

    const isAuthorized = 
      req.userRole === 'staff' || 
      (req.userRole === 'patient' && req.user._id.toString() === patientId) ||
      (req.userRole === 'family' && req.user.patientId?.toString() === patientId);

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Build query
    const query = { patientId };
    if (['image', 'audio', 'video'].includes(type)) query.type = type;
    if (req.userRole === 'patient') query.isApproved = true;

    const total = await MediaContent.countDocuments(query);
    const media = await MediaContent.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: media.map(m => ({
        ...m,
        url: `/api/media/${m._id}/stream`
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// Upload media
router.post(
  '/patients/:id/media',
  authenticate,
  authorize(['family', 'staff']),
  uploadSingle('file'),
  async (req, res) => {
    try {
      const { id: patientId } = req.params;
      const file = req.file;

      if (!file) return res.status(400).json({ error: 'No file uploaded' });

      // Upload to GridFS
      const uploadResult = await uploadFile(file, {
        uploadedBy: req.user._id,
        patientId,
        originalName: file.originalname
      });

      // Create media record
      const media = new MediaContent({
        patientId,
        uploadedBy: req.user._id,
        uploadedByModel: req.userRole === 'staff' ? 'Staff' : 'FamilyMember',
        type: file.mimetype.split('/')[0],
        title: req.body.title || file.originalname,
        storage: {
          kind: 'gridfs',
          key: uploadResult.fileId,
          mime: uploadResult.mimeType,
          size: uploadResult.size
        },
        isApproved: req.userRole === 'staff',
        approvedBy: req.userRole === 'staff' ? req.user._id : null
      });

      await media.save();

      // Emit socket events
      const io = req.app.get('io');
      if (io) {
        io.to(`patient:${patientId}`).emit('media_added', media);
        if (media.isApproved) {
          io.to('staff').emit('media_approved', media);
        }
      }

      res.status(201).json({ success: true, data: media });
    } catch (error) {
      console.error('Error uploading media:', error);
      res.status(500).json({ error: 'Failed to upload media' });
    }
  }
);

// Approve media (staff only)
router.put('/media/:id/approve', authenticate, authorize(['staff']), async (req, res) => {
  try {
    const media = await MediaContent.findById(req.params.id);
    if (!media) return res.status(404).json({ error: 'Media not found' });

    media.isApproved = true;
    media.approvedBy = req.user._id;
    media.approvedAt = new Date();
    await media.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`patient:${media.patientId}`).emit('media_approved', media);
    }

    res.json({ success: true, data: media });
  } catch (error) {
    console.error('Error approving media:', error);
    res.status(500).json({ error: 'Failed to approve media' });
  }
});

// Stream media
router.get('/media/:id/stream', authenticate, async (req, res) => {
  try {
    const media = await MediaContent.findById(req.params.id);
    if (!media) return res.status(404).json({ error: 'Media not found' });

    // Check permissions
    const isAuthorized = 
      req.userRole === 'staff' ||
      (req.userRole === 'patient' && req.user._id.toString() === media.patientId.toString()) ||
      (req.userRole === 'family' && req.user.patientId?.toString() === media.patientId.toString());

    if (!isAuthorized || (req.userRole === 'patient' && !media.isApproved)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { stream, contentType, contentLength } = await getFileStream(media.storage.key);
    
    res.set({
      'Content-Type': contentType,
      'Content-Length': contentLength,
      'Accept-Ranges': 'bytes'
    });

    stream.pipe(res);
  } catch (error) {
    console.error('Error streaming media:', error);
    res.status(500).json({ error: 'Failed to stream media' });
  }
});

module.exports = router;
