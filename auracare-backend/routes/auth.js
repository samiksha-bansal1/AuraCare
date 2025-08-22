const express = require("express");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const Staff = require("../models/Staff");
const FamilyMember = require("../models/FamilyMember");
const Patient = require("../models/Patient");

const router = express.Router();

// Unified login validation schema
const unifiedLoginSchema = Joi.object({
  type: Joi.string().valid('patient', 'nurse', 'family', 'admin').required(),
  id: Joi.string().when('type', {
    is: 'patient',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  name: Joi.string().when('type', {
    is: 'patient',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  password: Joi.string().when('type', {
    is: Joi.string().valid('nurse', 'family', 'admin'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  patientId: Joi.string().when('type', {
    is: 'family',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  email: Joi.string().when('type', {
    is: Joi.string().valid('nurse', 'family', 'admin'),
    then: Joi.string().email({ tlds: { allow: false } }).required(),
    otherwise: Joi.optional()
  })
});

// Unified Login Route
router.post("/login", async (req, res) => {
  try {
    console.log('Login request body:', req.body);
    const { error } = unifiedLoginSchema.validate(req.body);
    if (error) {
      console.log('Validation error:', error.details);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { type, id, name, password, patientId, email } = req.body;

    switch (type) {
      case 'patient':
        // Patient login - simple validation with ID and name
        const patient = await Patient.findOne({ 
          patientId: id, 
          name: name,
          isActive: true 
        });
        
        if (!patient) {
          return res.status(401).json({ error: "Invalid patient credentials" });
        }

        const patientToken = jwt.sign(
          { id: patient._id, role: "patient", patientId: patient.patientId },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        res.json({
          token: patientToken,
          user: {
            id: patient._id,
            type: 'patient',
            name: patient.name,
            patientId: patient.patientId,
            roomNumber: patient.roomNumber,
            condition: patient.condition
          },
        });
        break;

      case 'nurse':
      case 'admin':
        // Nurse/Admin login - use email and password
        const nurse = await Staff.findOne({ 
          email: email || id, // Allow both email and staffId
          role: type === 'admin' ? 'admin' : { $in: ['nurse', 'admin'] }, // Allow both nurse and admin roles
          isActive: true 
        });
        
        if (!nurse || !(await nurse.comparePassword(password))) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        const nurseToken = jwt.sign(
          { id: nurse._id, role: nurse.role }, // Use actual role from database
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        res.json({
          token: nurseToken,
          user: {
            id: nurse._id,
            type: nurse.role === 'admin' ? 'admin' : 'nurse', // Return actual type based on role
            name: nurse.name,
            email: nurse.email,
            role: nurse.role,
            department: nurse.department,
            roomNumber: patientId // Using patientId field as roomNumber
          },
        });
        break;

      case 'family':
        // Family login - use email and password
        const family = await FamilyMember.findOne({
          email: email || name, // Allow both email and name
          isApproved: true,
        }).populate("patientId", "name patientId");

        if (!family || !(await family.comparePassword(password))) {
          return res.status(401).json({ error: "Invalid family credentials" });
        }

        // Update last login
        family.lastLogin = new Date();
        await family.save();

        const familyToken = jwt.sign(
          { id: family._id, role: "family", patientId: family.patientId._id },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        res.json({
          token: familyToken,
          user: {
            id: family._id,
            type: 'family',
            name: family.name,
            email: family.email,
            relationship: family.relationship,
            patientId: family.patientId._id,
            familyMemberName: family.name
          },
        });
        break;

      default:
        return res.status(400).json({ error: "Invalid user type" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Validation schemas
const staffLoginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required(),
});

const familyLoginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required(),
});

const familyRegisterSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required(),
  relationship: Joi.string().required(),
  patientId: Joi.string().required(),
  accessLevel: Joi.string().valid('full','limited').optional(),
});

const patientRegisterSchema = Joi.object({
  patientId: Joi.string().required(),
  name: Joi.string().required(),
  age: Joi.number().min(0).max(150).required(),
  condition: Joi.string().required(),
  roomNumber: Joi.string().optional().default("101"),
});

const staffRegisterSchema = Joi.object({
  staffId: Joi.string().required(),
  name: Joi.string().required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("doctor", "nurse", "admin").required(),
  department: Joi.string().required(),
});

// Staff Login
router.post("/staff/login", async (req, res) => {
  try {
    const { error } = staffLoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = req.body;

    const staff = await Staff.findOne({ email, isActive: true });
    if (!staff || !(await staff.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: staff._id, role: "staff" },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        department: staff.department,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Family Member Login
router.post("/family/login", async (req, res) => {
  try {
    const { error } = familyLoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = req.body;

    const family = await FamilyMember.findOne({
      email,
      isApproved: true,
    }).populate("patientId", "name patientId");

    if (!family || !(await family.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    family.lastLogin = new Date();
    await family.save();

    const token = jwt.sign(
      { id: family._id, role: "family", patientId: family.patientId._id },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: family._id,
        name: family.name,
        email: family.email,
        relationship: family.relationship,
        patient: family.patientId,
        accessLevel: family.accessLevel,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Patient Registration (Staff Only - typically done during admission)
router.post("/patient/register", async (req, res) => {
  try {
    const { error } = patientRegisterSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { patientId, name, age, condition, roomNumber } = req.body;

    // Check if patient ID already exists
    const existingPatient = await Patient.findOne({ patientId });
    if (existingPatient) {
      return res.status(400).json({ error: "Patient ID already exists" });
    }

    // Check if room number is already occupied
    const existingRoom = await Patient.findOne({ roomNumber, isActive: true });
    if (existingRoom) {
      return res.status(400).json({ error: "Room number is already occupied" });
    }

    const patient = new Patient({
      patientId,
      name,
      age,
      condition,
      roomNumber: roomNumber || "101",
      admissionDate: new Date(),
    });

    await patient.save();

    res.status(201).json({
      message: "Patient registered successfully",
      patient: {
        id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        condition: patient.condition,
        roomNumber: patient.roomNumber,
        admissionDate: patient.admissionDate,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Family Member Registration
router.post("/family/register", async (req, res) => {
  try {
    const { error } = familyRegisterSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, email, password, phone, relationship, patientId } = req.body;

    // Check if patient exists
    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Check if email already exists
    const existingFamily = await FamilyMember.findOne({ email });
    if (existingFamily) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const familyMember = new FamilyMember({
      name,
      email,
      password,
      phone,
      relationship,
      patientId: patient._id,
    });

    await familyMember.save();

    // Add family member to patient's family list
    patient.familyMembers.push(familyMember._id);
    await patient.save();

    res.status(201).json({
      message: "Registration successful. Awaiting staff approval.",
      familyMemberId: familyMember._id,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Staff Registration
router.post("/staff/register", async (req, res) => {
  try {
    const { error } = staffRegisterSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { staffId, name, email, password, role, department } = req.body;

    // Check if staffId already exists
    const existingStaffId = await Staff.findOne({ staffId });
    if (existingStaffId) {
      return res.status(400).json({ error: "Staff ID already exists" });
    }

    // Check if email already exists
    const existingEmail = await Staff.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const staff = new Staff({
      staffId,
      name,
      email,
      password,
      role,
      department,
      isActive: true,
    });

    await staff.save();

    res.status(201).json({
      message: "Staff registered successfully",
      staff: {
        id: staff._id,
        staffId: staff.staffId,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        department: staff.department,
      },
    });
  } catch (error) {
    console.error("Staff registration error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get current user (protected route)
router.get("/me", async (req, res) => {
  try {
    // This should be protected by middleware, but for now we'll handle it here
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    switch (decoded.role) {
      case 'patient':
        const patient = await Patient.findById(decoded.id);
        if (!patient) {
          return res.status(404).json({ error: "Patient not found" });
        }
        res.json({
          user: {
            id: patient._id,
            type: 'patient',
            name: patient.name,
            patientId: patient.patientId,
            roomNumber: patient.roomNumber,
            condition: patient.condition
          }
        });
        break;

      case 'nurse':
        const nurse = await Staff.findById(decoded.id);
        if (!nurse) {
          return res.status(404).json({ error: "Nurse not found" });
        }
        res.json({
          user: {
            id: nurse._id,
            type: 'nurse',
            name: nurse.name,
            email: nurse.email,
            role: nurse.role,
            department: nurse.department
          }
        });
        break;

      case 'family':
        const family = await FamilyMember.findById(decoded.id).populate("patientId", "name patientId");
        if (!family) {
          return res.status(404).json({ error: "Family member not found" });
        }
        res.json({
          user: {
            id: family._id,
            type: 'family',
            name: family.name,
            email: family.email,
            relationship: family.relationship,
            patientId: family.patientId._id,
            familyMemberName: family.name
          }
        });
        break;

      default:
        return res.status(400).json({ error: "Invalid user role" });
    }
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
