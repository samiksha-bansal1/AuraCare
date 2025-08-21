const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const ProgressNote = require('../models/ProgressNote');
const AuditLog = require('../models/AuditLog');

// @route   POST /api/patients/:id/notes
// @desc    Create a progress note (staff only)
// @access  Private
router.post(
  '/patients/:id/notes',
  authenticate,
  authorize(['staff', 'doctor']),
  async (req, res) => {
    try {
      const { text, visibility = 'staff', tags = [] } = req.body;
      const note = new ProgressNote({
        patientId: req.params.id,
        author: {
          id: req.user._id,
          model: req.user.role === 'doctor' ? 'Doctor' : 'Staff',
          name: req.user.name
        },
        text,
        visibility,
        tags: [...new Set(tags.map(t => t.toLowerCase().trim()))]
      });

      await note.save();

      // Log the action
      await AuditLog.create({
        action: 'create',
        entity: 'ProgressNote',
        entityId: note._id,
        patientId: req.params.id,
        performedBy: { id: req.user._id, role: req.user.role, name: req.user.name },
        timestamp: new Date()
      });

      // Notify via socket
      const io = req.app.get('io');
      if (io) {
        io.to(`patient:${req.params.id}`).emit('note_created', note);
        io.to(`patient:${req.params.id}`).emit('history_update', {
          type: 'progress_note',
          timestamp: new Date(),
          data: { noteId: note._id, text: text.substring(0, 100), visibility }
        });
      }

      res.status(201).json(note);
    } catch (error) {
      console.error('Error creating note:', error);
      res.status(500).json({ error: 'Failed to create note' });
    }
  }
);

// @route   GET /api/patients/:id/notes
// @desc    Get notes for a patient with role-based visibility
// @access  Private
router.get('/patients/:id/notes', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const query = { patientId: id };
    
    // Family can only see notes marked as visible to family
    if (req.userRole === 'family') {
      query.visibility = 'family';
    }

    const notes = await ProgressNote.find(query)
      .sort({ createdAt: -1 })
      .populate('author.id', 'name');
      
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// @route   PUT /api/notes/:id
// @desc    Update a note (author or admin only)
// @access  Private
router.put('/notes/:id', authenticate, authorize(['staff', 'doctor']), async (req, res) => {
  try {
    const { text, visibility, tags } = req.body;
    const note = await ProgressNote.findById(req.params.id);
    
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.author.id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates = {};
    if (text) updates.text = text;
    if (visibility) updates.visibility = visibility;
    if (tags) updates.tags = [...new Set(tags.map(t => t.toLowerCase().trim()))];
    updates.lastEdited = { at: new Date(), by: req.user._id };

    const updatedNote = await ProgressNote.findByIdAndUpdate(req.params.id, updates, { new: true });
    
    // Log the update
    await AuditLog.create({
      action: 'update',
      entity: 'ProgressNote',
      entityId: note._id,
      patientId: note.patientId,
      performedBy: { id: req.user._id, role: req.user.role, name: req.user.name },
      timestamp: new Date()
    });

    // Notify via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`patient:${note.patientId}`).emit('note_updated', updatedNote);
    }

    res.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

module.exports = router;
