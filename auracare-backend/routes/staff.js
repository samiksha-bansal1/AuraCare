const express = require("express");
const Joi = require("joi");
const Staff = require("../models/Staff");
const { authenticate, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all staff members (admin only)
router.get("/", authorize("admin"), async (req, res) => {
  try {
    const staff = await Staff.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get specific staff member
router.get("/:id", authorize("admin"), async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id).select("-password");
    
    if (!staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update staff member
router.put("/:id", authorize("admin"), async (req, res) => {
  try {
    const updateSchema = Joi.object({
      name: Joi.string(),
      email: Joi.string().email(),
      role: Joi.string().valid("doctor", "nurse", "admin"),
      department: Joi.string(),
      isActive: Joi.boolean(),
    });

    const { error } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select("-password");

    if (!staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Deactivate/activate staff member
router.put("/:id/deactivate", authorize("admin"), async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    // Prevent deactivating the last admin
    if (staff.role === "admin" && staff.isActive) {
      const adminCount = await Staff.countDocuments({ role: "admin", isActive: true });
      if (adminCount <= 1) {
        return res.status(400).json({ error: "Cannot deactivate the last admin user" });
      }
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    res.json({ 
      message: `Staff member ${staff.isActive ? 'activated' : 'deactivated'} successfully`,
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        department: staff.department,
        isActive: staff.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete staff member (admin only)
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    // Prevent deleting the last admin
    if (staff.role === "admin") {
      const adminCount = await Staff.countDocuments({ role: "admin", isActive: true });
      if (adminCount <= 1) {
        return res.status(400).json({ error: "Cannot delete the last admin user" });
      }
    }

    await Staff.findByIdAndDelete(req.params.id);

    res.json({ message: "Staff member deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
