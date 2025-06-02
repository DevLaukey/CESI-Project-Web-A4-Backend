// scripts/initDatabase.js - Database Initialization Script
require("dotenv").config();
const { sequelize } = require("../models");

async function initializeDatabase() {
  try {
    console.log("🚀 Initializing User Management Database...");
    console.log(
      "📍 Connecting to:",
      process.env.DB_HOST || "food-app-cesi-laukeymwaura-7f5f.g.aivencloud.com"
    );
    console.log("🔌 Port:", process.env.DB_PORT || 25060);
    console.log("💾 Database:", process.env.DB_NAME || "defaultdb");

    // Step 1: Test connection
    console.log("\n📡 Testing connection...");
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully");

    // Step 2: Get database info
    const [dbInfo] = await sequelize.query(
      "SELECT VERSION() as version, DATABASE() as current_db, USER() as user"
    );
    console.log("📊 MySQL Version:", dbInfo[0].version);
    console.log("🗄️  Current Database:", dbInfo[0].current_db);
    console.log("👤 Connected as:", dbInfo[0].user);

    // Step 3: Create user_service_db if it doesn't exist
    const targetDb = "user_service_db";
    console.log(`\n🔨 Creating database '${targetDb}' if it doesn't exist...`);

    await sequelize.query(
      `CREATE DATABASE IF NOT EXISTS \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Database '${targetDb}' ready`);

    // Step 4: Switch to the target database
    console.log(`\n🔄 Switching to database '${targetDb}'...`);
    await sequelize.query(`USE \`${targetDb}\``);

    // Step 5: Sync models (create tables)
    console.log("\n📋 Creating/updating tables...");
    await sequelize.sync({
      alter: true, // Update existing tables to match models
      force: false, // Don't drop existing tables
    });
    console.log("✅ All tables created/updated successfully");

    // Step 6: Show created tables
    const [tables] = await sequelize.query("SHOW TABLES");
    console.log("\n📊 Tables in database:");
    tables.forEach((table) => {
      console.log(`  📄 ${Object.values(table)[0]}`);
    });

    // Step 7: Create a test user (optional)
    console.log("\n👤 Creating admin user...");
    const { User } = require("../models");
    const bcrypt = require("bcrypt");

    const adminExists = await User.findOne({
      where: { email: "admin@foodplatform.com" },
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("Admin123!", 12);
      await User.create({
        email: "admin@foodplatform.com",
        passwordHash: hashedPassword,
        userType: "tech_support",
        firstName: "System",
        lastName: "Administrator",
        isActive: true,
        isVerified: true,
      });
      console.log("✅ Admin user created (admin@foodplatform.com / Admin123!)");
    } else {
      console.log("ℹ️  Admin user already exists");
    }

    console.log("\n🎉 Database initialization completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("  1. Update your .env file: DB_NAME=user_service_db");
    console.log("  2. Run: npm run dev");
    console.log("  3. Test API: http://localhost:3001/api/health");

    return true;
  } catch (error) {
    console.error("\n❌ Database initialization failed:");
    console.error("Error:", error.message);

    if (error.name === "SequelizeConnectionError") {
      console.error("\n💡 Troubleshooting tips:");
      console.error("  - Check your Aiven service is running");
      console.error("  - Verify connection details in .env file");
      console.error("  - Ensure SSL certificate is correct");
      console.error("  - Check your network connection");
    }

    return false;
  } finally {
    await sequelize.close();
    console.log("🔌 Database connection closed");
  }
}

// Quick connection test function
async function quickTest() {
  try {
    console.log("🧪 Quick connection test...");
    await sequelize.authenticate();
    console.log("✅ Connection successful!");

    const [result] = await sequelize.query(
      'SELECT "Hello Aiven!" as message, NOW() as timestamp'
    );
    console.log("📨 Response:", result[0]);

    return true;
  } catch (error) {
    console.error("❌ Quick test failed:", error.message);
    return false;
  } finally {
    await sequelize.close();
  }
}

// Run the script
if (require.main === module) {
  const command = process.argv[2];

  if (command === "test") {
    quickTest()
      .then((success) => process.exit(success ? 0 : 1))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  } else {
    initializeDatabase()
      .then((success) => process.exit(success ? 0 : 1))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
}

module.exports = { initializeDatabase, quickTest };

// Updated package.json scripts
/*
Add these to your package.json scripts section:

"scripts": {
  "start": "node app.js",
  "dev": "nodemon app.js",
  "test": "jest",
  
  // Database scripts
  "db:test": "node scripts/initDatabase.js test",
  "db:init": "node scripts/initDatabase.js",
  "db:setup": "npm run db:init",
  
  // Legacy Sequelize CLI (optional)
  "db:migrate": "npx sequelize-cli db:migrate",
  "db:seed": "npx sequelize-cli db:seed:all"
}
*/
