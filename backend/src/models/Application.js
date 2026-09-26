import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    jobId: { type: String, required: true, index: true },
    jobTitle: { type: String },
    company: { type: String },
    companyId: { type: String },
    recruiterId: { type: String, index: true },
    jobSeekerId: { type: String, index: true },
    seekerId: { type: String },
    seekerName: { type: String },
    seekerEmail: { type: String, required: true },
    seekerSkills: [{ type: String }],
    appliedDate: { type: String },
    status: { type: String, default: "Submitted" },
    resumeName: { type: String },
    coverNote: { type: String },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Application =
  mongoose.models.Application || mongoose.model("Application", applicationSchema);
export default Application;
