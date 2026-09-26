import express from "express";
import mongoose from "mongoose";
import { Job } from "../models/Job.js";
import { User } from "../models/User.js";
import { authenticateUser, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/jobs (Public listing with query & filter support)
router.get("/", async (req, res) => {
  try {
    const { q, skill, location, workMode, jobType, recruiterId, companyId, company } = req.query;
    let filter = {};

    if (recruiterId) {
      filter.$or = [
        { recruiterId },
        { companyId: recruiterId },
        { company: recruiterId },
      ];
    } else if (companyId) {
      filter.$or = [{ companyId }, { company: companyId }];
    } else if (company) {
      filter.company = new RegExp(`^${company}$`, "i");
    }

    if (q) {
      const queryRegex = new RegExp(q, "i");
      filter.$or = [
        { title: queryRegex },
        { company: queryRegex },
        { description: queryRegex },
      ];
    }

    if (skill) filter.skills = new RegExp(skill, "i");
    if (location) filter.location = new RegExp(location, "i");
    if (workMode) filter.workMode = new RegExp(workMode, "i");
    if (jobType) filter.jobType = new RegExp(jobType, "i");

    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: jobs.length, jobs });
  } catch (err) {
    console.error("GET /api/jobs error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/jobs/recruiter/my-jobs (Recruiter isolated jobs endpoint)
router.get("/recruiter/my-jobs", authenticateUser, requireRole("recruiter"), async (req, res) => {
  try {
    const userId = req.user.id;
    const customId = req.user.customId;

    const user = await User.findById(userId);
    const compName = user?.company;
    const compId = user?.companyId;

    const recruiterJobs = await Job.find({
      $or: [
        { recruiterId: userId },
        ...(customId ? [{ recruiterId: customId }] : []),
        ...(compId ? [{ companyId: compId }] : []),
        ...(compName ? [{ company: new RegExp(`^${compName}$`, "i") }] : []),
      ],
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: recruiterJobs.length, jobs: recruiterJobs });
  } catch (err) {
    console.error("GET my-jobs error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/jobs/recruiter/:recruiterId (Legacy/Public recruiter jobs)
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
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: recruiterJobs.length, jobs: recruiterJobs });
  } catch (err) {
    console.error("GET recruiter jobs error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/jobs/:id (Reads selected job directly from MongoDB)
router.get("/:id", async (req, res) => {
  try {
    const targetId = req.params.id;
    let job = null;

    if (mongoose.Types.ObjectId.isValid(targetId)) {
      job = await Job.findById(targetId);
    }
    if (!job) {
      job = await Job.findOne({ id: targetId });
    }

    if (!job) {
      return res.status(404).json({ success: false, message: "Job listing not found." });
    }

    res.json({ success: true, job });
  } catch (err) {
    console.error("GET /api/jobs/:id error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/jobs (Create job in MongoDB - Recruiter only)
router.post("/", authenticateUser, requireRole("recruiter"), async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      workMode,
      jobType,
      salary,
      description,
      requirements,
      responsibilities,
      skills,
      experience,
      accessibilityInformation,
      matchScore,
    } = req.body;

    if (!title || !location) {
      return res.status(400).json({
        success: false,
        message: "Job title and location are required.",
      });
    }

    // Must strictly derive recruiter ownership from req.user
    const recruiterId = req.user.id;
    const user = await User.findById(recruiterId);
    const companyName = company || user?.company || "Organization";
    const companyId = user?.companyId || `company-${recruiterId}`;

    const formattedSkills = Array.isArray(skills)
      ? skills
      : typeof skills === "string"
      ? skills.split(",").map((s) => s.trim())
      : [];

    const jobId = `job-${Date.now()}`;

    const newJob = await Job.create({
      id: jobId,
      title,
      company: companyName,
      companyId,
      recruiterId, // Derived from req.user.id
      location,
      workMode: workMode || "Remote",
      jobType: jobType || "Full-Time",
      salary: salary || "Competitive Salary",
      description: description || `Join ${companyName} as a ${title}.`,
      requirements: requirements || "Strong technical foundation and accessible design commitment.",
      responsibilities: responsibilities || "Develop accessible features and work closely with product teams.",
      skills: formattedSkills,
      experience: experience || "1+ years of relevant experience",
      postedDate: new Date().toLocaleDateString(),
      accessibilityInformation: accessibilityInformation || ["Screen reader compatible design."],
      accommodations: accessibilityInformation || ["Screen reader compatible design."],
      matchScore: matchScore || 85,
    });

    res.status(201).json({
      success: true,
      message: "Job created successfully.",
      job: newJob,
    });
  } catch (err) {
    console.error("POST /api/jobs error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/jobs/:id (Recruiter only, must own job)
router.put("/:id", authenticateUser, requireRole("recruiter"), async (req, res) => {
  try {
    const targetId = req.params.id;
    const recruiterId = req.user.id;
    const customId = req.user.customId;

    let existingJob = await Job.findOne({
      $or: [
        { id: targetId },
        ...(mongoose.Types.ObjectId.isValid(targetId) ? [{ _id: targetId }] : []),
      ],
    });

    if (!existingJob) {
      return res.status(404).json({ success: false, message: "Job listing not found." });
    }

    // Verify ownership
    if (existingJob.recruiterId !== recruiterId && existingJob.recruiterId !== customId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to edit this job.",
      });
    }

    Object.assign(existingJob, req.body);
    await existingJob.save();

    res.json({ success: true, message: "Job updated successfully.", job: existingJob });
  } catch (err) {
    console.error("PUT /api/jobs/:id error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/jobs/:id (Recruiter only, must own job)
router.delete("/:id", authenticateUser, requireRole("recruiter"), async (req, res) => {
  try {
    const targetId = req.params.id;
    const recruiterId = req.user.id;
    const customId = req.user.customId;

    let existingJob = await Job.findOne({
      $or: [
        { id: targetId },
        ...(mongoose.Types.ObjectId.isValid(targetId) ? [{ _id: targetId }] : []),
      ],
    });

    if (!existingJob) {
      return res.status(404).json({ success: false, message: "Job listing not found." });
    }

    // Verify ownership
    if (existingJob.recruiterId !== recruiterId && existingJob.recruiterId !== customId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to delete this job.",
      });
    }

    await existingJob.deleteOne();

    res.json({ success: true, message: "Job deleted successfully.", job: existingJob });
  } catch (err) {
    console.error("DELETE /api/jobs/:id error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
