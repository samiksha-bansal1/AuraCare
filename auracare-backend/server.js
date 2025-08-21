require('module-alias/register');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const config = require('@/config/config');
const { auditMiddleware } = require('@/utils/auditLogger');
const { init: initSocketService } = require('@/services/socketService');
const { initVitalsPoller } = require('@/services/vitalsPoller');
const logger = require('@/utils/logger');
const rateLimit = require("express-rate-limit");
const axios = require("axios"); // Import axios
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patients");
const familyRoutes = require("./routes/family");
const alertRoutes = require("./routes/alerts");
const patientRequestRoutes = require("./routes/patientRequests");
const historyRoutes = require("./routes/history");
const mediaRoutes = require("./routes/media");
const noteRoutes = require("./routes/notes");
const reportRoutes = require("./routes/reports");
const roomSettingRoutes = require("./routes/roomSettings");
const emotionRoutes = require("./routes/emotions");
const { initGridFS } = require("./storage/gridfs");
const { authenticateSocket } = require("./middleware/authMiddleware");

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: config.cors.origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  },
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  cookie: false
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Make io available to routes
app.set('io', io);

// Initialize GridFS
initGridFS();

// API Routes
const routes = [
  { path: '/api/auth', router: require('@/routes/auth') },
  { path: '/api/patients', router: require('@/routes/patients') },
  { path: '/api/family', router: require('@/routes/family') },
  { path: '/api/alerts', router: require('@/routes/alerts') },
  { path: '/api/patient-requests', router: require('@/routes/patientRequests') },
  { path: '/api/history', router: require('@/routes/history') },
  { path: '/api/media', router: require('@/routes/media') },
  { path: '/api/notes', router: require('@/routes/notes') },
  { path: '/api/reports', router: require('@/routes/reports') },
  { path: '/api/room-settings', router: require('@/routes/roomSettings') },
  { path: '/api/emotions', router: require('@/routes/emotions') }
];

// Register routes
routes.forEach(route => {
  app.use(route.path, route.router);
  logger.info(`Registered route: ${route.path}`);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Not Found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;
  
  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Socket.IO authentication middleware
io.use(authenticateSocket);

// Initialize socket service
const socketService = initSocketService(io);

// Initialize vitals poller with socket service only if enabled
if (config.features.vitalsPoller.enabled) {
  initVitalsPoller(io, socketService);
  logger.info('Vitals poller enabled');
} else {
  logger.info('Vitals poller disabled');
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(
    `[v0] User connected: ${socket.userId}, Role: ${socket.userRole}`
  );

  // Room joining is now handled by the socket service
  // The socket service will automatically join the appropriate rooms
  // based on the user's role and patientId
  socketService.joinRooms(socket);

  // Handle vital signs updates (from medical devices)
  socket.on("vital_signs_update", (data) => {
    if (socket.userRole === "staff") {
      // Broadcast to patient and family rooms
      socket.to(`patient_${data.patientId}`).emit("vital_signs", data);
      socket.to(`family_${data.patientId}`).emit("vital_signs", data);

      // Send to AI service for analysis
      analyzeVitalSigns(data);
    }
  });

  // Handle family content sharing
  socket.on("share_content", (data) => {
    if (socket.userRole === "family") {
      socket.to(`patient_${socket.patientId}`).emit("new_content", data);
      socket.to("staff_room").emit("family_content_shared", data);
    }
  });

  // --- WebRTC signaling ---
  // Clients should compute a roomId (e.g., `patient_<patientId>`) and join it.
  socket.on("join_room", ({ roomId }) => {
    if (!roomId) return;
    socket.join(roomId);
    console.log(`[v0] ${socket.userId} joined room ${roomId}`);
  });

  // Notify peers that a viewer is ready so publisher can create an offer
  socket.on("webrtc_ready", ({ roomId }) => {
    if (!roomId) return;
    socket.to(roomId).emit("webrtc_ready", { from: socket.userId });
  });

  // Forward SDP offer to peers in the room
  socket.on("webrtc_offer", ({ roomId, sdp }) => {
    if (!roomId || !sdp) return;
    socket.to(roomId).emit("webrtc_offer", { from: socket.userId, sdp });
  });

  // Forward SDP answer to peers in the room
  socket.on("webrtc_answer", ({ roomId, sdp }) => {
    if (!roomId || !sdp) return;
    socket.to(roomId).emit("webrtc_answer", { from: socket.userId, sdp });
  });

  // Forward ICE candidates to peers in the room
  socket.on("webrtc_ice_candidate", ({ roomId, candidate }) => {
    if (!roomId || !candidate) return;
    socket.to(roomId).emit("webrtc_ice_candidate", { from: socket.userId, candidate });
  });

  socket.on("disconnect", () => {
    console.log(`[v0] User disconnected: ${socket.userId}`);
  });
});

// AI Analysis function (mock implementation)
async function analyzeVitalSigns(vitalSigns) {
  try {
    // In production, this would call the Python FastAPI service
    const response = await axios.post(
      `${process.env.AI_SERVICE_URL}/analyze`,
      vitalSigns
    );

    if (response.data.alert) {
      // Emit alert to staff
      io.to("staff_room").emit("critical_alert", response.data);
    }

    if (response.data.emotionData) {
      // Store emotion data and emit to family
      io.to(`family_${vitalSigns.patientId}`).emit(
        "emotion_update",
        response.data.emotionData
      );
    }
  } catch (error) {
    console.error("[v0] AI Analysis error:", error.message);
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Health check under /api for clients using baseURL '/api'
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[v0] Error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server with retry if port is in use
const BASE_PORT = Number(config.port) || 5000;
const MAX_PORT_RETRY = 5; // try up to 5 successive ports

function startServer(port, attemptsLeft) {
  const onListening = () => {
    logger.info(`Server is running in ${config.env} mode on port ${port}`);
    logger.info(`CORS allowed origins: ${config.cors.origins.join(', ')}`);
    logger.info(`Vitals poller ${config.features.vitalsPoller.enabled ? 'enabled' : 'disabled'}`);
    logger.info(`Alert simulator ${config.features.alertSimulator ? 'enabled' : 'disabled'}`);
    // Remove the error handler once listening succeeded to avoid leaks
    server.removeListener('error', onError);
  };

  const onError = (err) => {
    if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      logger.error(`Port ${port} is in use. Trying port ${port + 1}...`);
      server.removeListener('listening', onListening);
      // Try next port with the same server instance
      startServer(port + 1, attemptsLeft - 1);
    } else {
      logger.error('Failed to start server:', err);
      process.exit(1);
    }
  };

  server.once('listening', onListening);
  server.once('error', onError);
  server.listen(port);
}

startServer(BASE_PORT, MAX_PORT_RETRY);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Consider restarting the process in production
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Consider restarting the process in production
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
