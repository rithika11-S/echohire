import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const INITIAL_JOBS_PATH = path.join(DATA_DIR, "initialJobs.json");

const DEMO_USERS = [
  {
    id: "user-seeker-1",
    email: "seeker@echohire.com",
    password: "password",
    name: "Rahul Sharma",
    role: "seeker",
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
    password: "password",
    name: "TechCorp Solutions",
    role: "employer",
    company: "TechCorp Solutions",
    location: "Bangalore, Karnataka",
    phone: "+91 98123 45678",
    description: "Leading technology enterprise committed to inclusive hiring and accessible workspace environments.",
  },
  {
    id: "user-admin-1",
    email: "admin@echohire.com",
    password: "password",
    name: "Platform Administrator",
    role: "admin",
  },
];

const INITIAL_APPLICATIONS = [
  {
    id: "app-demo-1",
    jobId: "job-0",
    jobTitle: "Frontend Developer (Accessibility Specialist)",
    company: "InnoTech Labs",
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

function ensureDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    let initialJobs = [];
    if (fs.existsSync(INITIAL_JOBS_PATH)) {
      try {
        const raw = fs.readFileSync(INITIAL_JOBS_PATH, "utf-8");
        initialJobs = JSON.parse(raw);
      } catch (err) {
        console.error("Failed to parse initialJobs.json:", err);
      }
    }

    const defaultData = {
      users: DEMO_USERS,
      jobs: initialJobs,
      applications: INITIAL_APPLICATIONS,
      savedJobs: { "user-seeker-1": ["job-0", "job-3"] },
    };

    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
  }
}

export function readDB() {
  ensureDB();
  try {
    const content = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("DB Read Error:", err);
    return { users: [], jobs: [], applications: [], savedJobs: {} };
  }
}

export function writeDB(data) {
  ensureDB();
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error("DB Write Error:", err);
    return false;
  }
}
