// Debug script to identify server startup issues
require('dotenv').config();

console.log('=== Environment Variables ===');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

console.log('\n=== Testing Basic Imports ===');
try {
  console.log('Loading express...');
  const express = require('express');
  console.log('✓ Express loaded');

  console.log('Loading mongoose...');
  const mongoose = require('mongoose');
  console.log('✓ Mongoose loaded');

  console.log('Loading config...');
  const config = require('./config/config');
  console.log('✓ Config loaded');

  console.log('Loading database connection...');
  const connectDB = require('./config/db');
  console.log('✓ Database connection loaded');

  console.log('\n=== Testing Database Connection ===');
  connectDB().then(() => {
    console.log('✓ Database connection successful');
    mongoose.disconnect();
  }).catch(err => {
    console.error('✗ Database connection failed:', err.message);
  });

} catch (error) {
  console.error('✗ Import error:', error.message);
  console.error('Stack:', error.stack);
}
