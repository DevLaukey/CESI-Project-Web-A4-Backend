const mongoose = require("mongoose");
require("dotenv").config();

async function testConnection() {
  try {
    console.log("🔄 Testing MongoDB connection...");
    console.log(
      `📍 Connecting to: ${process.env.MONGODB_URI?.replace(
        /\/\/.*@/,
        "//***:***@"
      )}`
    );

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connection successful!");

    // Test database operations
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(
      `📁 Available collections: ${collections.map((c) => c.name).join(", ")}`
    );

    await mongoose.connection.close();
    console.log("🔌 Connection closed");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

testConnection();
