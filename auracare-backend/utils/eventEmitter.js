const socketService = require('../services/socketService');
const { logAudit } = require('./auditLogger');
const logger = require('./logger');

/**
 * Emit an event and log it to the audit log
 * @param {Object} options - Event options
 * @param {string} options.event - Event name
 * @param {Object} options.data - Event data
 * @param {Object} options.user - User performing the action
 * @param {string} options.entity - Entity type (e.g., 'Patient', 'Alert')
 * @param {string} options.entityId - ID of the affected entity
 * @param {string} options.action - Action performed (e.g., 'create', 'update', 'delete')
 * @param {Object} options.changes - Object containing changes (for updates)
 * @param {string|string[]} options.rooms - Rooms to emit to (can be 'patient:<id>', 'staff', or array of rooms)
 * @param {boolean} options.includeStaff - Whether to include the staff room
 * @returns {Promise<Object>} The audit log entry
 */
async function emitWithAudit({
  event,
  data,
  user,
  entity,
  entityId,
  action,
  changes = {},
  rooms = [],
  includeStaff = true
}) {
  try {
    // Emit the event
    const emitOptions = {};
    
    if (Array.isArray(rooms)) {
      // If rooms array is provided, use it directly
      emitOptions.additionalRooms = rooms;
    } else if (typeof rooms === 'string') {
      // If single room is provided, convert to array
      emitOptions.additionalRooms = [rooms];
    }
    
    // Add patient room if patientId is in data
    if (data.patientId) {
      emitOptions.patientId = data.patientId;
    }
    
    // Include staff room if requested
    emitOptions.includeStaff = includeStaff;
    
    // Emit the event
    if (socketService.getInstance()) {
      socketService.getInstance().emit(event, data, emitOptions);
    }
    
    // Log to audit log if user and entity are provided
    if (user && entity && action) {
      return await logAudit({
        action,
        entity,
        entityId: entityId || data._id || data.id,
        user,
        changes,
        status: 'success',
        metadata: {
          event,
          data: redactSensitiveData(data)
        }
      });
    }
    
    return null;
  } catch (error) {
    logger.error('Error emitting event with audit:', error);
    // Don't throw to avoid breaking the main operation
    return null;
  }
}

/**
 * Redact sensitive data before logging
 * @private
 */
function redactSensitiveData(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = [
    'password',
    'token',
    'refreshToken',
    'accessToken',
    'authorization',
    'creditCard',
    'cvv',
    'ssn',
    'healthInsurance'
  ];
  
  const result = Array.isArray(data) ? [] : {};
  
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      result[key] = redactSensitiveData(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

module.exports = {
  emitWithAudit
};
