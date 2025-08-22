require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Simple auth middleware
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  // Skip JWT verification for now, just pass through
  req.user = { _id: '507f1f77bcf86cd799439011', name: 'Test User', role: 'nurse' };
  req.userRole = 'nurse';
  next();
};

const authorize = (roles) => (req, res, next) => {
  if (roles.includes(req.userRole)) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
};

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server working' });
});

// Patients route
app.get('/api/patients', authenticate, authorize(['nurse', 'staff', 'admin']), (req, res) => {
  res.json([
    {
      _id: '507f1f77bcf86cd799439011',
      name: 'John Doe',
      patientId: 'P001',
      roomNumber: '101'
    }
  ]);
});

// Notes routes
app.post('/api/patients/:id/notes', authenticate, authorize(['nurse', 'staff', 'doctor']), (req, res) => {
  const { text, visibility } = req.body;
  res.status(201).json({
    _id: '507f1f77bcf86cd799439012',
    patientId: req.params.id,
    text,
    visibility,
    author: { name: req.user.name },
    createdAt: new Date()
  });
});

app.get('/api/patients/:id/notes', authenticate, authorize(['nurse', 'staff', 'doctor', 'family']), (req, res) => {
  res.json([]);
});

// Media routes
app.post('/api/patients/:id/media', authenticate, authorize(['nurse', 'staff', 'doctor', 'family']), (req, res) => {
  res.status(201).json({
    _id: '507f1f77bcf86cd799439013',
    patientId: req.params.id,
    title: 'Test Document',
    filename: 'test.pdf',
    createdAt: new Date()
  });
});

app.get('/api/patients/:id/media', authenticate, authorize(['nurse', 'staff', 'doctor', 'family']), (req, res) => {
  res.json([]);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Simple server running on port ${PORT}`);
  console.log('🔗 Test at: http://localhost:5000/test');
});
