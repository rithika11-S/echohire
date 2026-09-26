import express from "express";
import SavedJob from "../models/SavedJob.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/saved-jobs (Get active saved jobs for authenticated user)
router.get("/", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const customId = req.user.customId;

    const records = await SavedJob.find({
      $or: [{ userId }, ...(customId ? [{ userId: customId }] : [])],
      isDeleted: { $ne: true },
    });

    const userSavedIds = records.map((r) => r.jobId);
    res.json({ success: true, userId, savedJobIds: userSavedIds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/saved-jobs/:userId (Legacy/Public GET endpoint)
router.get("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const records = await SavedJob.find({
      userId,
      isDeleted: { $ne: true },
    });
    const userSavedIds = records.map((r) => r.jobId);
    res.json({ success: true, userId, savedJobIds: userSavedIds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/saved-jobs/:jobId (Save a job using authenticated req.user.id)
router.post("/:jobId", authenticateUser, async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const userId = req.user.id;

    if (!jobId) {
      return res.status(400).json({ success: false, message: "Job ID is required." });
    }

    const existing = await SavedJob.findOne({ userId, jobId });
    if (!existing) {
      await SavedJob.create({ userId, userEmail: req.user.email, jobId, isDeleted: false });
    } else {
      existing.isDeleted = false;
      if (req.user?.email) existing.userEmail = req.user.email;
      await existing.save();
    }

    const records = await SavedJob.find({ userId, isDeleted: { $ne: true } });
    const userSavedIds = records.map((r) => r.jobId);

    res.status(201).json({
      success: true,
      message: "Job saved successfully.",
      savedJobIds: userSavedIds,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/saved-jobs (Legacy POST endpoint)
router.post("/", async (req, res) => {
  try {
    const { userId, jobId } = req.body;

    if (!userId || !jobId) {
      return res.status(400).json({ success: false, message: "userId and jobId are required." });
    }

    const existing = await SavedJob.findOne({ userId, jobId });
    if (!existing) {
      await SavedJob.create({ userId, jobId, isDeleted: false });
    } else {
      existing.isDeleted = false;
      await existing.save();
    }

    const records = await SavedJob.find({ userId, isDeleted: { $ne: true } });
    const userSavedIds = records.map((r) => r.jobId);

    res.status(201).json({
      success: true,
      message: "Job saved successfully.",
      savedJobIds: userSavedIds,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/saved-jobs/:userId/:jobId & DELETE /api/saved-jobs/:jobId (Soft delete by setting isDeleted: true)
router.delete("/:jobId", authenticateUser, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    const cleanJobId = jobId.replace(/^job-/, "");

    await SavedJob.updateMany(
      {
        $or: [
          { userId, jobId },
          { userId, jobId: cleanJobId },
          { userId, jobId: `job-${cleanJobId}` },
          { userId: "user-seeker-1", jobId },
          { userId: "user-seeker-1", jobId: cleanJobId },
          { userId: "user-seeker-1", jobId: `job-${cleanJobId}` },
          { jobId },
          { jobId: cleanJobId },
          { jobId: `job-${cleanJobId}` },
        ],
      },
      { $set: { isDeleted: true } }
    );

    const records = await SavedJob.find({
      $or: [{ userId }, { userId: "user-seeker-1" }],
      isDeleted: { $ne: true },
    });
    const userSavedIds = records.map((r) => r.jobId);

    res.json({
      success: true,
      message: "Saved job removed successfully.",
      savedJobIds: userSavedIds,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:userId/:jobId", async (req, res) => {
  try {
    const { userId, jobId } = req.params;
    const cleanJobId = jobId.replace(/^job-/, "");

    await SavedJob.updateMany(
      {
        $or: [
          { userId, jobId },
          { userId, jobId: cleanJobId },
          { userId, jobId: `job-${cleanJobId}` },
          { userId: "user-seeker-1", jobId },
          { userId: "user-seeker-1", jobId: cleanJobId },
          { userId: "user-seeker-1", jobId: `job-${cleanJobId}` },
          { jobId },
          { jobId: cleanJobId },
          { jobId: `job-${cleanJobId}` },
        ],
      },
      { $set: { isDeleted: true } }
    );

    const records = await SavedJob.find({
      $or: [{ userId }, { userId: "user-seeker-1" }],
      isDeleted: { $ne: true },
    });
    const userSavedIds = records.map((r) => r.jobId);

    res.json({
      success: true,
      message: "Saved job removed successfully.",
      savedJobIds: userSavedIds,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
