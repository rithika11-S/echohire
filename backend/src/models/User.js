import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, sparse: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "recruiter"],
      required: true,
      default: "user",
    },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
    company: { type: String },
    companyId: { type: String },
    location: { type: String },
    bio: { type: String },
    summary: { type: String },
    education: { type: String },
    experience: { type: String },
    skills: [{ type: String }],
    accessNeed: { type: String },
    accessibilityPreferences: { type: String },
    resumeName: { type: String },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare candidate password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
