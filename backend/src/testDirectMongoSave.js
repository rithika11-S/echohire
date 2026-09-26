import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";

async function testDirectSave() {
  console.log("==================================================");
  console.log("DIRECT MONGODB DISK PERSISTENCE TEST");
  console.log("==================================================");

  // 1. Connect
  await connectDB();

  const testEmail = `rithika_db_${Date.now()}@echohire.com`;

  // 2. Create User
  console.log(`\nCreating User document for ${testEmail} in local MongoDB...`);
  const user = await User.create({
    id: `user-${Date.now()}`,
    name: "Rithika Senthil",
    email: testEmail,
    password: "Password123!",
    role: "user",
    phone: "+91 98765 43210",
    location: "Chennai, Tamil Nadu",
  });

  console.log("✅ User Document Saved in MongoDB!");
  console.log("   _id:", user._id.toString());
  console.log("   Email:", user.email);

  // 3. Disconnect Mongoose completely
  console.log("\nDisconnecting from MongoDB...");
  await mongoose.disconnect();
  console.log("Disconnected.");

  // 4. Reconnect to local MongoDB on port 27017
  console.log("\nReconnecting to local MongoDB at mongodb://127.0.0.1:27017/echohire...");
  await mongoose.connect("mongodb://127.0.0.1:27017/echohire");

  // 5. Query MongoDB directly
  console.log("Querying MongoDB users collection for newly created document...");
  const foundUser = await User.findOne({ email: testEmail });

  if (foundUser) {
    console.log("\n✅ VERIFIED: User document was permanently saved in MongoDB database 'echohire'!");
    console.log("   _id:", foundUser._id.toString());
    console.log("   Name:", foundUser.name);
    console.log("   Email:", foundUser.email);
    console.log("   Role:", foundUser.role);
    console.log("   Password Hash:", foundUser.password);
    console.log("   Created At:", foundUser.createdAt);
  } else {
    console.error("\n❌ FAILED: User document not found after reconnecting!");
  }

  await mongoose.disconnect();
  console.log("==================================================");
  process.exit(0);
}

testDirectSave().catch(console.error);
