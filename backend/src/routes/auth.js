import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "echohire_super_secret_jwt_key_2026";

// Helper to generate JWT
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      userId: user.id || user._id.toString(),
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Helper to map role to strict values ("user" or "recruiter")
function normalizeRole(rawRole) {
  if (!rawRole) return "user";
  const lower = rawRole.toString().toLowerCase().trim();
  if (lower === "recruiter" || lower === "employer") return "recruiter";
  return "user";
}

// POST /api/auth/register & /api/auth/signup (Registration in MongoDB)
async function handleRegistration(req, res) {
  try {
    const { name, email, password, role, company, phone, location, bio, summary, skills } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const dbRole = normalizeRole(role);
    const userId = `user-${Date.now()}`;

    const newUser = await User.create({
      id: userId,
      name,
      email: cleanEmail,
      password, // Pre-save hook hashes this with bcrypt
      role: dbRole,
      phone: phone || "",
      company: company || "",
      companyId: dbRole === "recruiter" ? `company-${Date.now()}` : undefined,
      location: location || "",
      bio: bio || summary || "",
      summary: summary || bio || "",
      skills: Array.isArray(skills) ? skills : [],
      isActive: true,
    });

    const token = generateToken(newUser);
    const safeUser = {
      id: newUser._id.toString(),
      customId: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone,
      company: newUser.company,
      companyId: newUser.companyId,
      location: newUser.location,
      summary: newUser.summary,
      skills: newUser.skills,
    };

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error creating user account.",
      error: err.message,
    });
  }
}

router.post("/register", handleRegistration);
router.post("/signup", handleRegistration);

// POST /api/auth/login (Sign In via MongoDB)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account has been deactivated. Please contact support.",
      });
    }

    // Verify password with bcrypt
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(user);
    const safeUser = {
      id: user._id.toString(),
      customId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      company: user.company,
      companyId: user.companyId,
      location: user.location,
      summary: user.summary,
      skills: user.skills,
    };

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error logging in user.",
      error: err.message,
    });
  }
});

// GET /api/auth/me (Get authenticated current user)
router.get("/me", authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User profile not found." });
    }
    return res.json({
      success: true,
      user: {
        id: user._id.toString(),
        customId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        company: user.company,
        companyId: user.companyId,
        location: user.location,
        summary: user.summary,
        skills: user.skills,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users (Get all users from MongoDB)
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error("GET users error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/:id
router.get("/users/:id", async (req, res) => {
  try {
    const targetId = req.params.id;
    let user = null;

    if (mongoose.Types.ObjectId.isValid(targetId)) {
      user = await User.findById(targetId).select("-password");
    }
    if (!user) {
      user = await User.findOne({
        $or: [{ id: targetId }, { email: targetId.toLowerCase() }],
      }).select("-password");
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("GET user by ID error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/:id
router.put("/users/:id", async (req, res) => {
  try {
    const targetId = req.params.id;
    let user = await User.findOneAndUpdate(
      { $or: [{ id: targetId }, { email: targetId.toLowerCase() }, { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null }] },
      { $set: req.body },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User profile not found." });
    }

    res.json({ success: true, message: "User profile updated successfully.", user });
  } catch (err) {
    console.error("PUT user error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
