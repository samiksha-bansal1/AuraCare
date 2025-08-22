// Minimal server to isolate the crash
const express = require('express');
const cors = require('cors');
const { authenticate, authorize } = require('./middleware/authMiddleware');

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

// Try to load patients route
try {
  const patientRoutes = require('./routes/patients');
  app.use('/api/patients', patientRoutes);
  console.log('✅ Patient routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading patient routes:', error.message);
  console.error('Stack:', error.stack);
}

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
});
