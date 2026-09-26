import mongoose from "mongoose";

const savedJobSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    userEmail: { type: String },
    jobId: { type: String, required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

savedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export const SavedJob =
  mongoose.models.SavedJob || mongoose.model("SavedJob", savedJobSchema);
export default SavedJob;
