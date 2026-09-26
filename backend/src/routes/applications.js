import express from "express";
import mongoose from "mongoose";
import { Application } from "../models/Application.js";
import { Job } from "../models/Job.js";
import { User } from "../models/User.js";
import { authenticateUser, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/applications/my-applications (Job Seeker Isolated Endpoint)
router.get("/my-applications", authenticateUser, requireRole("user"), async (req, res) => {
  try {
    const userId = req.user.id;
    const customId = req.user.customId;
    const email = req.user.email;

    const apps = await Application.find({
      $or: [
        { jobSeekerId: userId },
        { seekerId: userId },
        ...(customId ? [{ jobSeekerId: customId }, { seekerId: customId }] : []),
        { seekerEmail: email.toLowerCase() },
      ],
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: apps.length, applications: apps });
  } catch (err) {
    console.error("GET my-applications error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/applications/recruiter/my-candidates (Recruiter Isolated Candidates Endpoint)
router.get("/recruiter/my-candidates", authenticateUser, requireRole("recruiter"), async (req, res) => {
  try {
    const userId = req.user.id;
    const customId = req.user.customId;

    const user = await User.findById(userId);
    const compName = user?.company;
    const compId = user?.companyId;

    // 1. Find recruiter-owned jobs
    const recruiterJobs = await Job.find({
      $or: [
        { recruiterId: userId },
        ...(customId ? [{ recruiterId: customId }] : []),
        ...(compId ? [{ companyId: compId }] : []),
        ...(compName ? [{ company: new RegExp(`^${compName}$`, "i") }] : []),
      ],
    });

    const ownedJobIds = recruiterJobs.flatMap((j) => [
      String(j._id),
      ...(j.id ? [j.id] : []),
    ]);

    // 2. Find applications for those recruiter-owned jobs only
    const recruiterApps = await Application.find({
      $or: [
        { jobId: { $in: ownedJobIds } },
        { recruiterId: userId },
        ...(customId ? [{ recruiterId: customId }] : []),
      ],
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: recruiterApps.length, applications: recruiterApps });
  } catch (err) {
    console.error("GET my-candidates error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/applications/recruiter/:recruiterId (Legacy endpoint)
router.get("/recruiter/:recruiterId", async (req, res) => {
  try {
    const { recruiterId } = req.params;
    const user = await User.findOne({
      $or: [
        { id: recruiterId },
        { email: recruiterId },
        ...(mongoose.Types.ObjectId.isValid(recruiterId) ? [{ _id: recruiterId }] : []),
      ],
    });
    const compName = user?.company;
    const compId = user?.companyId;

    const recruiterJobs = await Job.find({
      $or: [
        { recruiterId },
        ...(compId ? [{ companyId: compId }] : []),
        ...(compName ? [{ company: new RegExp(`^${compName}$`, "i") }] : []),
      ],
    });

    const ownedJobIds = recruiterJobs.flatMap((j) => [
      String(j._id),
      ...(j.id ? [j.id] : []),
    ]);

    const recruiterApps = await Application.find({
      $or: [
        { jobId: { $in: ownedJobIds } },
        { recruiterId },
        ...(compName ? [{ company: new RegExp(`^${compName}$`, "i") }] : []),
      ],
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: recruiterApps.length, applications: recruiterApps });
  } catch (err) {
    console.error("GET recruiter applications error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/applications (General listing with filter)
router.get("/", async (req, res) => {
  try {
    const { recruiterId, seekerEmail, seekerId } = req.query;
    let filter = {};

    if (recruiterId) {
      const user = await User.findOne({
        $or: [
          { id: recruiterId },
          { email: recruiterId },
          ...(mongoose.Types.ObjectId.isValid(recruiterId) ? [{ _id: recruiterId }] : []),
        ],
      });
      const compName = user?.company;
      const compId = user?.companyId;

      const recruiterJobs = await Job.find({
        $or: [
          { recruiterId },
          ...(compId ? [{ companyId: compId }] : []),
          ...(compName ? [{ company: new RegExp(`^${compName}$`, "i") }] : []),
        ],
      });

      const ownedJobIds = recruiterJobs.flatMap((j) => [
        String(j._id),
        ...(j.id ? [j.id] : []),
      ]);

      filter.$or = [
        { jobId: { $in: ownedJobIds } },
        { recruiterId },
        ...(compName ? [{ company: new RegExp(`^${compName}$`, "i") }] : []),
      ];
    } else if (seekerEmail || seekerId) {
      const email = seekerEmail || seekerId;
      filter.$or = [
        { seekerEmail: email.toLowerCase() },
        { seekerId: email },
        { jobSeekerId: email },
      ];
    }

    const apps = await Application.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: apps.length, applications: apps });
  } catch (err) {
    console.error("GET applications error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/applications/:userId
router.get("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    let filter = {};

    if (userId && userId !== "all") {
      filter = {
        $or: [
          { seekerEmail: userId.toLowerCase() },
          { seekerId: userId },
          { jobSeekerId: userId },
        ],
      };
    }

    const apps = await Application.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: apps.length, applications: apps });
  } catch (err) {
    console.error("GET applications by userId error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/applications (Submit application dynamically in MongoDB)
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { jobId, seekerSkills, resumeName, coverNote } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, message: "Job ID is required." });
    }

    // Authenticated user data
    const jobSeekerId = req.user.id;
    const seekerName = req.user.name;
    const seekerEmail = req.user.email.toLowerCase().trim();

    // Check duplicate application
    const existing = await Application.findOne({
      jobId,
      $or: [{ jobSeekerId }, { seekerEmail }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already applied for this job position.",
      });
    }

    // Lookup Job details dynamically to set recruiter & company info
    const targetJob = await Job.findOne({
      $or: [
        { id: jobId },
        ...(mongoose.Types.ObjectId.isValid(jobId) ? [{ _id: jobId }] : []),
      ],
    });

    const jobTitle = targetJob?.title || "Position Application";
    const company = targetJob?.company || "Organization";
    const companyId = targetJob?.companyId || "";
    const recruiterId = targetJob?.recruiterId || "";

    const appId = `app-${Date.now()}`;
    const newApp = await Application.create({
      id: appId,
      jobId,
      jobTitle,
      company,
      companyId,
      recruiterId,
      jobSeekerId,
      seekerId: jobSeekerId,
      seekerName,
      seekerEmail,
      seekerSkills: Array.isArray(seekerSkills) ? seekerSkills : ["React", "JavaScript"],
      appliedDate: new Date().toISOString().split("T")[0],
      status: "Submitted",
      resumeName: resumeName || "Resume.pdf",
      coverNote: coverNote || "",
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully.",
      application: newApp,
    });
  } catch (err) {
    console.error("POST application error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/applications/:id/status (Recruiter status update)
router.put("/:id/status", authenticateUser, requireRole("recruiter"), async (req, res) => {
  try {
    const { status } = req.body;
    const targetId = req.params.id;

    if (!status) {
      return res.status(400).json({ success: false, message: "Application status is required." });
    }

    let app = await Application.findOneAndUpdate(
      {
        $or: [
          { id: targetId },
          ...(mongoose.Types.ObjectId.isValid(targetId) ? [{ _id: targetId }] : []),
        ],
      },
      { $set: { status } },
      { new: true }
    );

    if (!app) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    res.json({
      success: true,
      message: "Application status updated successfully.",
      application: app,
    });
  } catch (err) {
    console.error("PUT application status error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
