const MediaContent = require('../models/MediaContent');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

// Emotion states that should trigger auto-play
const TRIGGER_EMOTIONS = ['anxious', 'distressed'];

/**
 * Handle emotion detection and trigger appropriate rules
 * @param {Object} emotionData - The emotion data to process
 * @param {Object} io - Socket.IO instance
 */
async function processEmotion(emotionData, io) {
  try {
    const { patientId, emotionalState } = emotionData;
    
    // Emit emotion detected event
    if (io) {
      io.to(`patient:${patientId}`).emit('emotion_detected', {
        patientId,
        emotionalState,
        timestamp: new Date()
      });
    }
    
    // Check if we should trigger auto-play
    if (TRIGGER_EMOTIONS.includes(emotionalState)) {
      await triggerVoiceNotePlayback(patientId, emotionalState, io);
    }
    
    return { success: true };
  } catch (error) {
    logger.error('Error in emotion processing:', error);
    throw error;
  }
}

/**
 * Find and trigger playback of an appropriate voice note
 */
async function triggerVoiceNotePlayback(patientId, emotionalState, io) {
  try {
    // Find the most recent approved voice note
    const voiceNote = await MediaContent.findOne({
      patientId,
      type: 'voice',
      isApproved: true
    })
    .sort({ createdAt: -1 }) // Most recent first
    .limit(1);
    
    if (!voiceNote) {
      logger.warn(`No approved voice notes found for patient ${patientId}`);
      return null;
    }
    
    // Log the auto-play trigger
    const auditLog = new AuditLog({
      action: 'autoplay_triggered',
      entity: 'MediaContent',
      entityId: voiceNote._id,
      patientId,
      details: {
        emotionalState,
        mediaId: voiceNote._id,
        mediaTitle: voiceNote.title
      },
      timestamp: new Date()
    });
    
    await auditLog.save();
    
    // Emit the auto-play event
    if (io) {
      io.to(`patient:${patientId}`).emit('autoplay_media', {
        mediaId: voiceNote._id,
        title: voiceNote.title,
        url: voiceNote.url,
        triggeredBy: 'emotion_detection',
        triggeredByEmotion: emotionalState,
        timestamp: new Date()
      });
    }
    
    return voiceNote;
  } catch (error) {
    logger.error('Error triggering voice note playback:', error);
    throw error;
  }
}

module.exports = {
  processEmotion,
  triggerVoiceNotePlayback
};
