require('module-alias/register');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require("express-rate-limit");
const axios = require("axios");
require("dotenv").config();

const config = require('@/config/config');
const { auditMiddleware } = require('@/utils/auditLogger');
const { init: initSocketService } = require('@/services/socketService');
const { initVitalsPoller } = require('@/services/vitalsPoller');
const connectDB = require("./config/db");
const { initGridFS } = require("./storage/gridfs");
const { authenticateSocket } = require("./middleware/authMiddleware");

const app = express();
const server = http.createServer(app);

console.log("=== Starting Server Debug ===");

// Connect to MongoDB
try {
    connectDB().then(() => console.log("[DB] MongoDB connected"))
               .catch(err => console.error("[DB] Connection error:", err));
} catch (err) {
    console.error("[DB] Exception:", err);
}

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 100 });
app.use(limiter);

app.set('io', socketIo(server, {
    cors: { origin: config.cors?.origins || "*", methods: ['GET','POST','PUT','DELETE','PATCH'], credentials: true },
    pingTimeout: 60000,
    pingInterval: 25000,
    cookie: false
}));

// Initialize GridFS
try {
    initGridFS();
    console.log("[GridFS] Initialized");
} catch (err) {
    console.error("[GridFS] Error:", err);
}

// Register API routes
const routes = [
    { path: '/api/auth', router: require('./routes/auth') },
    { path: '/api/patients', router: require('./routes/patients') },
    { path: '/api/family', router: require('./routes/family') },
    { path: '/api/staff', router: require('./routes/staff') },
    { path: '/api/alerts', router: require('./routes/alerts') },
    { path: '/api/patient-requests', router: require('./routes/patientRequests') },
    { path: '/api/history', router: require('./routes/history') },
    { path: '/api/media', router: require('./routes/media') },
    { path: '/api/notes', router: require('./routes/notes') },
    { path: '/api/reports', router: require('./routes/reports') },
    { path: '/api/room-settings', router: require('./routes/roomSettings') },
    { path: '/api/emotions', router: require('./routes/emotions') }
];

routes.forEach(route => {
    try {
        app.use(route.path, route.router);
        console.log(`[Routes] Registered: ${route.path}`);
    } catch (err) {
        console.error(`[Routes] Error registering ${route.path}:`, err);
    }
});

// Health endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ status: 'error', message: 'Not Found', path: req.path });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("[ErrorHandler] Unhandled error:", err);
    res.status(err.statusCode || 500).json({ status: 'error', message: err.message || 'Internal Server Error' });
});

// Socket.IO setup
const io = app.get('io');
io.use(authenticateSocket);

let socketService;
try {
    socketService = initSocketService(io);
    console.log("[Socket] Service initialized");
} catch (err) {
    console.error("[Socket] Initialization error:", err);
}

if (config.features?.vitalsPoller?.enabled) {
    try {
        initVitalsPoller(io, socketService);
        console.log("[VitalsPoller] Enabled");
    } catch (err) {
        console.error("[VitalsPoller] Error:", err);
    }
} else {
    console.log("[VitalsPoller] Disabled");
}

// Socket.IO connection
io.on("connection", (socket) => {
    console.log(`[Socket] User connected: ${socket.userId} (${socket.userRole})`);
    try { socketService.joinRooms(socket); } catch(e){ console.error("[Socket] joinRooms error:", e); }

    socket.on("disconnect", () => console.log(`[Socket] User disconnected: ${socket.userId}`));
});

// Start server
const PORT = Number(config.port) || 5000;
server.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));

// Handle uncaught exceptions & unhandled rejections
process.on('unhandledRejection', (reason, promise) => console.error("[Rejection] Unhandled Rejection:", reason, promise));
process.on('uncaughtException', (err) => console.error("[Exception] Uncaught Exception:", err));
process.on('SIGTERM', () => { console.log("[Server] SIGTERM received, shutting down"); server.close(() => process.exit(0)); });
