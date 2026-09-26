import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    title: { type: String, required: true },
    company: { type: String, required: true },
    companyId: { type: String },
    recruiterId: { type: String },
    location: { type: String, required: true },
    workMode: { type: String, default: "Remote" },
    jobType: { type: String, default: "Full-Time" },
    employmentType: { type: String, default: "Full-Time" },
    salary: { type: String, default: "Competitive Salary" },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    description: { type: String },
    requirements: { type: String },
    responsibilities: { type: String },
    skills: [{ type: String }],
    requiredSkills: [{ type: String }],
    experience: { type: String },
    experienceLevel: { type: String },
    accessibilityInformation: [{ type: String }],
    accommodations: [{ type: String }],
    accessibilityAccommodations: [{ type: String }],
    postedDate: { type: String },
    applicationDeadline: { type: String },
    matchScore: { type: Number, default: 85 },
    status: { type: String, default: "active" },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Job = mongoose.models.Job || mongoose.model("Job", jobSchema);
export default Job;
