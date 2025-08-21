const winston = require('winston');
const { combine, timestamp, printf, colorize, json } = winston.format;
const config = require('@/config/config');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for different log levels
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Custom format for console logging
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  // Add stack trace if it's an error
  if (stack) {
    log += `\n${stack}`;
  }
  
  // Add additional metadata if present
  const metaKeys = Object.keys(meta);
  if (metaKeys.length > 0) {
    log += `\n${JSON.stringify(meta, null, 2)}`;
  }
  
  return log;
});

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level || 'info',
  levels,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production' ? json() : colorize(),
    consoleFormat
  ),
  defaultMeta: { service: 'auracare-backend' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        consoleFormat
      )
    }),
    // Error logs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Create a stream for morgan
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;
