const axios = require('axios');
const Patient = require('../models/Patient');
const Alert = require('../models/Alert');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

// Configuration
const POLL_INTERVAL_MS = 3000; // 3 seconds
// Prefer AI_SERVICE_URL from .env for consistency with server.js, fallback to localhost
const FASTAPI_BASE_URL = process.env.AI_SERVICE_URL || process.env.FASTAPI_BASE_URL || 'http://localhost:8000';

// Track last vitals for each patient
const lastVitals = new Map();

// Thresholds for anomaly detection
const THRESHOLDS = {
  spo2: { min: 90, max: 100 },
  heartRate: { min: 60, max: 100 },
  systolicBp: { min: 90, max: 140 },
  diastolicBp: { min: 60, max: 90 },
  temperature: { min: 36.1, max: 37.2 } // Celsius
};

// Severity levels for alerts
const SEVERITY = {
  WARNING: 'warning',
  CRITICAL: 'critical'
};

// Check if a vital sign is outside normal range
function isVitalAbnormal(type, value) {
  const threshold = THRESHOLDS[type];
  if (!threshold) return false;
  return value < threshold.min || value > threshold.max;
}

// Get severity level based on deviation
function getSeverity(type, value) {
  const threshold = THRESHOLDS[type];
  if (!threshold) return SEVERITY.WARNING;
  
  let deviation = 0;
  if (value < threshold.min) {
    deviation = (threshold.min - value) / threshold.min;
  } else if (value > threshold.max) {
    deviation = (value - threshold.max) / threshold.max;
  }
  
  return deviation > 0.2 ? SEVERITY.CRITICAL : SEVERITY.WARNING;
}

// Generate alert message for abnormal vitals
function generateAlertMessage(type, value) {
  const threshold = THRESHOLDS[type];
  if (!threshold) return null;
  
  const severity = getSeverity(type, value);
  const formattedValue = type === 'temperature' ? `${value}°C` : value;
  
  if (value < threshold.min) {
    return {
      severity,
      message: `${type.toUpperCase()} Low (${formattedValue} < ${threshold.min}${type === 'temperature' ? '°C' : ''})`
    };
  } else {
    return {
      severity,
      message: `${type.toUpperCase()} High (${formattedValue} > ${threshold.max}${type === 'temperature' ? '°C' : ''})`
    };
  }
}

// Check for significant changes in vitals
function hasSignificantChange(previous, current, type) {
  if (!previous) return false;
  
  // Define sensitivity thresholds for each vital type
  const SENSITIVITY = {
    spo2: 2,         // 2% change
    heartRate: 5,    // 5 bpm change
    systolicBp: 10,  // 10 mmHg change
    diastolicBp: 5,  // 5 mmHg change
    temperature: 0.3 // 0.3°C change
  };
  
  return Math.abs(current - previous) > (SENSITIVITY[type] || 0);
}

// Create an alert for abnormal vitals
async function createVitalAlert(patientId, type, value, message, severity) {
  try {
    const alert = new Alert({
      patientId,
      type: severity,
      category: 'vital_signs',
      message,
      status: 'active',
      priority: severity === SEVERITY.CRITICAL ? 'high' : 'medium',
      metadata: {
        vitalType: type,
        value,
        threshold: THRESHOLDS[type] || {}
      }
    });
    
    await alert.save();
    return alert;
  } catch (error) {
    logger.error(`Error creating alert for patient ${patientId}:`, error);
    return null;
  }
}

// Log vital anomaly to audit log
async function logVitalAnomaly(patientId, type, value, alert) {
  try {
    const log = new AuditLog({
      action: 'vital_anomaly',
      entity: 'VitalSign',
      entityId: alert?._id,
      patientId,
      details: {
        type,
        value,
        threshold: THRESHOLDS[type] || {},
        alertId: alert?._id
      },
      timestamp: new Date()
    });
    
    await log.save();
    return log;
  } catch (error) {
    logger.error(`Error logging vital anomaly for patient ${patientId}:`, error);
    return null;
  }
}

// Process vitals for a single patient
async function processPatientVitals(patient, io, socketService) {
  try {
    const roomNumber = patient.roomNumber || '1'; // Default room if not set
    
    // Fetch vitals from FastAPI
    const response = await axios.get(`${FASTAPI_BASE_URL}/vitals/${roomNumber}`, {
      timeout: 5000 // 5 second timeout
    });
    
    const currentVitals = response.data;
    const previousVitals = lastVitals.get(patient._id.toString());
    
    // Update last vitals
    lastVitals.set(patient._id.toString(), currentVitals);
    
    // Emit vitals update using socket service
    const vitalsData = {
      patientId: patient._id,
      ...currentVitals,
      timestamp: new Date()
    };
    
    // Use socket service to emit to appropriate rooms
    if (socketService) {
      socketService.emit('vitals_update', vitalsData, {
        patientId: patient._id.toString()
      });
    } else if (io) {
      // Fallback to direct io if socketService not available
      io.to(`patient:${patient._id}`).emit('vitals_update', vitalsData);
    }
    
    // Check for anomalies if we have previous vitals
    if (previousVitals) {
      await checkForAnomalies(patient, previousVitals, currentVitals, io, socketService);
    }
    
    return currentVitals;
  } catch (error) {
    logger.error(`Error processing vitals for patient ${patient._id}:`, error.message);
    return null;
  }
}

// Check for anomalies between previous and current vitals
async function checkForAnomalies(patient, previousVitals, currentVitals, io, socketService) {
  const anomalies = [];
  const patientId = patient._id.toString();
  
  // Check each vital sign for anomalies
  const vitalTypes = ['spo2', 'heartRate', 'systolicBp', 'diastolicBp', 'temperature'];
  
  for (const type of vitalTypes) {
    const currentValue = currentVitals[type];
    const previousValue = previousVitals[type];
    
    if (currentValue === undefined || currentValue === null) continue;
    
    // Check for abnormal values
    if (isVitalAbnormal(type, currentValue)) {
      const severity = getSeverity(type, currentValue);
      const message = `${type.toUpperCase()} is ${severity === SEVERITY.CRITICAL ? 'critically ' : ''}${currentValue < THRESHOLDS[type].min ? 'low' : 'high'}: ${currentValue}`;
      
      // Create alert
      const alert = await createVitalAlert(patientId, type, currentValue, message, severity);
      
      // Log anomaly
      await logVitalAnomaly(patientId, type, currentValue, alert);
      
      // Emit alert using socket service if available
      if (socketService) {
        // Emit to both patient and staff rooms
        socketService.emit('alert_created', alert, {
          patientId,
          includeStaff: true
        });
        
        // Emit history update
        const historyUpdate = {
          type: 'vital_anomaly',
          patientId,
          data: {
            type,
            value: currentValue,
            severity,
            message
          },
          timestamp: new Date()
        };
        
        socketService.emit('history_update', historyUpdate, {
          patientId,
          includeStaff: true
        });
      } else if (io) {
        // Fallback to direct io if socketService not available
        io.to(`patient:${patientId}`).emit('alert_created', alert);
        io.to('staff').emit('alert_created', alert);
        
        // Emit history update
        const historyUpdate = {
          type: 'vital_anomaly',
          patientId,
          data: {
            type,
            value: currentValue,
            severity,
            message
          },
          timestamp: new Date()
        };
        
        io.to(`patient:${patientId}`).emit('history_update', historyUpdate);
        io.to('staff').emit('history_update', historyUpdate);
      }
      
      anomalies.push({ type, value: currentValue, severity });
    }
  }
  
  return anomalies;
}

// Main polling function
async function pollVitals(io, socketService) {
  try {
    // Find all active patients (or those with active sockets)
    const activePatients = await Patient.find({ isActive: true });
    
    // Process each patient's vitals
    await Promise.all(
      activePatients.map(patient => processPatientVitals(patient, io, socketService))
    );
    
  } catch (error) {
    logger.error('Error in vitals polling cycle:', error);
  } finally {
    // Schedule next poll
    setTimeout(() => pollVitals(io, socketService), POLL_INTERVAL_MS);
  }
}

// Initialize the vitals poller
function initVitalsPoller(io, socketService) {
  if (!io && !socketService) {
    throw new Error('Either Socket.IO instance or SocketService is required for vitals poller');
  }
  
  // Start polling
  setInterval(() => pollVitals(io, socketService), POLL_INTERVAL_MS);
  logger.info('Vitals poller started');
}

module.exports = {
  initVitalsPoller,
  THRESHOLDS,
  SEVERITY
};
