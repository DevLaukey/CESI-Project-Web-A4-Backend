// controllers/categoryController.js
const {
  Category,
  Restaurant,
  Item,
  RestaurantCategories,
} = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../config/database");

class CategoryController {
  // Get all categories with optional filtering
  static async getAllCategories(req, res) {
    try {
      console.log("=== GET ALL CATEGORIES DEBUG ===");
      console.log("Query params:", req.query);

      const {
        page = 1,
        limit = 50, // Increased default limit
        search,
        isActive,
        restaurantId,
        includeItems = false,
        includeRestaurants = false,
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};
      const include = [];

      // Filter by active status - fix boolean conversion
      if (isActive !== undefined) {
        whereClause.isActive = isActive === "true" || isActive === true;
      }

      // Search by name or description - use LIKE instead of iLike for MySQL compatibility
      if (search && search.trim()) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search.trim()}%` } },
          { description: { [Op.like]: `%${search.trim()}%` } },
        ];
      }

      // Include items if requested
      if (includeItems === "true" || includeItems === true) {
        include.push({
          model: Item,
          as: "items",
          attributes: ["id", "uuid", "name", "price", "isAvailable"],
          required: false, // LEFT JOIN instead of INNER JOIN
        });
      }

      // Include restaurants if requested
      if (includeRestaurants === "true" || includeRestaurants === true) {
        include.push({
          model: Restaurant,
          as: "restaurants",
          attributes: ["id", "uuid", "name", "isActive"],
          through: { attributes: [] }, // Exclude junction table attributes
          required: false, // LEFT JOIN
        });
      }

      // Filter by specific restaurant - this might be causing the empty results
      if (restaurantId && restaurantId.trim()) {
        // Remove the previous include if it exists and replace with filtered version
        const restaurantIncludeIndex = include.findIndex(
          (inc) => inc.model === Restaurant
        );
        if (restaurantIncludeIndex !== -1) {
          include[restaurantIncludeIndex] = {
            model: Restaurant,
            as: "restaurants",
            where: { uuid: restaurantId.trim() },
            attributes: ["id", "uuid", "name", "isActive"],
            through: { attributes: [] },
            required: true, // INNER JOIN when filtering
          };
        } else {
          include.push({
            model: Restaurant,
            as: "restaurants",
            where: { uuid: restaurantId.trim() },
            attributes: ["id", "uuid", "name", "isActive"],
            through: { attributes: [] },
            required: true, // INNER JOIN when filtering
          });
        }
      }

      console.log("Where clause:", JSON.stringify(whereClause, null, 2));
      console.log("Include array:", JSON.stringify(include, null, 2));

      // First, try a simple query without includes to test basic functionality
      if (include.length === 0) {
        console.log("Performing simple query without includes...");

        const simpleResult = await Category.findAndCountAll({
          where: whereClause,
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [
            ["sortOrder", "ASC"],
            ["name", "ASC"],
          ],
        });

        console.log("Simple query result count:", simpleResult.count);
        console.log("Simple query rows:", simpleResult.rows.length);

        if (simpleResult.count === 0) {
          // Check if there are any categories at all
          const totalCategories = await Category.count();
          console.log("Total categories in database:", totalCategories);

          if (totalCategories === 0) {
            return res.json({
              success: true,
              message: "No categories found in database",
              data: {
                categories: [],
                pagination: {
                  currentPage: parseInt(page),
                  totalPages: 0,
                  totalCount: 0,
                  hasNext: false,
                  hasPrev: false,
                },
              },
            });
          }
        }
      }

      // Perform the main query
      console.log("Performing main query with includes...");
      const { count, rows: categories } = await Category.findAndCountAll({
        where: whereClause,
        include,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [
          ["sortOrder", "ASC"],
          ["name", "ASC"],
        ],
        distinct: true, // Important for accurate count with includes
      });

      console.log("Main query result count:", count);
      console.log("Main query rows:", categories.length);

      const totalPages = Math.ceil(count / parseInt(limit));

      // Transform the data to ensure consistent response format
      const transformedCategories = categories.map((category) => {
        const categoryData = category.toJSON();

        // Ensure arrays exist even if empty
        if (!categoryData.items && includeItems) {
          categoryData.items = [];
        }
        if (!categoryData.restaurants && includeRestaurants) {
          categoryData.restaurants = [];
        }

        return categoryData;
      });

      console.log(
        "Transformed categories count:",
        transformedCategories.length
      );

      res.json({
        success: true,
        data: {
          categories: transformedCategories,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount: count,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1,
            limit: parseInt(limit),
          },
        },
      });
    } catch (error) {
      console.error("=== ERROR IN GET ALL CATEGORIES ===");
      console.error("Error details:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);

      if (error.sql) {
        console.error("SQL Query:", error.sql);
      }

      res.status(500).json({
        success: false,
        message: "Error fetching categories",
        error: error.message,
        debug:
          process.env.NODE_ENV === "development"
            ? {
                name: error.name,
                sql: error.sql,
                original: error.original,
              }
            : undefined,
      });
    }
  }

  // Get single category by UUID
  static async getCategoryByUuid(req, res) {
    try {
      const { uuid } = req.params;
      const { includeItems = false, includeRestaurants = false } = req.query;

      console.log(`Fetching category with UUID: ${uuid}`);

      const include = [];

      if (includeItems === "true" || includeItems === true) {
        include.push({
          model: Item,
          as: "items",
          where: { isAvailable: true },
          required: false,
        });
      }

      if (includeRestaurants === "true" || includeRestaurants === true) {
        include.push({
          model: Restaurant,
          as: "restaurants",
          attributes: ["id", "uuid", "name", "isActive"],
          through: { attributes: [] },
          required: false,
        });
      }

      const category = await Category.findOne({
        where: { uuid },
        include,
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching category",
        error: error.message,
      });
    }
  }

  // Test endpoint to check basic category functionality
  static async testCategories(req, res) {
    try {
      console.log("=== CATEGORY TEST ENDPOINT ===");

      // Count total categories
      const totalCount = await Category.count();
      console.log("Total categories:", totalCount);

      // Get first 5 categories without any includes
      const simpleCategories = await Category.findAll({
        limit: 5,
        order: [["id", "ASC"]],
      });
      console.log("Simple categories:", simpleCategories.length);

      // Get categories with restaurants
      const categoriesWithRestaurants = await Category.findAll({
        include: [
          {
            model: Restaurant,
            as: "restaurants",
            required: false,
            through: { attributes: [] },
          },
        ],
        limit: 5,
      });
      console.log(
        "Categories with restaurants:",
        categoriesWithRestaurants.length
      );

      res.json({
        success: true,
        debug: {
          totalCount,
          simpleCategories: simpleCategories.map((c) => ({
            id: c.id,
            name: c.name,
            isActive: c.isActive,
          })),
          categoriesWithRestaurants: categoriesWithRestaurants.map((c) => ({
            id: c.id,
            name: c.name,
            restaurantCount: c.restaurants ? c.restaurants.length : 0,
          })),
        },
      });
    } catch (error) {
      console.error("Test categories error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Create new category
  static async createCategory(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const {
        name,
        description,
        icon,
        color = "#000000",
        isActive = true,
        sortOrder = 0,
        restaurantIds = [], // Array of restaurant UUIDs to associate
      } = req.body;

      console.log("Creating category with data:", {
        name,
        description,
        icon,
        color,
        isActive,
        sortOrder,
      });

      // Validate required fields
      if (!name || !name.trim()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Category name is required",
        });
      }

      // Check if category name already exists
      const existingCategory = await Category.findOne({
        where: { name: name.trim() },
      });

      if (existingCategory) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: "Category with this name already exists",
        });
      }

      // Validate color format (hex)
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      if (color && !hexColorRegex.test(color)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Invalid color format. Use hex format (#RRGGBB)",
        });
      }

      // Create category
      const category = await Category.create(
        {
          name: name.trim(),
          description: description ? description.trim() : null,
          icon,
          color,
          isActive,
          sortOrder: parseInt(sortOrder) || 0,
        },
        { transaction }
      );

      console.log("Category created with ID:", category.id);

      // Associate with restaurants if provided
      if (restaurantIds && restaurantIds.length > 0) {
        const restaurants = await Restaurant.findAll({
          where: { uuid: { [Op.in]: restaurantIds } },
          transaction,
        });

        if (restaurants.length !== restaurantIds.length) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "One or more restaurant IDs are invalid",
          });
        }

        await category.setRestaurants(restaurants, { transaction });
      }

      await transaction.commit();

      // Fetch the created category with associations
      const createdCategory = await Category.findOne({
        where: { id: category.id },
        include: [
          {
            model: Restaurant,
            as: "restaurants",
            attributes: ["id", "uuid", "name"],
            through: { attributes: [] },
            required: false,
          },
        ],
      });

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: createdCategory,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error creating category:", error);
      res.status(500).json({
        success: false,
        message: "Error creating category",
        error: error.message,
      });
    }
  }

  // Update category
  static async updateCategory(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { uuid } = req.params;
      const {
        name,
        description,
        icon,
        color,
        isActive,
        sortOrder,
        restaurantIds,
      } = req.body;

      const category = await Category.findOne({
        where: { uuid },
        transaction,
      });

      if (!category) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // Check for name uniqueness if name is being updated
      if (name && name.trim() !== category.name) {
        const existingCategory = await Category.findOne({
          where: {
            name: name.trim(),
            id: { [Op.ne]: category.id },
          },
        });

        if (existingCategory) {
          await transaction.rollback();
          return res.status(409).json({
            success: false,
            message: "Category with this name already exists",
          });
        }
      }

      // Validate color format if provided
      if (color) {
        const hexColorRegex = /^#[0-9A-F]{6}$/i;
        if (!hexColorRegex.test(color)) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Invalid color format. Use hex format (#RRGGBB)",
          });
        }
      }

      // Update category fields
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined)
        updateData.description = description ? description.trim() : null;
      if (icon !== undefined) updateData.icon = icon;
      if (color !== undefined) updateData.color = color;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (sortOrder !== undefined)
        updateData.sortOrder = parseInt(sortOrder) || 0;

      await category.update(updateData, { transaction });

      // Update restaurant associations if provided
      if (restaurantIds !== undefined) {
        if (restaurantIds.length > 0) {
          const restaurants = await Restaurant.findAll({
            where: { uuid: { [Op.in]: restaurantIds } },
            transaction,
          });

          if (restaurants.length !== restaurantIds.length) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: "One or more restaurant IDs are invalid",
            });
          }

          await category.setRestaurants(restaurants, { transaction });
        } else {
          // Remove all restaurant associations
          await category.setRestaurants([], { transaction });
        }
      }

      await transaction.commit();

      // Fetch updated category with associations
      const updatedCategory = await Category.findOne({
        where: { uuid },
        include: [
          {
            model: Restaurant,
            as: "restaurants",
            attributes: ["id", "uuid", "name"],
            through: { attributes: [] },
            required: false,
          },
        ],
      });

      res.json({
        success: true,
        message: "Category updated successfully",
        data: updatedCategory,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating category:", error);
      res.status(500).json({
        success: false,
        message: "Error updating category",
        error: error.message,
      });
    }
  }

  // Delete category
  static async deleteCategory(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { uuid } = req.params;

      const category = await Category.findOne({
        where: { uuid },
        include: [
          {
            model: Item,
            as: "items",
            attributes: ["id"],
            required: false,
          },
        ],
        transaction,
      });

      if (!category) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // Check if category has items
      if (category.items && category.items.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Cannot delete category that contains items. Please move or delete all items first.",
        });
      }

      // Remove restaurant associations
      await category.setRestaurants([], { transaction });

      // Delete category
      await category.destroy({ transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error deleting category:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting category",
        error: error.message,
      });
    }
  }

  // Get categories for a specific restaurant
  static async getRestaurantCategories(req, res) {
    try {
      const { restaurantUuid } = req.params;
      const { includeItems = false, activeOnly = true } = req.query;

      console.log(`Fetching categories for restaurant: ${restaurantUuid}`);

      const restaurant = await Restaurant.findOne({
        where: { uuid: restaurantUuid },
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found",
        });
      }

      const whereClause = {};
      if (activeOnly === "true" || activeOnly === true) {
        whereClause.isActive = true;
      }

      const include = [
        {
          model: Restaurant,
          as: "restaurants",
          where: { uuid: restaurantUuid },
          attributes: [],
          through: { attributes: [] },
          required: true, // INNER JOIN to only get categories associated with this restaurant
        },
      ];

      if (includeItems === "true" || includeItems === true) {
        include.push({
          model: Item,
          as: "items",
          where: { isAvailable: true },
          required: false,
        });
      }

      const categories = await Category.findAll({
        where: whereClause,
        include,
        order: [
          ["sortOrder", "ASC"],
          ["name", "ASC"],
        ],
      });

      console.log(`Found ${categories.length} categories for restaurant`);

      res.json({
        success: true,
        data: categories,
        count: categories.length,
      });
    } catch (error) {
      console.error("Error fetching restaurant categories:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching restaurant categories",
        error: error.message,
      });
    }
  }

  // Add category to restaurant
  static async addCategoryToRestaurant(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { restaurantUuid, categoryUuid } = req.params;

      const restaurant = await Restaurant.findOne({
        where: { uuid: restaurantUuid },
        transaction,
      });

      const category = await Category.findOne({
        where: { uuid: categoryUuid },
        transaction,
      });

      if (!restaurant) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Restaurant not found",
        });
      }

      if (!category) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // Check if association already exists
      const existingAssociation = await RestaurantCategories.findOne({
        where: {
          restaurantId: restaurant.id,
          categoryId: category.id,
        },
        transaction,
      });

      if (existingAssociation) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: "Category is already associated with this restaurant",
        });
      }

      await restaurant.addCategory(category, { transaction });
      await transaction.commit();

      res.json({
        success: true,
        message: "Category added to restaurant successfully",
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error adding category to restaurant:", error);
      res.status(500).json({
        success: false,
        message: "Error adding category to restaurant",
        error: error.message,
      });
    }
  }

  // Remove category from restaurant
  static async removeCategoryFromRestaurant(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { restaurantUuid, categoryUuid } = req.params;

      const restaurant = await Restaurant.findOne({
        where: { uuid: restaurantUuid },
        transaction,
      });

      const category = await Category.findOne({
        where: { uuid: categoryUuid },
        transaction,
      });

      if (!restaurant) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Restaurant not found",
        });
      }

      if (!category) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      await restaurant.removeCategory(category, { transaction });
      await transaction.commit();

      res.json({
        success: true,
        message: "Category removed from restaurant successfully",
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error removing category from restaurant:", error);
      res.status(500).json({
        success: false,
        message: "Error removing category from restaurant",
        error: error.message,
      });
    }
  }

  // Reorder categories
  static async reorderCategories(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { categories } = req.body;

      if (!Array.isArray(categories)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Categories must be an array",
        });
      }

      // Validate and update sort orders
      const updatePromises = categories.map(async (item, index) => {
        const { uuid } = item;
        const sortOrder = index + 1;

        const category = await Category.findOne({
          where: { uuid },
          transaction,
        });

        if (!category) {
          throw new Error(`Category with UUID ${uuid} not found`);
        }

        return category.update({ sortOrder }, { transaction });
      });

      await Promise.all(updatePromises);
      await transaction.commit();

      res.json({
        success: true,
        message: "Categories reordered successfully",
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error reordering categories:", error);
      res.status(500).json({
        success: false,
        message: "Error reordering categories",
        error: error.message,
      });
    }
  }
}

module.exports = CategoryController;
