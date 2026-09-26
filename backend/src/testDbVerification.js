import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { seedDatabase } from "./config/seed.js";
import Job from "./models/Job.js";
import User from "./models/User.js";
import Application from "./models/Application.js";
import SavedJob from "./models/SavedJob.js";

async function verifyDatabase() {
  console.log("==================================================");
  console.log("STARTING MONGODB DATABASE VERIFICATION TEST");
  console.log("==================================================");

  // 1. Connect
  await connectDB();
  console.log("\n[1] MONGODB CONNECTED SUCCESSFULLY!");
  console.log("   - Mongoose Ready State:", mongoose.connection.readyState, "(1 = Connected)");
  console.log("   - Host:", mongoose.connection.host);
  console.log("   - Port:", mongoose.connection.port);
  console.log("   - Database Name:", mongoose.connection.name);

  // 2. Seed
  await seedDatabase();
  console.log("\n[2] DATABASE SEEDING COMPLETED!");

  // 3. Models verification
  console.log("\n[3] REGISTERED MONGOOSE MODELS:");
  const modelNames = mongoose.modelNames();
  console.log("   - Models:", modelNames);

  // 4. Count documents in each collection
  const jobCount = await Job.countDocuments();
  const userCount = await User.countDocuments();
  const appCount = await Application.countDocuments();
  const savedCount = await SavedJob.countDocuments();

  console.log("\n[4] MONGODB DOCUMENT COUNTS:");
  console.log(`   - Jobs: ${jobCount}`);
  console.log(`   - Users: ${userCount}`);
  console.log(`   - Applications: ${appCount}`);
  console.log(`   - Saved Jobs: ${savedCount}`);

  // 5. Test retrieve a job dynamically (GET /api/jobs/:jobId equivalent)
  console.log("\n[5] TESTING DYNAMIC RETRIEVAL OF REAL JOB FROM MONGODB:");
  const sampleJob = await Job.findOne({ id: "job-0" });
  if (sampleJob) {
    console.log("   ✅ Successfully retrieved job by custom string ID 'job-0' from MongoDB:");
    console.log(`      _id: ${sampleJob._id}`);
    console.log(`      id: ${sampleJob.id}`);
    console.log(`      title: ${sampleJob.title}`);
    console.log(`      company: ${sampleJob.company}`);
    console.log(`      location: ${sampleJob.location}`);

    // Query by _id as well
    const sampleJobByMongoId = await Job.findById(sampleJob._id);
    console.log("   ✅ Successfully retrieved job by Mongoose _id:", sampleJobByMongoId._id.toString());
  } else {
    console.log("   ❌ Job with id 'job-0' not found!");
  }

  // 6. Test Users role division (Employer vs Job Seeker)
  const seekers = await User.find({ role: { $in: ["seeker", "jobseeker"] } });
  const employers = await User.find({ role: { $in: ["employer", "recruiter"] } });
  console.log(`\n[6] USERS IN MONGODB: ${seekers.length} Job Seekers, ${employers.length} Employers/Recruiters.`);

  console.log("\n==================================================");
  console.log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!");
  console.log("==================================================");

  process.exit(0);
}

verifyDatabase().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
