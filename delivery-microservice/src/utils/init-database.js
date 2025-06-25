// scripts/init-database.js
const { sequelize } = require("../config/database");
const Driver = require("../models/Driver");
const Delivery = require("../models/Delivery");
const Tracking = require("../models/Tracking");

/**
 * Initialize all database tables
 */
const initializeDatabase = async () => {
  try {
    console.log("🚀 Starting database initialization...");

    // Test database connection

    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    // Create all tables in the correct order (respecting foreign keys)
    console.log("📋 Creating tables...");

    // 1. Create drivers table first (referenced by other tables)
    await Driver.createTable();
    console.log("✅ Drivers table created");

    // 2. Create deliveries table (references drivers)
    await Delivery.createTable();
    console.log("✅ Deliveries table created");

    // 3. Create tracking tables (reference deliveries and drivers)
    await Tracking.createTables();
    console.log("✅ Tracking tables created");

    console.log("🎉 Database initialization completed successfully!");

    // Test a simple query to make sure everything works
    const testQuery = await sequelize.query("SELECT 1 as test", {
      type: sequelize.QueryTypes.SELECT,
    });

    if (testQuery[0].test === 1) {
      console.log("✅ Database test query successful");
    }

    return {
      success: true,
      message: "Database initialized successfully",
      tables_created: [
        "drivers",
        "driver_documents",
        "deliveries",
        "delivery_tracking",
        "location_history",
        "delivery_routes",
      ],
    };
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
};

/**
 * Drop all tables (use with caution!)
 */
const dropAllTables = async () => {
  try {
    console.log("⚠️  Dropping all tables...");

    // Drop in reverse order to respect foreign key constraints
    const tables = [
      "delivery_routes",
      "location_history",
      "delivery_tracking",
      "driver_documents",
      "deliveries",
      "drivers",
    ];

    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not drop table ${table}:`, error.message);
      }
    }

    console.log("🗑️  All tables dropped successfully");
    return { success: true, message: "All tables dropped" };
  } catch (error) {
    console.error("❌ Error dropping tables:", error);
    throw error;
  }
};

/**
 * Reset database (drop and recreate all tables)
 */
const resetDatabase = async () => {
  try {
    console.log("🔄 Resetting database...");

    await dropAllTables();
    await initializeDatabase();

    console.log("🎉 Database reset completed!");
    return { success: true, message: "Database reset successfully" };
  } catch (error) {
    console.error("❌ Database reset failed:", error);
    throw error;
  }
};

/**
 * Check if all required tables exist
 */
const checkTables = async () => {
  try {
    const requiredTables = [
      "drivers",
      "driver_documents",
      "deliveries",
      "delivery_tracking",
      "location_history",
      "delivery_routes",
    ];

    const existingTables = [];
    const missingTables = [];

    for (const table of requiredTables) {
      try {
        await sequelize.query(`SELECT 1 FROM ${table} LIMIT 1`);
        existingTables.push(table);
      } catch (error) {
        missingTables.push(table);
      }
    }

    const allTablesExist = missingTables.length === 0;

    return {
      allTablesExist,
      existingTables,
      missingTables,
      totalRequired: requiredTables.length,
      totalExisting: existingTables.length,
    };
  } catch (error) {
    console.error("❌ Error checking tables:", error);
    throw error;
  }
};

// CLI interface when script is run directly
if (require.main === module) {
  const command = process.argv[2] || "init";

  const runCommand = async () => {
    try {
      switch (command) {
        case "init":
          await initializeDatabase();
          break;
        case "drop":
          await dropAllTables();
          break;
        case "reset":
          await resetDatabase();
          break;
        case "check":
          const status = await checkTables();
          console.log("📊 Database Status:");
          console.log(
            `   Tables existing: ${status.totalExisting}/${status.totalRequired}`
          );
          console.log(
            `   All tables exist: ${status.allTablesExist ? "✅" : "❌"}`
          );
          if (status.missingTables.length > 0) {
            console.log(
              `   Missing tables: ${status.missingTables.join(", ")}`
            );
          }
          break;
        default:
          console.log("Available commands:");
          console.log("  init  - Initialize all database tables");
          console.log("  drop  - Drop all tables");
          console.log("  reset - Drop and recreate all tables");
          console.log("  check - Check if all required tables exist");
          break;
      }
      process.exit(0);
    } catch (error) {
      console.error("Command failed:", error);
      process.exit(1);
    }
  };

  runCommand();
}

module.exports = {
  initializeDatabase,
  dropAllTables,
  resetDatabase,
  checkTables,
};
