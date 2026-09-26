// Using native global fetch in Node.js

async function testApiRegistration() {
  console.log("==================================================");
  console.log("TESTING DYNAMIC HTTP REGISTRATION TO MONGODB");
  console.log("==================================================");

  const testUser = {
    name: "Rithika Senthil",
    email: `rithika_${Date.now()}@example.com`,
    password: "Password123!",
    role: "user",
    phone: "+91 99999 88888",
    location: "Chennai, Tamil Nadu",
  };

  console.log(`\nSending POST /api/auth/register for: ${testUser.email}...`);

  const res = await fetch("http://localhost:5000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testUser),
  });

  const data = await res.json();
  console.log("\nResponse HTTP Status:", res.status);
  console.log("Response Body:", JSON.stringify(data, null, 2));

  if (data.success && data.user) {
    console.log("\n✅ USER SUCCESSFULLY STORED IN MONGODB VIA HTTP API!");
    console.log("   User ID:", data.user.id);
    console.log("   Role in DB:", data.user.role);
    console.log("   JWT Token Issued:", Boolean(data.token));
  } else {
    console.error("\n❌ Registration failed!", data);
  }

  // Also query GET /api/auth/users to confirm user is listed in DB users collection
  console.log("\nFetching GET /api/auth/users from MongoDB to verify user persistence...");
  const usersRes = await fetch("http://localhost:5000/api/auth/users");
  const usersData = await usersRes.json();

  console.log("Users in MongoDB:", usersData.count);
  const found = usersData.users?.find((u) => u.email === testUser.email);
  if (found) {
    console.log("✅ VERIFIED: Newly created user is saved in MongoDB users collection!");
    console.log("   Saved Document:", JSON.stringify(found, null, 2));
  } else {
    console.error("❌ User not found in GET /api/auth/users!");
  }

  console.log("==================================================");
}

testApiRegistration().catch(console.error);
