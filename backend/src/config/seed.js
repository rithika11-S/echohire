import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Job } from "../models/Job.js";
import { User } from "../models/User.js";
import { Application } from "../models/Application.js";
import { SavedJob } from "../models/SavedJob.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEMO_USERS = [
  {
    id: "user-seeker-1",
    email: "seeker@echohire.com",
    password: "password123",
    name: "Rahul Sharma",
    role: "user",
    phone: "+91 98765 43210",
    location: "Chennai, Tamil Nadu",
    summary: "Passionate Frontend Developer dedicated to creating accessible web applications for everyone.",
    education: "B.Tech in Computer Science, Anna University (2020 - 2024)",
    experience: "Junior Web Developer at TechAccess (1 year)",
    skills: ["HTML", "CSS", "React", "JavaScript", "ARIA", "Accessibility"],
    accessNeed: "screen reader",
    resumeName: "Rahul_Sharma_Resume.pdf",
  },
  {
    id: "user-employer-1",
    email: "employer@techcorp.com",
    password: "password123",
    name: "TechCorp Solutions",
    role: "recruiter",
    company: "TechCorp Solutions",
    location: "Bangalore, Karnataka",
    phone: "+91 98123 45678",
  },
];

const INITIAL_APPLICATIONS = [
  {
    id: "app-demo-1",
    jobId: "job-0",
    jobTitle: "Frontend Developer (Accessibility Specialist)",
    company: "InnoTech Labs",
    jobSeekerId: "user-seeker-1",
    seekerId: "user-seeker-1",
    seekerName: "Rahul Sharma",
    seekerEmail: "seeker@echohire.com",
    seekerSkills: ["HTML", "CSS", "React"],
    appliedDate: "2026-08-25",
    status: "Shortlisted",
    resumeName: "Rahul_Sharma_Resume.pdf",
    coverNote: "Interested in accessible frontend engineering role.",
  },
  {
    id: "app-demo-2",
    jobId: "job-3",
    jobTitle: "AI & Voice Systems Engineer",
    company: "NeuroLink Tech",
    jobSeekerId: "user-seeker-1",
    seekerId: "user-seeker-1",
    seekerName: "Rahul Sharma",
    seekerEmail: "seeker@echohire.com",
    seekerSkills: ["Python", "Machine Learning"],
    appliedDate: "2026-08-27",
    status: "Under Review",
    resumeName: "Rahul_Sharma_Resume.pdf",
    coverNote: "Experienced in machine learning and voice interface integration.",
  },
];

export async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("🌱 Seeding Users into MongoDB...");
      for (const userData of DEMO_USERS) {
        await User.create(userData);
      }
      console.log("✅ Users seeded into MongoDB.");
    }

    const jobCount = await Job.countDocuments();
    if (jobCount === 0) {
      const initialJobsPath = path.join(__dirname, "..", "data", "initialJobs.json");
      let jobsData = [];
      if (fs.existsSync(initialJobsPath)) {
        jobsData = JSON.parse(fs.readFileSync(initialJobsPath, "utf-8"));
      }
      if (jobsData.length > 0) {
        console.log("🌱 Seeding Jobs into MongoDB...");
        await Job.insertMany(jobsData);
        console.log("✅ Jobs seeded into MongoDB.");
      }
    }

    const appCount = await Application.countDocuments();
    if (appCount === 0) {
      console.log("🌱 Seeding Applications into MongoDB...");
      await Application.insertMany(INITIAL_APPLICATIONS);
      console.log("✅ Applications seeded into MongoDB.");
    }

    const savedCount = await SavedJob.countDocuments();
    if (savedCount === 0) {
      console.log("🌱 Seeding SavedJobs into MongoDB...");
      await SavedJob.insertMany([
        { userId: "user-seeker-1", userEmail: "seeker@echohire.com", jobId: "job-0", isDeleted: false },
        { userId: "user-seeker-1", userEmail: "seeker@echohire.com", jobId: "job-3", isDeleted: false },
      ]);
      console.log("✅ SavedJobs seeded into MongoDB.");
    }

    // Auto-migrate existing MongoDB records to populate isDeleted: false where missing
    await SavedJob.updateMany({ isDeleted: { $exists: false } }, { $set: { isDeleted: false } });
    await Job.updateMany({ isDeleted: { $exists: false } }, { $set: { isDeleted: false } });
    await Application.updateMany({ isDeleted: { $exists: false } }, { $set: { isDeleted: false } });
  } catch (err) {
    console.error("❌ MongoDB Seeding Error:", err);
  }
}
