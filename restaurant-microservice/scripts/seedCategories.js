// seeders/standaloneSeeder.js
require("dotenv").config();
const { Sequelize, DataTypes, Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");

// Direct database connection
const sequelize = new Sequelize({
  host:
    process.env.DB_HOST || "restaurant-restaurant-10052025.j.aivencloud.com",
  port: process.env.DB_PORT || 26934,
  database: process.env.DB_NAME || "restaurant",
  username: process.env.DB_USER || "avnadmin",
  password: process.env.DB_PASSWORD,
  dialect: "mysql",
  dialectOptions: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
  logging: console.log,
});

// Define Category model inline
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
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: DataTypes.TEXT,
    icon: DataTypes.STRING,
    image: DataTypes.STRING,
    color: DataTypes.STRING(7),
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "sort_order",
    },
    parentId: {
      type: DataTypes.INTEGER,
      field: "parent_id",
      references: {
        model: "categories",
        key: "id",
      },
    },
  },
  {
    tableName: "categories",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

// Helper function to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Main categories data
const mainCategories = [
  {
    name: "Appetizers & Starters",
    description:
      "Small dishes served before the main course to stimulate appetite",
    icon: "🥗",
    color: "#FF6B6B",
    sortOrder: 1,
    isActive: true,
  },
  {
    name: "Soups & Salads",
    description: "Fresh salads and warm soups for a light meal",
    icon: "🥄",
    color: "#4ECDC4",
    sortOrder: 2,
    isActive: true,
  },
  {
    name: "Pizza",
    description: "Traditional and gourmet pizzas with various toppings",
    icon: "🍕",
    color: "#FFE66D",
    sortOrder: 3,
    isActive: true,
  },
  {
    name: "Pasta & Italian",
    description: "Classic Italian pasta dishes and specialties",
    icon: "🍝",
    color: "#FF8B94",
    sortOrder: 4,
    isActive: true,
  },
  {
    name: "Burgers & Sandwiches",
    description: "Juicy burgers and fresh sandwiches",
    icon: "🍔",
    color: "#A8E6CF",
    sortOrder: 5,
    isActive: true,
  },
  {
    name: "Main Courses",
    description: "Hearty main dishes and entrees",
    icon: "🍖",
    color: "#B4A7D6",
    sortOrder: 6,
    isActive: true,
  },
  {
    name: "Seafood",
    description: "Fresh fish and seafood specialties",
    icon: "🐟",
    color: "#87CEEB",
    sortOrder: 7,
    isActive: true,
  },
  {
    name: "Vegetarian & Vegan",
    description: "Plant-based dishes for vegetarian and vegan diets",
    icon: "🥬",
    color: "#90EE90",
    sortOrder: 8,
    isActive: true,
  },
  {
    name: "Asian Cuisine",
    description: "Authentic Asian dishes and flavors",
    icon: "🥢",
    color: "#F4A460",
    sortOrder: 9,
    isActive: true,
  },
  {
    name: "Mexican & Latin",
    description: "Spicy and flavorful Mexican and Latin American dishes",
    icon: "🌮",
    color: "#FF7F50",
    sortOrder: 10,
    isActive: true,
  },
  {
    name: "Desserts",
    description: "Sweet treats and desserts to end your meal",
    icon: "🍰",
    color: "#FFB6C1",
    sortOrder: 11,
    isActive: true,
  },
  {
    name: "Beverages",
    description: "Hot and cold drinks, juices, and specialty beverages",
    icon: "🥤",
    color: "#DDA0DD",
    sortOrder: 12,
    isActive: true,
  },
  {
    name: "Coffee & Tea",
    description: "Premium coffee, tea, and hot beverages",
    icon: "☕",
    color: "#D2691E",
    sortOrder: 13,
    isActive: true,
  },
  {
    name: "Alcoholic Beverages",
    description: "Wine, beer, cocktails, and spirits",
    icon: "🍷",
    color: "#DC143C",
    sortOrder: 14,
    isActive: true,
  },
  {
    name: "Kids Menu",
    description: "Child-friendly meals and smaller portions",
    icon: "🧒",
    color: "#FFE4B5",
    sortOrder: 15,
    isActive: true,
  },
];

// Subcategories for more specific categorization
const subcategoriesData = {
  Pizza: [
    { name: "Margherita & Classic", color: "#FFE66D", sortOrder: 1 },
    { name: "Meat Lovers", color: "#FF6347", sortOrder: 2 },
    { name: "Vegetarian Pizza", color: "#98FB98", sortOrder: 3 },
    { name: "Gourmet & Specialty", color: "#DDA0DD", sortOrder: 4 },
  ],
  "Pasta & Italian": [
    { name: "Spaghetti & Long Pasta", color: "#FF8B94", sortOrder: 1 },
    { name: "Penne & Short Pasta", color: "#F0E68C", sortOrder: 2 },
    { name: "Lasagna & Baked Pasta", color: "#CD853F", sortOrder: 3 },
    { name: "Ravioli & Stuffed Pasta", color: "#DEB887", sortOrder: 4 },
  ],
  "Asian Cuisine": [
    { name: "Chinese", color: "#FF6347", sortOrder: 1 },
    { name: "Japanese & Sushi", color: "#FFB6C1", sortOrder: 2 },
    { name: "Thai", color: "#98FB98", sortOrder: 3 },
    { name: "Indian", color: "#F4A460", sortOrder: 4 },
    { name: "Vietnamese", color: "#87CEEB", sortOrder: 5 },
  ],
  "Main Courses": [
    { name: "Grilled & BBQ", color: "#CD853F", sortOrder: 1 },
    { name: "Steaks & Beef", color: "#A0522D", sortOrder: 2 },
    { name: "Chicken & Poultry", color: "#DEB887", sortOrder: 3 },
    { name: "Pork & Lamb", color: "#D2691E", sortOrder: 4 },
  ],
  Desserts: [
    { name: "Cakes & Pastries", color: "#FFB6C1", sortOrder: 1 },
    { name: "Ice Cream & Gelato", color: "#E6E6FA", sortOrder: 2 },
    { name: "Chocolate Desserts", color: "#DEB887", sortOrder: 3 },
    { name: "Fruit Desserts", color: "#98FB98", sortOrder: 4 },
  ],
  Beverages: [
    { name: "Soft Drinks", color: "#87CEEB", sortOrder: 1 },
    { name: "Juices & Smoothies", color: "#FFE4B5", sortOrder: 2 },
    { name: "Energy & Sports Drinks", color: "#F0E68C", sortOrder: 3 },
    { name: "Water & Sparkling", color: "#E0FFFF", sortOrder: 4 },
  ],
  "Appetizers & Starters": [
    { name: "Dips & Spreads", color: "#DDA0DD", sortOrder: 1 },
    { name: "Fried Appetizers", color: "#F4A460", sortOrder: 2 },
    { name: "Cold Appetizers", color: "#87CEEB", sortOrder: 3 },
    { name: "Cheese & Charcuterie", color: "#FFE4B5", sortOrder: 4 },
  ],
};

class StandaloneCategorySeeder {
  static async run() {
    try {
      console.log("==============================");
      console.log("🌱 Starting standalone category seeding...");
      console.log("==============================");

      // Check environment variables
      console.log("✅ Required environment variables:");
      console.log("   DB_HOST:", process.env.DB_HOST || "Using default");
      console.log("   DB_PORT:", process.env.DB_PORT || "Using default");
      console.log("   DB_NAME:", process.env.DB_NAME || "Using default");
      console.log("   DB_USER:", process.env.DB_USER || "Using default");
      console.log(
        "   DB_PASSWORD:",
        process.env.DB_PASSWORD ? "***" : "NOT SET"
      );

      // Test database connection
      console.log("🔗 Testing database connection...");
      await sequelize.authenticate();
      console.log("✅ Database connection successful");

      // Check if categories table exists
      const tables = await sequelize.query("SHOW TABLES LIKE 'categories'");
      if (tables[0].length === 0) {
        console.log("❌ Categories table does not exist");
        console.log(
          "Please run migrations first to create the categories table"
        );
        return;
      }
      console.log("✅ Categories table exists");

      // Check current categories count
      const existingCount = await Category.count();
      console.log(`📊 Current categories count: ${existingCount}`);

      const createdCategories = [];
      const createdSubcategories = [];

      // Create main categories
      console.log("🏗️  Creating main categories...");
      for (const categoryData of mainCategories) {
        const slug = createSlug(categoryData.name);

        // Check if category already exists
        const existingCategory = await Category.findOne({
          where: { name: categoryData.name },
        });

        if (existingCategory) {
          console.log(
            `⚠️  Category '${categoryData.name}' already exists (ID: ${existingCategory.id}), skipping...`
          );
          createdCategories.push(existingCategory);
          continue;
        }

        try {
          const category = await Category.create({
            uuid: uuidv4(),
            name: categoryData.name,
            slug: slug,
            description: categoryData.description,
            icon: categoryData.icon,
            color: categoryData.color,
            sortOrder: categoryData.sortOrder,
            isActive: categoryData.isActive,
            parentId: null, // Main category has no parent
          });

          createdCategories.push(category);
          console.log(
            `✅ Created main category: ${category.name} (ID: ${category.id})`
          );
        } catch (error) {
          console.error(
            `❌ Failed to create category '${categoryData.name}':`,
            error.message
          );
          if (error.name === "SequelizeUniqueConstraintError") {
            console.error(
              `   Constraint violation: ${error.errors
                .map((e) => e.message)
                .join(", ")}`
            );
          }
        }
      }

      // Ask user if they want to create subcategories
      const readline = require("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const createSubcategories = await new Promise((resolve) => {
        rl.question(
          "Do you want to create subcategories as well? (y/n): ",
          (answer) => {
            resolve(
              answer.toLowerCase() === "y" || answer.toLowerCase() === "yes"
            );
          }
        );
      });

      rl.close();

      if (createSubcategories) {
        // Create subcategories
        console.log("🏗️  Creating subcategories...");
        for (const [parentName, subcategories] of Object.entries(
          subcategoriesData
        )) {
          const parentCategory = createdCategories.find(
            (cat) => cat.name === parentName
          );

          if (!parentCategory) {
            console.log(
              `⚠️  Parent category '${parentName}' not found, skipping subcategories...`
            );
            continue;
          }

          for (const subCatData of subcategories) {
            const fullName = `${parentName} - ${subCatData.name}`;
            const slug = createSlug(fullName);

            // Check if subcategory already exists
            const existingSubcategory = await Category.findOne({
              where: { name: fullName },
            });

            if (existingSubcategory) {
              console.log(
                `⚠️  Subcategory '${fullName}' already exists, skipping...`
              );
              continue;
            }

            try {
              const subcategory = await Category.create({
                uuid: uuidv4(),
                name: fullName,
                slug: slug,
                description: `${subCatData.name} under ${parentName} category`,
                icon: parentCategory.icon, // Inherit parent icon
                color: subCatData.color,
                sortOrder: subCatData.sortOrder,
                isActive: true,
                parentId: parentCategory.id, // Set parent relationship
              });

              createdSubcategories.push(subcategory);
              console.log(
                `✅ Created subcategory: ${subcategory.name} (ID: ${subcategory.id}, Parent: ${parentCategory.name})`
              );
            } catch (error) {
              console.error(
                `❌ Failed to create subcategory '${fullName}':`,
                error.message
              );
            }
          }
        }
      } else {
        console.log("⏭️  Skipping subcategories creation");
      }

      // Final count and summary
      const finalCount = await Category.count();
      const newCategories = finalCount - existingCount;

      console.log("==============================");
      console.log("🎉 Category seeding completed!");
      console.log("==============================");
      console.log(`📈 Created ${newCategories} new categories`);
      console.log(`📊 Total categories in database: ${finalCount}`);
      console.log(`🏷️  Main categories processed: ${createdCategories.length}`);
      if (createSubcategories) {
        console.log(
          `🏷️  Subcategories created: ${createdSubcategories.length}`
        );
      }

      // Show summary of all categories
      if (finalCount > 0) {
        console.log("\n📋 Current categories in database:");
        const allCategories = await Category.findAll({
          order: [
            ["sortOrder", "ASC"],
            ["name", "ASC"],
          ],
        });

        allCategories.forEach((cat) => {
          const prefix = cat.parentId ? "   ↳" : "📁";
          console.log(
            `${prefix} ${cat.name} (ID: ${cat.id}, Active: ${cat.isActive})`
          );
        });
      }

      return {
        success: true,
        created: newCategories,
        total: finalCount,
        mainCategories: createdCategories.length,
        subcategories: createdSubcategories.length,
      };
    } catch (error) {
      console.error("==============================");
      console.error("❌ Category seeding failed:");
      console.error("==============================");
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      if (error.sql) {
        console.error("SQL query:", error.sql);
      }
      if (error.parent) {
        console.error("Parent error:", error.parent);
      }
      throw error;
    }
  }

  // Method to clear all categories (use with caution!)
  static async clear() {
    try {
      console.log("==============================");
      console.log("🗑️  CLEARING ALL CATEGORIES");
      console.log("==============================");

      const readline = require("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const confirmed = await new Promise((resolve) => {
        rl.question(
          '⚠️  This will DELETE ALL CATEGORIES! Are you sure? (type "DELETE" to confirm): ',
          (answer) => {
            resolve(answer === "DELETE");
          }
        );
      });

      rl.close();

      if (!confirmed) {
        console.log("❌ Operation cancelled");
        return;
      }

      await sequelize.authenticate();

      // Delete subcategories first (due to foreign key constraints)
      const subcategoriesDeleted = await Category.destroy({
        where: { parentId: { [Op.ne]: null } },
      });

      // Then delete main categories
      const mainCategoriesDeleted = await Category.destroy({
        where: { parentId: null },
      });

      console.log(`🗑️  Deleted ${subcategoriesDeleted} subcategories`);
      console.log(`🗑️  Deleted ${mainCategoriesDeleted} main categories`);
      console.log("✅ All categories cleared successfully");

      return {
        subcategoriesDeleted,
        mainCategoriesDeleted,
        total: subcategoriesDeleted + mainCategoriesDeleted,
      };
    } catch (error) {
      console.error("❌ Failed to clear categories:", error);
      throw error;
    }
  }

  // Method to test database connection and show table info
  static async test() {
    try {
      console.log("==============================");
      console.log("🧪 Testing database connection and table structure");
      console.log("==============================");

      await sequelize.authenticate();
      console.log("✅ Database connection successful");

      // Show table structure
      const [tableInfo] = await sequelize.query("DESCRIBE categories");
      console.log("\n📋 Categories table structure:");
      tableInfo.forEach((column) => {
        console.log(
          `   ${column.Field}: ${column.Type} ${
            column.Null === "NO" ? "(NOT NULL)" : ""
          }`
        );
      });

      // Count existing categories
      const count = await Category.count();
      console.log(`\n📊 Current categories count: ${count}`);

      if (count > 0) {
        console.log("\n📋 Existing categories:");
        const categories = await Category.findAll({
          limit: 10,
          order: [["id", "ASC"]],
        });

        categories.forEach((cat) => {
          console.log(`   ${cat.id}: ${cat.name} (${cat.slug})`);
        });

        if (count > 10) {
          console.log(`   ... and ${count - 10} more`);
        }
      }

      console.log("\n✅ Database test completed successfully");
    } catch (error) {
      console.error("❌ Database test failed:", error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "seed";

  try {
    switch (command) {
      case "seed":
        await StandaloneCategorySeeder.run();
        break;
      case "clear":
        await StandaloneCategorySeeder.clear();
        break;
      case "test":
        await StandaloneCategorySeeder.test();
        break;
      default:
        console.log("Usage:");
        console.log("  node standaloneSeeder.js seed   - Seed categories");
        console.log("  node standaloneSeeder.js clear  - Clear all categories");
        console.log(
          "  node standaloneSeeder.js test   - Test database connection"
        );
    }
  } catch (error) {
    console.error("❌ Operation failed:", error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = StandaloneCategorySeeder;
