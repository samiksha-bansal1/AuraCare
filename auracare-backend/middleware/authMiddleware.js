const jwt = require("jsonwebtoken")
const Staff = require("../models/Staff")
const FamilyMember = require("../models/FamilyMember")
const Patient = require("../models/Patient")

// HTTP Authentication Middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided." })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    let user
    if (decoded.role === "staff" || decoded.role === "nurse") {
      user = await Staff.findById(decoded.id).select("-password")
    } else if (decoded.role === "family") {
      user = await FamilyMember.findById(decoded.id).select("-password")
    } else if (decoded.role === "patient") {
      user = await Patient.findById(decoded.id).select("-password")
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid token." })
    }

    req.user = user
    req.userRole = decoded.role
    next()
  } catch (error) {
    res.status(401).json({ error: "Invalid token." })
  }
}

// Socket.IO Authentication Middleware
const authenticateSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to socket
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    socket.user = decoded; // Keep for backward compatibility
    
    // For family members, attach the patientId they have access to
    if (decoded.role === 'family' && decoded.patientId) {
      socket.patientId = decoded.patientId;
    }
    
    // For patients, their ID is the patient ID
    if (decoded.role === 'patient') {
      socket.patientId = decoded.id;
      socket.patientCode = decoded.patientCode; // If available
    }
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
}

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." })
    }
    next()
  }
}

module.exports = { authenticate, authenticateSocket, authorize }
