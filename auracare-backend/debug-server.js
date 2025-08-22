// Debug script to find the exact crash point
console.log('=== DEBUG SERVER START ===');

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  console.error('STACK:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});

try {
  console.log('1. Loading dotenv...');
  require('dotenv').config();
  
  console.log('2. Loading express...');
  const express = require('express');
  
  console.log('3. Loading server modules...');
  const http = require('http');
  const socketIo = require('socket.io');
  const cors = require('cors');
  
  console.log('4. Creating express app...');
  const app = express();
  
  console.log('5. Loading config...');
  const config = require('./config/config');
  
  console.log('6. Loading middleware...');
  const { authenticate } = require('./middleware/authMiddleware');
  
  console.log('7. Loading routes...');
  const patientRoutes = require('./routes/patients');
  
  console.log('8. Setting up middleware...');
  app.use(express.json());
  app.use(cors());
  
  console.log('9. Setting up routes...');
  app.use('/api/patients', patientRoutes);
  
  console.log('10. Creating server...');
  const server = http.createServer(app);
  
  console.log('11. Starting server...');
  server.listen(5000, () => {
    console.log('✅ Server started successfully on port 5000');
  });
  
} catch (error) {
  console.error('❌ ERROR CAUGHT:', error.message);
  console.error('STACK:', error.stack);
}
