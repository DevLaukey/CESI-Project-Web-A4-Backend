// scripts/resetDatabase.js
require("dotenv").config();
const mysql = require("mysql2/promise");

const resetDatabase = async () => {
  let connection;
  try {
    console.log("🔄 Starting complete database reset...");
    console.log(`📊 Database: ${process.env.DB_NAME}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);

    // Create connection WITHOUT specifying database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
    });

    console.log("✅ Connected to MySQL server");

    const databaseName = process.env.DB_NAME || "restaurant_service_dev";

    // Drop the entire database
    console.log("🗑️ Dropping entire database...");
    await connection.execute(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    console.log("✅ Database completely removed");

    // Recreate the database
    console.log("🏗️ Creating new database...");
    await connection.execute(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log("✅ Database recreated with proper charset");

    // Close the connection
    await connection.end();

    // Now use Sequelize to create tables
    console.log("🔗 Connecting with Sequelize...");
    const { sequelize, Category } = require("../models");

    await sequelize.authenticate();
    console.log("✅ Sequelize connected to fresh database");

    // Create all tables
    console.log("🏗️ Creating all tables...");
    await sequelize.sync({ force: true });
    console.log("✅ All tables created successfully");

    // Seed default categories
    console.log("🌱 Seeding default categories...");
    await seedDefaultCategories(Category);

    // Create upload directories
    console.log("📁 Creating upload directories...");
    createUploadDirectories();

    console.log("🎉 Database reset completed successfully!");
    console.log("📋 Summary:");
    console.log("   - Database completely removed and recreated");
    console.log("   - All tables created fresh");
    console.log("   - Default categories seeded");
    console.log("   - Upload directories created");

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database reset failed:", error);
    console.error("Error details:", error.message);

    if (connection) {
      await connection.end();
    }

    process.exit(1);
  }
};

const seedDefaultCategories = async (CategoryModel) => {
  try {
    const defaultCategories = [
      {
        name: "Appetizers",
        slug: "appetizers",
        description: "Starters and small plates to begin your meal",
        icon: "🥗",
        color: "#4CAF50",
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "Main Courses",
        slug: "main-courses",
        description: "Hearty main dishes and entrees",
        icon: "🍽️",
        color: "#FF9800",
        isActive: true,
        sortOrder: 2,
      },
      {
        name: "Pizza",
        slug: "pizza",
        description: "Traditional and specialty pizzas",
        icon: "🍕",
        color: "#FFC107",
        isActive: true,
        sortOrder: 3,
      },
      {
        name: "Burgers",
        slug: "burgers",
        description: "Juicy burgers and sandwiches",
        icon: "🍔",
        color: "#607D8B",
        isActive: true,
        sortOrder: 4,
      },
      {
        name: "Pasta",
        slug: "pasta",
        description: "Fresh pasta dishes and Italian cuisine",
        icon: "🍝",
        color: "#9C27B0",
        isActive: true,
        sortOrder: 5,
      },
      {
        name: "Salads",
        slug: "salads",
        description: "Fresh and healthy salad options",
        icon: "🥗",
        color: "#8BC34A",
        isActive: true,
        sortOrder: 6,
      },
      {
        name: "Soups",
        slug: "soups",
        description: "Warm and comforting soup varieties",
        icon: "🍲",
        color: "#FF5722",
        isActive: true,
        sortOrder: 7,
      },
      {
        name: "Desserts",
        slug: "desserts",
        description: "Sweet treats and desserts",
        icon: "🍰",
        color: "#E91E63",
        isActive: true,
        sortOrder: 8,
      },
      {
        name: "Beverages",
        slug: "beverages",
        description: "Drinks, juices, and beverages",
        icon: "🥤",
        color: "#2196F3",
        isActive: true,
        sortOrder: 9,
      },
      {
        name: "Sides",
        slug: "sides",
        description: "Side dishes and accompaniments",
        icon: "🍟",
        color: "#795548",
        isActive: true,
        sortOrder: 10,
      },
    ];

    for (const categoryData of defaultCategories) {
      await CategoryModel.create(categoryData);
      console.log(`   ✅ Created category: ${categoryData.name}`);
    }

    console.log(`✅ Seeded ${defaultCategories.length} default categories`);
  } catch (error) {
    console.error("❌ Failed to seed categories:", error.message);
    throw error;
  }
};

const createUploadDirectories = () => {
  const fs = require("fs");
  const uploadDirs = [
    "./uploads",
    "./uploads/restaurants",
    "./uploads/items",
    "./uploads/menus",
    "./uploads/categories",
    "./uploads/general",
    "./uploads/temp",
  ];

  uploadDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`   📁 Created directory: ${dir}`);
    } else {
      console.log(`   📁 Directory exists: ${dir}`);
    }
  });
};

// Allow script to be run with command line arguments
const args = process.argv.slice(2);

if (require.main === module) {
  console.log("🚀 Restaurant Database Complete Reset Tool");
  console.log("==========================================");

  // Show command line options
  if (args.includes("--help")) {
    console.log("Usage: node scripts/resetDatabase.js [options]");
    console.log("");
    console.log("This script will:");
    console.log("1. Drop the entire database");
    console.log("2. Recreate it fresh");
    console.log("3. Create all tables");
    console.log("4. Seed default categories");
    console.log("5. Create upload directories");
    console.log("");
    console.log("Options:");
    console.log("  --help            Show this help message");
    process.exit(0);
  }

  // Confirm in production
  if (process.env.NODE_ENV === "production") {
    console.log(
      "⚠️  WARNING: You are about to completely DESTROY the PRODUCTION database!"
    );
    console.log("This will permanently delete ALL data and cannot be undone.");
    console.log(
      'Type "DESTROY_PRODUCTION_DB" to continue, or Ctrl+C to cancel:'
    );

    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("> ", (answer) => {
      if (answer === "DESTROY_PRODUCTION_DB") {
        rl.close();
        resetDatabase();
      } else {
        console.log("❌ Reset cancelled - database is safe");
        rl.close();
        process.exit(0);
      }
    });
  } else {
    // Ask for confirmation in development too
    console.log("⚠️  This will completely remove and recreate your database.");
    console.log("All data will be lost. Continue? (y/N)");

    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("> ", (answer) => {
      if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
        rl.close();
        resetDatabase();
      } else {
        console.log("❌ Reset cancelled");
        rl.close();
        process.exit(0);
      }
    });
  }
}

module.exports = resetDatabase;
