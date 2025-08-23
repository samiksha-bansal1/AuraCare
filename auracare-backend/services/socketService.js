const { EVENTS, ROOMS, getStandardEventName, getTargetRooms } = require('../constants/socketEvents');
const logger = require('../utils/logger');
const vitalsService = require('./vitalsService');

class SocketService {
  constructor(io) {
    this.io = io;
    this.heartbeatInterval = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.patientRooms = new Map();   // patientId -> Set(socketId)
    this.initialize();
  }

  initialize() {
    if (!this.io) {
      logger.warn('SocketService: io instance not provided');
      return;
    }

    // Start heartbeat
    this.startHeartbeat();

    // Set up connection handling
    this.io.on(EVENTS.CONNECTION, (socket) => {
      logger.info(`Socket connected: ${socket.id} (${socket.userRole} ${socket.userId})`);
      
      // Join appropriate rooms
      this.handleConnection(socket);
      
      // WebRTC Signaling Handlers
      socket.on('webrtc_ready', (roomId) => {
        logger.info(`[WebRTC] Ready signal received in room ${roomId}`);
        socket.to(roomId).emit('webrtc_ready', { from: socket.id });
      });

      socket.on('webrtc_offer', ({ to, sdp, roomId }) => {
        logger.info(`[WebRTC] Offer received in room ${roomId}`);
        socket.to(roomId).emit('webrtc_offer', { from: socket.id, sdp });
      });

      socket.on('webrtc_answer', ({ to, sdp, roomId }) => {
        logger.info(`[WebRTC] Answer received in room ${roomId}`);
        socket.to(roomId).emit('webrtc_answer', { from: socket.id, sdp });
      });

      socket.on('webrtc_ice_candidate', ({ to, candidate, roomId }) => {
        socket.to(roomId).emit('webrtc_ice_candidate', { 
          from: socket.id, 
          candidate 
        });
      });
      
      // Handle user authentication
      socket.on('authenticate', ({ userId, userType }) => {
        this.connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.userType = userType;
        logger.info(`User ${userId} (${userType}) connected with socket ${socket.id}`);
      });

      // Handle patient vitals subscription
      socket.on('subscribeToVitals', ({ patientId }) => {
        if (!socket.userId) {
          logger.warn(`Unauthorized subscription attempt from socket ${socket.id}`);
          return;
        }

        // Join patient's vitals room
        socket.join(`vitals:${patientId}`);
        
        // Start monitoring if not already started
        vitalsService.startMonitoring(patientId);
        
        // Send current vitals immediately
        const currentVitals = vitalsService.getVitals(patientId);
        if (currentVitals) {
          socket.emit('vitalsUpdate', { patientId, vitals: currentVitals });
        }
        
        logger.info(`User ${socket.userId} subscribed to vitals for patient ${patientId}`);
      });

      // Handle unsubscription
      socket.on('unsubscribeFromVitals', ({ patientId }) => {
        socket.leave(`vitals:${patientId}`);
        logger.info(`User ${socket.userId} unsubscribed from vitals for patient ${patientId}`);
      });

      // Set up disconnection handler
      socket.on(EVENTS.DISCONNECT, () => {
        logger.info(`Socket disconnected: ${socket.id}`);
        this.handleDisconnection(socket);
      });
      
      // Set up error handler
      socket.on(EVENTS.ERROR, (error) => {
        logger.error(`Socket error (${socket.id}):`, error);
      });
    });

    // Listen for vitals updates from the vitals service
    vitalsService.on('vitalsUpdate', ({ patientId, vitals }) => {
      this.io.to(`vitals:${patientId}`).emit('vitalsUpdate', { patientId, vitals });
    });

    // Initialize vitals service
    vitalsService.init();

    logger.info('Socket service initialized');
  }

  handleConnection(socket) {
    // Join staff room for staff/doctors
    if (['staff', 'doctor'].includes(socket.userRole)) {
      socket.join(ROOMS.staff);
    }
    
    // Join patient room if user is a patient or has a patientId (family)
    if (socket.userRole === 'patient' || socket.patientId) {
      const patientRoom = ROOMS.patient(socket.patientId || socket.userId);
      socket.join(patientRoom);
    }
  }

  handleDisconnection(socket) {
    // Clean up any room memberships or resources
    // Note: Socket.IO automatically removes socket from rooms on disconnect
    if (socket.userId) {
      this.connectedUsers.delete(socket.userId);
      logger.info(`User ${socket.userId} disconnected`);
    } else {
      logger.info(`Anonymous client disconnected: ${socket.id}`);
    }
  }

  startHeartbeat() {
    // Clear any existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.io.emit(EVENTS.HEARTBEAT, Date.now());
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Emit an event to specific rooms with standardized event handling
   * @param {string} event - The event name (will be standardized)
   * @param {Object} data - The data to send
   * @param {Object} options - Additional options
   * @param {string} [options.patientId] - The patient ID for patient-specific events
   * @param {boolean} [options.includeStaff=true] - Whether to include the staff room
   * @param {string[]} [options.additionalRooms=[]] - Additional rooms to emit to
   * @param {boolean} [options.legacy=true] - Whether to emit legacy events for backward compatibility
   */
  emit(event, data, options = {}) {
    const {
      patientId,
      includeStaff = true,
      additionalRooms = [],
      legacy = true
    } = options;

    const standardEvent = getStandardEventName(event);
    const rooms = [
      ...(includeStaff ? [ROOMS.staff] : []),
      ...(patientId ? [ROOMS.patient(patientId)] : []),
      ...additionalRooms
    ];

    // Emit to all specified rooms
    rooms.forEach(room => {
      if (this.io.sockets.adapter.rooms.has(room)) {
        this.io.to(room).emit(standardEvent, data);
        
        // Emit legacy event if needed
        if (legacy && event !== standardEvent) {
          this.io.to(room).emit(event, data);
        }
      }
    });

    // Log the emission
    logger.debug(`Emitted event: ${standardEvent} to rooms: ${rooms.join(', ')}`);
  }

  /**
   * Get all connected clients in a room
   * @param {string} room - The room name
   * @returns {string[]} Array of socket IDs
   */
  getClientsInRoom(room) {
    const roomSockets = this.io.sockets.adapter.rooms.get(room);
    return roomSockets ? Array.from(roomSockets) : [];
  }

  // Get socket by user ID
  getSocketByUserId(userId) {
    const socketId = this.connectedUsers.get(userId);
    if (!socketId) return null;
    return this.io.sockets.sockets.get(socketId);
  }
}

// Singleton instance
let instance = null;

module.exports = {
  init(io) {
    if (!instance && io) {
      instance = new SocketService(io);
    }
    return instance;
  },
  
  getInstance() {
    if (!instance) {
      throw new Error('SocketService not initialized');
    }
    return instance;
  },
  
  // Re-export constants for convenience
  EVENTS: EVENTS,
  ROOMS: ROOMS
};
