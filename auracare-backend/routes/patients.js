const express = require("express")
const Joi = require("joi")
const axios = require("axios")
const Patient = require("../models/Patient")
const EmotionData = require("../models/EmotionData")
const { authenticate, authorize } = require("../middleware/authMiddleware")

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// Register a new patient (staff and admin only)
router.post('/register', (req, res, next) => {
  console.log('Register patient route hit');
  console.log('Request body:', req.body);
  next();
}, authorize('staff', 'admin'), async (req, res) => {
  try {
    const patientSchema = Joi.object({
      patientId: Joi.string().required(),
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      age: Joi.number().min(0).max(150).required(),
      condition: Joi.string().required(),
      roomNumber: Joi.string().default('101')
    });

    const { error } = patientSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { patientId, name, email, age, condition, roomNumber } = req.body;

    // Check if patient ID already exists
    const existingPatient = await Patient.findOne({ patientId });
    if (existingPatient) {
      return res.status(400).json({ error: 'Patient ID already exists' });
    }

    // Check if room is already occupied
    const roomOccupied = await Patient.findOne({ 
      roomNumber,
      isActive: true 
    });
    
    if (roomOccupied) {
      return res.status(400).json({ 
        error: 'Room is already occupied by another patient' 
      });
    }

    // Create new patient
    const patient = new Patient({
      patientId,
      name,
      email: email.toLowerCase().trim(),
      age,
      condition,
      roomNumber,
      admissionDate: new Date(),
      isActive: true
    });

    await patient.save();

    // Remove sensitive data from response
    const patientResponse = patient.toObject();
    delete patientResponse.__v;

    res.status(201).json({
      message: 'Patient registered successfully',
      patient: patientResponse
    });
  } catch (error) {
    console.error('Patient registration error:', error);
    res.status(500).json({ error: 'Failed to register patient' });
  }
});

// Get all patients (staff, nurse and admin only)
router.get("/", authorize("staff", "nurse", "admin"), async (req, res) => {
  try {
    const patients = await Patient.find({ isActive: true })
      .populate("assignedStaff", "name role")
      .populate("familyMembers", "name relationship isApproved")
      .sort({ admissionDate: -1 })

    res.json(patients)
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
})

// Get specific patient details
router.get("/:id", async (req, res) => {
  try {
    let patient;
    
    // Check if the id is a MongoDB ObjectId or a patientId string
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a MongoDB ObjectId
      patient = await Patient.findById(req.params.id)
        .populate("assignedStaff", "name role department")
        .populate("familyMembers", "name relationship isApproved")
    } else {
      // It's a patientId string (like "PAT001")
      patient = await Patient.findOne({ patientId: req.params.id })
        .populate("assignedStaff", "name role department")
        .populate("familyMembers", "name relationship isApproved")
    }

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" })
    }

    // Authorization check
    if (req.userRole === "family") {
      const familyMember = patient.familyMembers.find((fm) => fm._id.toString() === req.user._id.toString())
      if (!familyMember || !familyMember.isApproved) {
        return res.status(403).json({ error: "Access denied" })
      }
    }

    res.json(patient)
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
})

// Get patient vital signs from external FastAPI service
router.get("/:id/vitals", async (req, res) => {
  try {
    let patient;
    
    // Check if the id is a MongoDB ObjectId or a patientId string
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a MongoDB ObjectId
      patient = await Patient.findById(req.params.id)
    } else {
      // It's a patientId string (like "PAT001")
      patient = await Patient.findOne({ patientId: req.params.id })
    }

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" })
    }

    // Authorization check for family members
    if (req.userRole === "family") {
      const familyMember = patient.familyMembers.find((fm) => fm._id.toString() === req.user._id.toString())
      if (!familyMember || !familyMember.isApproved) {
        return res.status(403).json({ error: "Access denied" })
      }
    }

    // Get room number from patient data (assuming it's stored in patient document)
    const roomNumber = patient.roomNumber || "101" // Default room number if not set

    try {
      // Fetch vital signs from external FastAPI service
      const response = await axios.get(`${process.env.FASTAPI_SERVICE_URL}/vitals/${roomNumber}`, {
        timeout: 5000 // 5 second timeout
      })

      const vitalSigns = response.data

      res.json({
        patientId: patient.patientId,
        patientName: patient.name,
        roomNumber: roomNumber,
        vitalSigns: vitalSigns,
        source: "external_api",
        lastUpdated: vitalSigns.timestamp || new Date().toISOString()
      })

    } catch (apiError) {
      console.error("FastAPI service error:", apiError.message)
      
      // Fallback to dummy data if external API fails
      const dummyVitalSigns = generateDummyVitalSigns(roomNumber)
      
      res.json({
        patientId: patient.patientId,
        patientName: patient.name,
        roomNumber: roomNumber,
        vitalSigns: dummyVitalSigns,
        source: "dummy_data",
        lastUpdated: dummyVitalSigns.timestamp,
        note: "Using dummy data due to external API unavailability"
      })
    }

  } catch (error) {
    console.error("Vital signs error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Update patient vital signs (staff and admin only) - This now updates the external service
router.put("/:id/vitals", authorize("staff", "admin"), async (req, res) => {
  try {
    const vitalSignsSchema = Joi.object({
      heartRate: Joi.number().min(0).max(300),
      bloodPressure: Joi.object({
        systolic: Joi.number().min(0).max(300),
        diastolic: Joi.number().min(0).max(200),
      }),
      oxygenSaturation: Joi.number().min(0).max(100),
      temperature: Joi.number().min(90).max(110),
      respiratoryRate: Joi.number().min(0).max(60),
    })

    const { error } = vitalSignsSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }

    let patient;
    
    // Check if the id is a MongoDB ObjectId or a patientId string
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a MongoDB ObjectId
      patient = await Patient.findById(req.params.id)
    } else {
      // It's a patientId string (like "PAT001")
      patient = await Patient.findOne({ patientId: req.params.id })
    }

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" })
    }

    const roomNumber = patient.roomNumber || "101"

    try {
      // Update vital signs in external FastAPI service
      const response = await axios.put(`${process.env.FASTAPI_SERVICE_URL}/vitals/${roomNumber}`, {
        ...req.body,
        timestamp: new Date().toISOString()
      }, {
        timeout: 5000
      })

      res.json({
        message: "Vital signs updated successfully in external service",
        roomNumber: roomNumber,
        vitalSigns: response.data,
        source: "external_api"
      })

    } catch (apiError) {
      console.error("FastAPI service error:", apiError.message)
      
      // Fallback: Store in local database if external API fails
      patient.vitalSigns = {
        ...req.body,
        lastUpdated: new Date(),
      }
      await patient.save()

      res.json({
        message: "Vital signs updated in local database (external service unavailable)",
        roomNumber: roomNumber,
        vitalSigns: patient.vitalSigns,
        source: "local_database",
        note: "External API unavailable, data stored locally"
      })
    }

  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
})

// Get patient's emotion history
router.get("/:id/emotions", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" })
    }

    // Authorization check for family members
    if (req.userRole === "family") {
      const familyMember = patient.familyMembers.find((fm) => fm._id.toString() === req.user._id.toString())
      if (!familyMember) {
        return res.status(403).json({ error: "Access denied" })
      }
    }

    const emotions = await EmotionData.find({ patientId: req.params.id }).sort({ timestamp: -1 }).limit(50)

    res.json(emotions)
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
})

// Deactivate/activate patient (admin only)
router.put("/:id/deactivate", authorize("admin"), async (req, res) => {
  try {
    let patient;
    
    // Check if the id is a MongoDB ObjectId or a patientId string
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findById(req.params.id);
    } else {
      patient = await Patient.findOne({ patientId: req.params.id });
    }

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    patient.isActive = !patient.isActive;
    await patient.save();

    res.json({ 
      message: `Patient ${patient.isActive ? 'activated' : 'deactivated'} successfully`,
      patient: {
        id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        condition: patient.condition,
        roomNumber: patient.roomNumber,
        isActive: patient.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Helper function to generate dummy vital signs data
function generateDummyVitalSigns(roomNumber) {
  const baseValues = {
    "101": { heartRate: 72, systolic: 120, diastolic: 80, oxygen: 98, temp: 98.6, resp: 16 },
    "102": { heartRate: 85, systolic: 135, diastolic: 85, oxygen: 96, temp: 99.1, resp: 18 },
    "103": { heartRate: 68, systolic: 115, diastolic: 75, oxygen: 99, temp: 98.2, resp: 14 },
    "104": { heartRate: 92, systolic: 145, diastolic: 90, oxygen: 94, temp: 100.2, resp: 20 },
    "105": { heartRate: 78, systolic: 125, diastolic: 82, oxygen: 97, temp: 98.8, resp: 17 }
  }

  const base = baseValues[roomNumber] || baseValues["101"]
  
  // Add some realistic variation
  const variation = 0.1 // 10% variation
  const randomVariation = (value) => {
    const change = (Math.random() - 0.5) * 2 * variation * value
    return Math.round((value + change) * 10) / 10
  }

  return {
    heartRate: randomVariation(base.heartRate),
    bloodPressure: {
      systolic: randomVariation(base.systolic),
      diastolic: randomVariation(base.diastolic)
    },
    oxygenSaturation: randomVariation(base.oxygen),
    temperature: randomVariation(base.temp),
    respiratoryRate: randomVariation(base.resp),
    timestamp: new Date().toISOString(),
    roomNumber: roomNumber,
    status: "normal" // normal, warning, critical
  }
}

// Import additional models for nested routes
const ProgressNote = require('../models/ProgressNote');
const AuditLog = require('../models/AuditLog');

// Notes routes nested under patients
// POST /api/patients/:id/notes
router.post('/:id/notes', authenticate, authorize(['staff', 'nurse', 'doctor']), async (req, res) => {
  try {
    const { text, visibility = 'staff', tags = [] } = req.body;
    const note = new ProgressNote({
      patientId: req.params.id,
      author: {
        id: req.user._id,
        model: req.user.role === 'doctor' ? 'Doctor' : 'Staff',
        name: req.user.name
      },
      text,
      visibility,
      tags: [...new Set(tags.map(t => t.toLowerCase().trim()))]
    });

    await note.save();

    // Log the action
    await AuditLog.create({
      action: 'create',
      entity: 'ProgressNote',
      entityId: note._id,
      patientId: req.params.id,
      performedBy: { id: req.user._id, role: req.user.role, name: req.user.name },
      timestamp: new Date()
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// GET /api/patients/:id/notes
router.get('/:id/notes', authenticate, authorize(['staff', 'nurse', 'doctor', 'family']), async (req, res) => {
  try {
    const { id } = req.params;
    const query = { patientId: id };
    
    // Family can only see notes marked as visible to family
    if (req.userRole === 'family') {
      query.visibility = 'family';
    }

    const notes = await ProgressNote.find(query)
      .sort({ createdAt: -1 })
      .populate('author.id', 'name');
      
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Media routes nested under patients
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const Media = require('../models/Media');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg', 'audio/wav',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// POST /api/patients/:id/media
router.post('/:id/media', authenticate, authorize(['staff', 'nurse', 'doctor', 'family']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, description, type } = req.body;
    const patientId = req.params.id;

    // Create GridFS bucket
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });

    // Upload file to GridFS
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      metadata: {
        patientId,
        uploadedBy: req.user._id,
        uploadedByRole: req.user.role,
        title: title || req.file.originalname,
        description: description || '',
        type: type || req.file.mimetype,
        originalName: req.file.originalname,
        size: req.file.size
      }
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', async () => {
      try {
        // Save media record
        const media = new Media({
          patientId,
          title: title || req.file.originalname,
          description: description || '',
          type: type || req.file.mimetype,
          filename: req.file.originalname,
          gridfsId: uploadStream.id,
          size: req.file.size,
          uploadedBy: {
            id: req.user._id,
            role: req.user.role,
            name: req.user.name
          }
        });

        await media.save();
        res.status(201).json(media);
      } catch (error) {
        console.error('Error saving media record:', error);
        res.status(500).json({ error: 'Failed to save media record' });
      }
    });

    uploadStream.on('error', (error) => {
      console.error('GridFS upload error:', error);
      res.status(500).json({ error: 'File upload failed' });
    });

  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

// GET /api/patients/:id/media
router.get('/:id/media', authenticate, authorize(['staff', 'nurse', 'doctor', 'family']), async (req, res) => {
  try {
    const media = await Media.find({ patientId: req.params.id })
      .sort({ createdAt: -1 })
      .populate('uploadedBy.id', 'name');
      
    res.json(media);
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

module.exports = router
