const EventEmitter = require('events');
const logger = require('../utils/logger');

class VitalsService extends EventEmitter {
  constructor() {
    super();
    this.vitals = new Map(); // patientId -> currentVitals
    this.intervals = new Map();
    this.initialized = false;
  }

  // Initialize vitals service
  init() {
    if (this.initialized) return;
    this.initialized = true;
    logger.info('Vitals Service initialized');
  }

  // Start generating vitals for a patient
  startMonitoring(patientId) {
    if (this.intervals.has(patientId)) return;

    // Initial random vitals within normal ranges
    const initialVitals = this.generateVitals();
    this.vitals.set(patientId, initialVitals);

    // Update vitals every 3 seconds
    const interval = setInterval(() => {
      const currentVitals = this.vitals.get(patientId) || initialVitals;
      const newVitals = this.generateNextVitals(currentVitals);
      this.vitals.set(patientId, newVitals);
      this.emit('vitalsUpdate', { patientId, vitals: newVitals });
    }, 3000);

    this.intervals.set(patientId, interval);
    logger.info(`Started monitoring vitals for patient ${patientId}`);
  }

  // Stop generating vitals for a patient
  stopMonitoring(patientId) {
    const interval = this.intervals.get(patientId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(patientId);
      this.vitals.delete(patientId);
      logger.info(`Stopped monitoring vitals for patient ${patientId}`);
    }
  }

  // Get current vitals for a patient
  getVitals(patientId) {
    return this.vitals.get(patientId) || null;
  }

  // Generate initial random vitals within normal ranges
  generateVitals() {
    return {
      heartRate: Math.floor(Math.random() * 30) + 60, // 60-90 BPM
      oxygenSaturation: Math.floor(Math.random() * 6) + 95, // 95-100%
      temperature: (Math.random() * 1.5) + 36.5, // 36.5-38.0°C
      bloodPressureSys: Math.floor(Math.random() * 20) + 110, // 110-130 mmHg
      bloodPressureDia: Math.floor(Math.random() * 10) + 70, // 70-80 mmHg
      timestamp: new Date()
    };
  }

  // Generate next set of vitals based on previous values
  generateNextVitals(previousVitals) {
    const generateNextValue = (current, min, max, volatility) => {
      const change = (Math.random() * 2 - 1) * volatility;
      return Math.min(max, Math.max(min, current + change));
    };

    return {
      heartRate: Math.round(generateNextValue(previousVitals.heartRate, 60, 100, 2)),
      oxygenSaturation: Math.round(generateNextValue(previousVitals.oxygenSaturation, 90, 100, 0.5)),
      temperature: parseFloat(generateNextValue(previousVitals.temperature, 36.0, 38.0, 0.1).toFixed(1)),
      bloodPressureSys: Math.round(generateNextValue(previousVitals.bloodPressureSys, 90, 140, 3)),
      bloodPressureDia: Math.round(generateNextValue(previousVitals.bloodPressureDia, 60, 90, 2)),
      timestamp: new Date()
    };
  }
}

// Singleton instance
const vitalsService = new VitalsService();
module.exports = vitalsService;
