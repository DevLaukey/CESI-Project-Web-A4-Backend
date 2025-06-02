const { sequelize } = require("../models");

async function testDatabaseConnection() {
  try {
    console.log("🔍 Testing Aiven MySQL connection...");

    // Test authentication
    await sequelize.authenticate();
    console.log("✅ Aiven MySQL connection established successfully.");

    // Test query execution
    const [results] = await sequelize.query(
      "SELECT VERSION() as version, NOW() as now"
    );
    console.log("📊 Database info:", results[0]);

    // Test database exists
    const [databases] = await sequelize.query("SHOW DATABASES LIKE ?", {
      replacements: [process.env.DB_NAME],
    });

    if (databases.length > 0) {
      console.log("✅ Database exists:", process.env.DB_NAME);
    } else {
      console.log("⚠️  Database does not exist:", process.env.DB_NAME);
    }

    return true;
  } catch (error) {
    console.error("❌ Unable to connect to Aiven MySQL:");
    console.error("Error:", error.message);

    if (error.name === "SequelizeConnectionError") {
      console.error(
        "💡 Check your Aiven connection details and SSL certificate"
      );
    }

    return false;
  }
}

module.exports = { testDatabaseConnection };
