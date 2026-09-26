import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/echohire";

  try {
    console.log(`🔌 Connecting Mongoose to MongoDB at ${mongoURI}...`);
    await mongoose.connect(mongoURI);
    isConnected = true;
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}
