// scripts/seedCategories.js
// Independent category seeder script that doesn't rely on models

require("dotenv").config();
const { Sequelize, DataTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

// Database configuration (matching your structure)
const getDbConfig = () => {
  // Read SSL certificate if it exists
  let sslConfig = false;
  const caCertPath = process.env.DB_SSL_CA_PATH;

  if (caCertPath && fs.existsSync(caCertPath)) {
    sslConfig = {
      ca: fs.readFileSync(caCertPath),
    };
  }

  const env = process.env.NODE_ENV || "development";

  const configs = {
    development: {
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: "mysql",
      dialectOptions: {
        ssl: process.env.DB_SSL_REQUIRE === "true" ? sslConfig : false,
      },
      logging: console.log,
    },
    test: {
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME_TEST,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: "mysql",
      dialectOptions: {
        ssl: process.env.DB_SSL_REQUIRE === "true" ? sslConfig : false,
      },
      logging: false,
    },
    production: {
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      dialect: "mysql",
      dialectOptions: {
        ssl: process.env.DB_SSL_REQUIRE === "true" ? sslConfig : false,
        connectTimeout: 60000,
        acquireTimeout: 60000,
        timeout: 60000,
      },
      logging: false,
      pool: {
        max: 20,
        min: 5,
        acquire: 60000,
        idle: 10000,
      },
      retry: {
        match: [
          /ETIMEDOUT/,
          /EHOSTUNREACH/,
          /ECONNRESET/,
          /ECONNREFUSED/,
          /ETIMEDOUT/,
          /ESOCKETTIMEDOUT/,
          /EHOSTUNREACH/,
          /EPIPE/,
          /EAI_AGAIN/,
          /SequelizeConnectionError/,
          /SequelizeConnectionRefusedError/,
          /SequelizeHostNotFoundError/,
          /SequelizeHostNotReachableError/,
          /SequelizeInvalidConnectionError/,
          /SequelizeConnectionTimedOutError/,
        ],
        max: 3,
      },
    },
  };

  return configs[env];
};

// Validate environment variables
const validateEnv = () => {
  const required = ["DB_USERNAME", "DB_PASSWORD", "DB_NAME", "DB_HOST"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error("\n📝 Create a .env file in your project root with:");
    console.error("DB_HOST=localhost");
    console.error("DB_PORT=3306");
    console.error("DB_NAME=your_database_name");
    console.error("DB_USERNAME=your_mysql_username");
    console.error("DB_PASSWORD=your_mysql_password");
    console.error("DB_SSL_REQUIRE=false");
    process.exit(1);
  }

  console.log("✅ Required environment variables found");
};

// Create Sequelize instance
const createSequelizeInstance = () => {
  const config = getDbConfig();

  console.log("🔗 Connecting to database...");
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   Username: ${config.username}`);
  console.log(`   SSL: ${config.dialectOptions.ssl ? "Enabled" : "Disabled"}`);

  return new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
};

// Define Category model independently
const defineCategoryModel = (sequelize) => {
  const Category = sequelize.define(
    "Category",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: DataTypes.STRING(120),
        allowNull: true,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      icon: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      color: {
        type: DataTypes.STRING(7),
        allowNull: true,
        defaultValue: "#000000",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
    },
    {
      tableName: "Categories",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["name"],
        },
        {
          unique: true,
          fields: ["slug"],
        },
        {
          fields: ["isActive"],
        },
        {
          fields: ["sortOrder"],
        },
      ],
    }
  );

  return Category;
};

// Default categories data
const defaultCategories = [
  {
    id: 1,
    name: "Pizza",
    slug: "pizza",
    description: "Delicious pizzas with various toppings",
    icon: "🍕",
    color: "#FF6B6B",
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 2,
    name: "Pasta",
    slug: "pasta",
    description: "Fresh pasta dishes and Italian specialties",
    icon: "🍝",
    color: "#4ECDC4",
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 3,
    name: "Salads",
    slug: "salads",
    description: "Fresh and healthy salad options",
    icon: "🥗",
    color: "#95E1D3",
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 4,
    name: "Appetizers",
    slug: "appetizers",
    description: "Small plates and starters",
    icon: "🥨",
    color: "#F7DC6F",
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 5,
    name: "Desserts",
    slug: "desserts",
    description: "Sweet treats and desserts",
    icon: "🍰",
    color: "#BB8FCE",
    isActive: true,
    sortOrder: 5,
  },
  {
    id: 6,
    name: "Beverages",
    slug: "beverages",
    description: "Refreshing drinks and beverages",
    icon: "🥤",
    color: "#85C1E9",
    isActive: true,
    sortOrder: 6,
  },
  {
    id: 7,
    name: "Main Course",
    slug: "main-course",
    description: "Hearty main dishes and entrees",
    icon: "🍖",
    color: "#F8C471",
    isActive: true,
    sortOrder: 7,
  },
];

// Test database connection
const testConnection = async (sequelize, Category) => {
  try {
    console.log("🔍 Testing database connection...");

    await sequelize.authenticate();
    console.log("✅ Database connection successful");

    // Check if Categories table exists
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();

    const categoryTableExists = tables.some(
      (table) => table.toLowerCase() === "categories" || table === "Categories"
    );

    if (categoryTableExists) {
      console.log("✅ Categories table exists");

      // Test if we can query the table
      try {
        const count = await Category.count();
        console.log(`📊 Current categories count: ${count}`);
        return true;
      } catch (error) {
        console.log("⚠️  Categories table exists but has structure issues");
        console.log("   This might be due to schema differences");
        return false;
      }
    } else {
      console.log("❌ Categories table does not exist");
      return false;
    }
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);

    if (error.original?.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("   Check your database username and password");
    } else if (error.original?.code === "ECONNREFUSED") {
      console.error(
        "   Check if MySQL server is running and host/port are correct"
      );
    } else if (error.original?.code === "ER_BAD_DB_ERROR") {
      console.error(
        "   Database does not exist. Create it first or check DB_NAME"
      );
    }

    throw error;
  }
};

// Create Categories table if it doesn't exist
const ensureCategoriesTable = async (sequelize, Category) => {
  try {
    console.log("🏗️  Ensuring Categories table exists...");

    await Category.sync({ alter: false });
    console.log("✅ Categories table ready");
  } catch (error) {
    console.error("❌ Failed to create/sync Categories table:", error.message);
    throw error;
  }
};

// Seed categories function
const seedCategories = async () => {
  let sequelize;

  try {
    console.log("🌱 Starting independent categories seeding...");

    // Validate environment
    validateEnv();

    // Create database connection
    sequelize = createSequelizeInstance();

    // Define Category model
    const Category = defineCategoryModel(sequelize);

    // Test connection
    const tableReady = await testConnection(sequelize, Category);

    if (!tableReady) {
      await ensureCategoriesTable(sequelize, Category);
    }

    // Check existing categories
    const existingCategories = await Category.findAll({
      where: {
        name: defaultCategories.map((cat) => cat.name),
      },
    });

    if (existingCategories.length > 0) {
      console.log("⚠️  Some categories already exist:");
      existingCategories.forEach((cat) => {
        console.log(`   - ${cat.name} (ID: ${cat.id})`);
      });

      const readline = require("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) => {
        rl.question(
          "Do you want to continue and skip existing categories? (y/n): ",
          resolve
        );
      });
      rl.close();

      if (answer.toLowerCase() !== "y") {
        console.log("❌ Seeding cancelled by user");
        process.exit(0);
      }
    }

    // Filter out existing categories
    const existingNames = existingCategories.map((cat) => cat.name);
    const categoriesToCreate = defaultCategories.filter(
      (cat) => !existingNames.includes(cat.name)
    );

    if (categoriesToCreate.length === 0) {
      console.log("✅ All categories already exist. Nothing to seed.");
      return;
    }

    // Add UUIDs and create categories
    const createdCategories = [];
    for (const categoryData of categoriesToCreate) {
      try {
        const categoryWithUuid = {
          ...categoryData,
          uuid: uuidv4(),
        };

        const category = await Category.create(categoryWithUuid);
        createdCategories.push(category);
        console.log(
          `   ✅ Created: ${category.name} (ID: ${category.id}, UUID: ${category.uuid})`
        );
      } catch (error) {
        console.error(
          `   ❌ Failed to create ${categoryData.name}:`,
          error.message
        );
      }
    }

    console.log(
      `✅ Successfully created ${createdCategories.length} categories`
    );
    console.log("🎉 Categories seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding categories:", error.message);
    process.exit(1);
  } finally {
    if (sequelize) {
      await sequelize.close();
      console.log("🔌 Database connection closed");
    }
  }
};

// Reset and seed all categories
const resetAndSeedCategories = async () => {
  let sequelize;

  try {
    console.log("🔄 Resetting and reseeding categories...");

    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question(
        "⚠️  This will DELETE ALL existing categories. Continue? (y/n): ",
        resolve
      );
    });
    rl.close();

    if (answer.toLowerCase() !== "y") {
      console.log("❌ Reset cancelled by user");
      process.exit(0);
    }

    // Validate environment
    validateEnv();

    // Create database connection
    sequelize = createSequelizeInstance();

    // Define Category model
    const Category = defineCategoryModel(sequelize);

    // Test connection
    await testConnection(sequelize, Category);

    // Delete all existing categories
    await Category.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    console.log("🗑️  Deleted all existing categories");

    // Create all categories
    const createdCategories = [];
    for (const categoryData of defaultCategories) {
      try {
        const categoryWithUuid = {
          ...categoryData,
          uuid: uuidv4(),
        };

        const category = await Category.create(categoryWithUuid);
        createdCategories.push(category);
        console.log(
          `   ✅ Created: ${category.name} (ID: ${category.id}, UUID: ${category.uuid})`
        );
      } catch (error) {
        console.error(
          `   ❌ Failed to create ${categoryData.name}:`,
          error.message
        );
      }
    }

    console.log(
      `✅ Successfully created ${createdCategories.length} categories`
    );
    console.log("🎉 Categories reset and seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error resetting categories:", error.message);
    process.exit(1);
  } finally {
    if (sequelize) {
      await sequelize.close();
      console.log("🔌 Database connection closed");
    }
  }
};

// List existing categories
const listCategories = async () => {
  let sequelize;

  try {
    console.log("📋 Listing all categories...");

    // Validate environment
    validateEnv();

    // Create database connection
    sequelize = createSequelizeInstance();

    // Define Category model
    const Category = defineCategoryModel(sequelize);

    // Test connection
    await testConnection(sequelize, Category);

    const categories = await Category.findAll({
      order: [
        ["sortOrder", "ASC"],
        ["name", "ASC"],
      ],
    });

    if (categories.length === 0) {
      console.log("   No categories found in database");
      return;
    }

    console.log(`   Found ${categories.length} categories:`);
    categories.forEach((category) => {
      console.log(
        `   - ${category.name} (ID: ${category.id}, UUID: ${category.uuid}, Active: ${category.isActive})`
      );
    });
  } catch (error) {
    console.error("❌ Error listing categories:", error.message);
    process.exit(1);
  } finally {
    if (sequelize) {
      await sequelize.close();
      console.log("🔌 Database connection closed");
    }
  }
};

// Test database connection only
const testConnectionOnly = async () => {
  let sequelize;

  try {
    console.log("🔍 Testing database connection...");

    // Validate environment
    validateEnv();

    // Create database connection
    sequelize = createSequelizeInstance();

    // Define Category model
    const Category = defineCategoryModel(sequelize);

    // Test connection
    await testConnection(sequelize, Category);

    console.log("✅ Database connection test completed successfully");
  } catch (error) {
    console.error("❌ Database connection test failed:", error.message);
    process.exit(1);
  } finally {
    if (sequelize) {
      await sequelize.close();
      console.log("🔌 Database connection closed");
    }
  }
};

// Main execution
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log("🚀 Independent Category Seeder");
  console.log("==============================");

  switch (command) {
    case "seed":
      await seedCategories();
      break;
    case "reset":
      await resetAndSeedCategories();
      break;
    case "list":
      await listCategories();
      break;
    case "test":
      await testConnectionOnly();
      break;
    case "help":
    default:
      console.log(`
📚 Independent Categories Seed Script Usage:

  node scripts/seedCategories.js <command>

Commands:
  seed    - Add default categories (skips existing ones)
  reset   - Delete all categories and recreate defaults
  list    - List all existing categories
  test    - Test database connection and table structure
  help    - Show this help message

Examples:
  node scripts/seedCategories.js seed
  node scripts/seedCategories.js reset
  node scripts/seedCategories.js list
  node scripts/seedCategories.js test

Environment Variables Required:
  DB_HOST         - Database host (e.g., localhost)
  DB_PORT         - Database port (e.g., 3306)
  DB_NAME         - Database name
  DB_USERNAME     - Database username
  DB_PASSWORD     - Database password
  DB_SSL_REQUIRE  - SSL requirement (true/false)
  DB_SSL_CA_PATH  - SSL CA certificate path (optional)

Categories that will be created:
  1. Pizza         🍕 - Delicious pizzas with various toppings
  2. Pasta         🍝 - Fresh pasta dishes and Italian specialties
  3. Salads        🥗 - Fresh and healthy salad options
  4. Appetizers    🥨 - Small plates and starters
  5. Desserts      🍰 - Sweet treats and desserts
  6. Beverages     🥤 - Refreshing drinks and beverages
  7. Main Course   🍖 - Hearty main dishes and entrees
      `);
      break;
  }

  process.exit(0);
};

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
}

module.exports = {
  seedCategories,
  resetAndSeedCategories,
  listCategories,
  defaultCategories,
};
