// scripts/seedCategories.js
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");

// Import your models - adjust the path based on your project structure
const { Category } = require("../models");

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

const seedCategories = async () => {
  try {
    console.log("🌱 Starting categories seeding...");

    // Check if categories already exist
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

    // Add UUIDs to categories that don't exist
    const categoriesWithUuids = categoriesToCreate.map((category) => ({
      ...category,
      uuid: uuidv4(),
    }));

    // Create categories one by one for better error handling
    const createdCategories = [];
    for (const categoryData of categoriesWithUuids) {
      try {
        const category = await Category.create(categoryData);
        createdCategories.push(category);
        console.log(`   ✅ Created: ${category.name} (ID: ${category.id})`);
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
    console.error("❌ Error seeding categories:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      console.error(
        "   This might be due to duplicate entries. Check your database."
      );
    } else if (error.name === "SequelizeConnectionError") {
      console.error(
        "   Database connection failed. Check your database configuration."
      );
    }

    process.exit(1);
  }
};

// Alternative function to reset and reseed all categories
const resetAndSeedCategories = async () => {
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

    // Delete all existing categories
    await Category.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    console.log("🗑️  Deleted all existing categories");

    // Add UUIDs to all categories
    const categoriesWithUuids = defaultCategories.map((category) => ({
      ...category,
      uuid: uuidv4(),
    }));

    // Create all categories
    const createdCategories = [];
    for (const categoryData of categoriesWithUuids) {
      try {
        const category = await Category.create(categoryData);
        createdCategories.push(category);
        console.log(`   ✅ Created: ${category.name} (ID: ${category.id})`);
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
    console.error("❌ Error resetting categories:", error);
    process.exit(1);
  }
};

// Function to list existing categories
const listCategories = async () => {
  try {
    console.log("📋 Listing all categories...");

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
    console.error("❌ Error listing categories:", error);
    process.exit(1);
  }
};

// Test database connection
const testConnection = async () => {
  try {
    console.log("🔍 Testing database connection...");

    // Import sequelize instance
    const { sequelize } = require("../models");

    await sequelize.authenticate();
    console.log("✅ Database connection successful");

    // Test if Category table exists
    const tableExists = await sequelize.getQueryInterface().showAllTables();
    const categoryTableExists = tableExists.some(
      (table) => table.toLowerCase() === "categories" || table === "Categories"
    );

    if (categoryTableExists) {
      console.log("✅ Categories table exists");
    } else {
      console.log("❌ Categories table does not exist. Run migrations first.");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("   Check your database configuration in .env file");
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  // Test connection first
  await testConnection();

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
      console.log("✅ Database connection test completed");
      break;
    case "help":
    default:
      console.log(`
📚 Categories Seed Script Usage:

  node scripts/seedCategories.js <command>

Commands:
  seed    - Add default categories (skips existing ones)
  reset   - Delete all categories and recreate defaults
  list    - List all existing categories
  test    - Test database connection
  help    - Show this help message

Examples:
  node scripts/seedCategories.js seed
  node scripts/seedCategories.js reset
  node scripts/seedCategories.js list
  node scripts/seedCategories.js test

Environment Variables Required:
  DB_HOST     - Database host (default: localhost)
  DB_PORT     - Database port (default: 3306)
  DB_NAME     - Database name
  DB_USER     - Database username
  DB_PASSWORD - Database password
      `);
      break;
  }

  // Close database connection
  try {
    const { sequelize } = require("../models");
    await sequelize.close();
    console.log("🔌 Database connection closed");
  } catch (error) {
    // Ignore closing errors
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
