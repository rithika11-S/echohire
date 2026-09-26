import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// GET /api/health
router.get("/", (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    success: true,
    message: "EchoHire backend is running",
    database: {
      connected: isConnected,
      readyState: mongoose.connection.readyState,
      name: mongoose.connection.name || "echohire",
      host: mongoose.connection.host || "localhost",
    },
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

export default router;
