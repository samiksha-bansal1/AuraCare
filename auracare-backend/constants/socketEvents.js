/**
 * Standardized Socket.IO event names and room names
 * 
 * Room Naming Convention:
 * - Patient room: `patient:<patientId>`
 * - Staff room: `staff`
 * 
 * Event Naming Convention:
 * - Use past tense for events that indicate something happened (e.g., 'alert_created')
 * - Use present tense for state updates (e.g., 'vitals_update')
 * - Use snake_case for all event names
 * - Prefix with entity when needed for clarity (e.g., 'media_approved')
 */

// Room names
export const ROOMS = {
  patient: (patientId) => `patient:${patientId}`,
  staff: 'staff',
};

// Standard events
export const EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // System events
  HEARTBEAT: 'server_heartbeat',
  
  // Alert events
  ALERT_CREATED: 'alert_created',
  ALERT_ACKNOWLEDGED: 'alert_acknowledged',
  ALERT_RESOLVED: 'alert_resolved',
  
  // Vital signs events
  VITALS_UPDATE: 'vitals_update',
  
  // Emotion and behavior events
  EMOTION_DETECTED: 'emotion_detected',
  
  // Media events
  MEDIA_ADDED: 'media_added',
  MEDIA_APPROVED: 'media_approved',
  MEDIA_REJECTED: 'media_rejected',
  AUTOPLAY_MEDIA: 'autoplay_media',
  
  // Room control events
  LIGHTING_UPDATE: 'lighting_update',
  TEMPERATURE_UPDATE: 'temperature_update',
  
  // History and audit events
  HISTORY_UPDATE: 'history_update',
  
  // WebRTC events
  WEBRTC_READY: 'webrtc_ready',
  WEBRTC_OFFER: 'webrtc_offer',
  WEBRTC_ANSWER: 'webrtc_answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc_ice_candidate',
};

// Legacy event names (for backward compatibility)
const LEGACY_EVENTS = {
  'new_alert': EVENTS.ALERT_CREATED,
  'alert_updated': EVENTS.ALERT_ACKNOWLEDGED, // or EVENTS.ALERT_RESOLVED based on status
  'vitals': EVENTS.VITALS_UPDATE,
  'new_media': EVENTS.MEDIA_ADDED,
  'media_approval': EVENTS.MEDIA_APPROVED,
  'room_lighting': EVENTS.LIGHTING_UPDATE,
};

// Helper function to get standard event name, with fallback to legacy names
export function getStandardEventName(event) {
  return LEGACY_EVENTS[event] || event;
}

// Helper function to get target rooms for an event
export function getTargetRooms(event, patientId, userRole) {
  const rooms = [];
  
  // Always include staff room for all events
  rooms.push(ROOMS.staff);
  
  // Include patient room if patientId is provided
  if (patientId) {
    rooms.push(ROOMS.patient(patientId));
  }
  
  return rooms;
}

export default {
  ROOMS,
  EVENTS,
  LEGACY_EVENTS,
  getStandardEventName,
  getTargetRooms,
};
