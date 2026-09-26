import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import healthRoutes from "./routes/health.js";
import jobsRoutes from "./routes/jobs.js";
import savedJobsRoutes from "./routes/savedJobs.js";
import applicationsRoutes from "./routes/applications.js";
import authRoutes from "./routes/auth.js";
import { connectDB } from "./config/db.js";
import { seedDatabase } from "./config/seed.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Configure CORS for Frontend on Port 5173
app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());

// API Routes
app.use("/api/health", healthRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/saved-jobs", savedJobsRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", authRoutes);

// Global Error Handler
app.use((err, req, res, _next) => {
  console.error("Backend Server Error:", err.stack);
  res.status(500).json({ success: false, message: "Internal server error." });
});

async function startServer() {
  await connectDB();
  await seedDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 EchoHire Express Backend API running at http://localhost:${PORT}`);
    console.log(`📡 CORS enabled for Frontend at ${FRONTEND_URL}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
