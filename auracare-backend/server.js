// server.js
console.log("🚀 Starting server.js ...");

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection:", reason);
});

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
const axios = require("axios");
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

// Determine PORT
const PORT = process.env.PORT || config.port || 5000;

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: false,
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  perMessageDeflate: {
    threshold: 1024,
    zlibDeflateOptions: {
      chunkSize: 8 * 1024
    }
  }
});

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log(`[v0] MongoDB Connected: ${config.dbHost || '127.0.0.1'}`);
    initGridFS(); // Initialize GridFS after DB is ready

    // Start server
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err);
    process.exit(1);
  });

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS ? 
    process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).concat(['http://localhost:5174']) : 
    ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Make io available to routes
app.set('io', io);

// API Routes
const routes = [
  { path: '/api/auth', router: authRoutes },
  { path: '/api/patients', router: patientRoutes },
  { path: '/api/family', router: familyRoutes },
  { path: '/api/alerts', router: alertRoutes },
  { path: '/api/patient-requests', router: patientRequestRoutes },
  { path: '/api/history', router: historyRoutes },
  { path: '/api/media', router: mediaRoutes },
  { path: '/api/notes', router: noteRoutes },
  { path: '/api/reports', router: reportRoutes },
  { path: '/api/room-settings', router: roomSettingRoutes },
  { path: '/api/emotions', router: emotionRoutes },
];

// Register routes
routes.forEach(route => {
  app.use(route.path, route.router);
  logger.info(`Registered route: ${route.path}`);
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Not Found', path: req.path });
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

// Socket.IO authentication
io.use(authenticateSocket);

// Initialize socket service
const socketService = initSocketService(io);

// Initialize vitals poller
if (config.features.vitalsPoller.enabled) {
  initVitalsPoller(io, socketService);
  logger.info('Vitals poller enabled');
} else {
  logger.info('Vitals poller disabled');
}

// Socket.IO connection handling is now handled by the socketService
// The socketService.initialize() method already sets up connection handling

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV === 'production') process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  if (process.env.NODE_ENV === 'production') process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});