console.log('Starting simple test...');
require('dotenv').config();
console.log('Environment loaded');
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

try {
  const config = require('./config/config');
  console.log('Config loaded successfully');
} catch (err) {
  console.error('Config error:', err.message);
  process.exit(1);
}
