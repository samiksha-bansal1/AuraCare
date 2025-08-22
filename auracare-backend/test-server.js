// Simple test to find the crash cause
console.log('Starting test...');

try {
  require('dotenv').config();
  console.log('✅ dotenv loaded');
  
  const express = require('express');
  console.log('✅ express loaded');
  
  const connectDB = require('./config/db');
  console.log('✅ db config loaded');
  
  const patientRoutes = require('./routes/patients');
  console.log('✅ patient routes loaded');
  
  console.log('All modules loaded successfully');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
