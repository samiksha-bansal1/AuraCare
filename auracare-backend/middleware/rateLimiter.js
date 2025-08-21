const rateLimit = require('express-rate-limit');
const { RateLimitError } = require('@/utils/errors');
const logger = require('@/utils/logger');

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message = 'Too many requests, please try again later') => {
  return rateLimit({
    windowMs, // Time window in milliseconds
    max, // Max requests per window
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: (req) => {
      // Create a unique key for each client (IP + user ID if authenticated)
      return req.user ? `${req.user.id}_${req.ip}` : req.ip;
    },
    handler: (req, res, next, options) => {
      const err = new RateLimitError(message);
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, User: ${req.user?.id || 'anonymous'}`);
      next(err);
    },
    // Skip rate limiting for certain paths or in development
    skip: (req) => {
      // Skip rate limiting for health checks and in development
      return (
        req.path === '/health' || 
        process.env.NODE_ENV === 'test' ||
        // Add any other paths to exclude from rate limiting
        req.path.startsWith('/api/health')
      );
    },
  });
};

// Different rate limiters for different routes
const authLimiter = createRateLimiter(15 * 60 * 1000, 100, 'Too many login attempts, please try again after 15 minutes');
const apiLimiter = createRateLimiter(15 * 60 * 1000, 1000);
const strictLimiter = createRateLimiter(60 * 60 * 1000, 100, 'Too many requests, please try again in an hour');

// Socket.IO rate limiting middleware
const socketRateLimiter = (io) => {
  const socketRateLimits = new Map();
  const WINDOW_MS = 60000; // 1 minute
  const MAX_EVENTS = 100; // Max events per minute per socket

  return (socket, next) => {
    const socketId = socket.id;
    const now = Date.now();
    
    // Initialize rate limit data for this socket
    if (!socketRateLimits.has(socketId)) {
      socketRateLimits.set(socketId, {
        count: 0,
        resetTime: now + WINDOW_MS,
      });
    }

    const limitData = socketRateLimits.get(socketId);

    // Reset the counter if the window has passed
    if (now > limitData.resetTime) {
      limitData.count = 0;
      limitData.resetTime = now + WINDOW_MS;
    }

    // Increment the counter
    limitData.count++;

    // Check if the rate limit is exceeded
    if (limitData.count > MAX_EVENTS) {
      const err = new RateLimitError('Too many socket events, please slow down');
      logger.warn(`Socket rate limit exceeded for socket ${socketId}, User: ${socket.userId || 'unknown'}`);
      return next(err);
    }

    // Clean up old rate limit data
    socket.on('disconnect', () => {
      socketRateLimits.delete(socketId);
    });

    next();
  };
};

module.exports = {
  authLimiter,
  apiLimiter,
  strictLimiter,
  socketRateLimiter,
  createRateLimiter,
};
