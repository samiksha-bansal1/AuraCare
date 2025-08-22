require('dotenv').config();

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expire: process.env.JWT_EXPIRE || '30d',
    cookieExpire: process.env.JWT_COOKIE_EXPIRE || 30,
  },
  
  // Database
  db: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/auracare',
  },
  
  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) : 
      ['http://localhost:5173', 'http://localhost:3000']
  },
  
  // Feature Flags
  features: {
    alertSimulator: process.env.ALERT_SIMULATOR === 'on',
    vitalsPoller: {
      // Enable only if explicitly turned on in env
      enabled: (() => {
        const v = (process.env.VITALS_POLLER_ENABLED || 'off').toLowerCase();
        return ['on', 'true', '1', 'yes'].includes(v);
      })(),
      interval: parseInt(process.env.VITALS_POLLER_INTERVAL_MS || '3000', 10)
    }
  },
  
  // External Services
  services: {
    fastapi: {
      baseUrl: process.env.AI_SERVICE_URL || process.env.FASTAPI_BASE_URL || 'http://localhost:8000'
    }
  },
  
  // GridFS Configuration
  gridfs: {
    bucket: process.env.GRIDFS_BUCKET || 'uploads',
    baseUrl: process.env.GRIDFS_BASE_URL || '/api/media'
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Validate required configuration
const requiredConfig = [
  'JWT_SECRET',
  'MONGO_URI'
];

requiredConfig.forEach(key => {
  if (!process.env[key] && process.env.NODE_ENV !== 'test') {
    console.error(`FATAL ERROR: ${key} is not defined`);
    console.error(`Available env vars: ${Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('JWT')).join(', ')}`);
    process.exit(1);
  }
});

module.exports = config;
