const { Item, Restaurant, Category } = require("../models");
const { Op } = require("sequelize");
const {
  itemValidation,
  updateItemValidation,
  formatValidationError,
  validateItem,
} = require("../validators/itemValidator");

class ItemController {
  // Create new item with improved validation
  static async createItem(req, res, next) {
    try {
      // Use the validation with better error formatting
      const { error, value } = itemValidation.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        return res.status(400).json(formatValidationError(error));
      }

      const ownerId = req.user?.uuid || req.headers["x-user-id"];

      // Validate restaurant ownership
      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
          message:
            "No restaurant found for your account. Please set up your restaurant first.",
        });
      }

      // Validate category exists
      const category = await Category.findByPk(value.categoryId);
      if (!category) {
        return res.status(400).json({
          success: false,
          error: "Invalid category",
          message: "The selected category does not exist",
          fieldErrors: {
            categoryId: "Please select a valid category",
          },
        });
      }

      // Check for duplicate item name in same restaurant
      const existingItem = await Item.findOne({
        where: {
          restaurantId: restaurant.id,
          name: value.name.trim(),
        },
      });

      if (existingItem) {
        return res.status(400).json({
          success: false,
          error: "Duplicate item",
          message: "An item with this name already exists in your restaurant",
          fieldErrors: {
            name: "This item name is already taken",
          },
        });
      }

      // Validate original price is higher than price
      if (value.originalPrice && value.originalPrice <= value.price) {
        return res.status(400).json({
          success: false,
          error: "Invalid pricing",
          message: "Original price must be higher than the current price",
          fieldErrors: {
            originalPrice: "Original price must be higher than current price",
          },
        });
      }

      // Create the item
      const item = await Item.create({
        restaurantId: restaurant.id,
        ...value,
      });

      // Fetch the created item with category info
      const itemWithCategory = await Item.findByPk(item.id, {
        include: [{ model: Category, as: "category" }],
      });

      res.status(201).json({
        success: true,
        message: "Item created successfully",
        item: itemWithCategory,
      });
    } catch (error) {
      console.error("Error creating item:", error);

      // Handle specific database errors
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(400).json({
          success: false,
          error: "Duplicate entry",
          message: "An item with this information already exists",
        });
      }

      if (error.name === "SequelizeValidationError") {
        return res.status(400).json({
          success: false,
          error: "Database validation error",
          message: "The provided data does not meet database requirements",
        });
      }

      next(error);
    }
  }
  
  // Get restaurant items by UUID with better error handling
  static async getRestaurantItemsByUuid(req, res, next) {
    try {
      const { restaurantUuid } = req.params;

 
      // Validate restaurant UUID
      if (!restaurantUuid || typeof restaurantUuid !== "string") {
        return res.status(400).json({
          success: false,
          error: "Invalid restaurant ID",
          message: "Please provide a valid restaurant ID",
        });
      }
      const restaurant = await Restaurant.findOne({
        where: { uuid: restaurantUuid, isActive: true },
      });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
          message: "No restaurant found with the provided ID",
        });

      }
     
      return res.json({
        success: true,
        message: "Restaurant items fetched successfully",
        items: await Item.findAll({
          where: { restaurantId: restaurant.id, isAvailable: true },
          include: [{ model: Category, as: "category" }],
          order: [["sortOrder", "ASC"], ["isPopular", "DESC"]],
        }),
      });
      

    } catch (error) {
      console.error("Error fetching restaurant items by UUID:", error);
      next(error);
    }
  }

  // Get restaurant items with better error handling
  static async getRestaurantItems(req, res, next) {
    try {
      const ownerId = req.user?.uuid || req.headers["x-user-id"];
      const {
        categoryId,
        isAvailable,
        search,
        q, // Support both 'search' and 'q' parameters
        page = 1,
        limit = 50,
        minPrice,
        maxPrice,
        allergens,
      } = req.query;

      // Validate pagination parameters
      const validPage = Math.max(1, parseInt(page) || 1);
      const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 50));

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
          message: "No restaurant found for your account",
        });
      }

      const whereClause = { restaurantId: restaurant.id };

      // Apply filters
      if (categoryId) {
        const categoryExists = await Category.findByPk(categoryId);
        if (categoryExists) {
          whereClause.categoryId = categoryId;
        }
      }

      if (isAvailable !== undefined) {
        whereClause.isAvailable = isAvailable === "true";
      }

      // Search functionality
      const searchTerm = search || q;
      if (searchTerm && searchTerm.trim()) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${searchTerm.trim()}%` } },
          { description: { [Op.like]: `%${searchTerm.trim()}%` } },
        ];
      }

      // Price filters
      if (minPrice && !isNaN(parseFloat(minPrice))) {
        whereClause.price = {
          ...whereClause.price,
          [Op.gte]: parseFloat(minPrice),
        };
      }

      if (maxPrice && !isNaN(parseFloat(maxPrice))) {
        whereClause.price = {
          ...whereClause.price,
          [Op.lte]: parseFloat(maxPrice),
        };
      }

      // Allergen filters
      if (allergens) {
        const allergenList = allergens
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean);
        if (allergenList.length > 0) {
          whereClause.allergens = { [Op.overlap]: allergenList };
        }
      }

      const { count, rows: items } = await Item.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["id", "name"],
          },
        ],
        order: [
          ["sortOrder", "ASC"],
          ["isPopular", "DESC"],
        ],
        limit: validLimit,
        offset: (validPage - 1) * validLimit,
      });

      res.json({
        success: true,
        items,
        pagination: {
          currentPage: validPage,
          totalPages: Math.ceil(count / validLimit),
          totalCount: count,
          limit: validLimit,
          hasNextPage: validPage < Math.ceil(count / validLimit),
          hasPrevPage: validPage > 1,
        },
        filters: {
          categoryId,
          isAvailable,
          search: searchTerm,
          minPrice,
          maxPrice,
          allergens,
        },
      });
    } catch (error) {
      console.error("Error fetching restaurant items:", error);
      next(error);
    }
  }

  // Update item with better validation
  static async updateItem(req, res, next) {
    try {
      const { itemUuid } = req.params;

      // Validate item UUID format
      if (!itemUuid || typeof itemUuid !== "string") {
        return res.status(400).json({
          success: false,
          error: "Invalid item ID",
          message: "Please provide a valid item ID",
        });
      }

      const { error, value } = updateItemValidation.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        return res.status(400).json(formatValidationError(error));
      }

      const ownerId = req.user?.uuid || req.headers["x-user-id"];

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
          message: "No restaurant found for your account",
        });
      }

      const item = await Item.findOne({
        where: {
          [Op.or]: [
            { uuid: itemUuid },
            { id: !isNaN(itemUuid) ? parseInt(itemUuid) : null },
          ].filter(Boolean),
          restaurantId: restaurant.id,
        },
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          error: "Item not found",
          message:
            "The item you are trying to update does not exist or does not belong to your restaurant",
        });
      }

      // Validate category if provided
      if (value.categoryId) {
        const category = await Category.findByPk(value.categoryId);
        if (!category) {
          return res.status(400).json({
            success: false,
            error: "Invalid category",
            message: "The selected category does not exist",
            fieldErrors: {
              categoryId: "Please select a valid category",
            },
          });
        }
      }

      // Validate pricing if both prices are provided
      if (value.originalPrice && (value.price || item.price)) {
        const currentPrice = value.price || item.price;
        if (value.originalPrice <= currentPrice) {
          return res.status(400).json({
            success: false,
            error: "Invalid pricing",
            message: "Original price must be higher than the current price",
            fieldErrors: {
              originalPrice: "Original price must be higher than current price",
            },
          });
        }
      }

      // Check for duplicate name if name is being updated
      if (value.name && value.name !== item.name) {
        const existingItem = await Item.findOne({
          where: {
            restaurantId: restaurant.id,
            name: value.name.trim(),
            id: { [Op.ne]: item.id },
          },
        });

        if (existingItem) {
          return res.status(400).json({
            success: false,
            error: "Duplicate item name",
            message: "An item with this name already exists in your restaurant",
            fieldErrors: {
              name: "This item name is already taken",
            },
          });
        }
      }

      await item.update(value);

      const updatedItem = await Item.findByPk(item.id, {
        include: [{ model: Category, as: "category" }],
      });

      res.json({
        success: true,
        message: "Item updated successfully",
        item: updatedItem,
      });
    } catch (error) {
      console.error("Error updating item:", error);

      if (error.name === "SequelizeValidationError") {
        return res.status(400).json({
          success: false,
          error: "Database validation error",
          message: "The provided data does not meet database requirements",
        });
      }

      next(error);
    }
  }

  // Delete item with better validation
  static async deleteItem(req, res, next) {
    try {
      const { itemUuid } = req.params;

      if (!itemUuid) {
        return res.status(400).json({
          success: false,
          error: "Invalid item ID",
          message: "Please provide a valid item ID",
        });
      }

      const ownerId = req.user?.uuid || req.headers["x-user-id"];

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
          message: "No restaurant found for your account",
        });
      }

      const item = await Item.findOne({
        where: {
          [Op.or]: [
            { uuid: itemUuid },
            { id: !isNaN(itemUuid) ? parseInt(itemUuid) : null },
          ].filter(Boolean),
          restaurantId: restaurant.id,
        },
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          error: "Item not found",
          message:
            "The item you are trying to delete does not exist or does not belong to your restaurant",
        });
      }

      await item.destroy();

      res.json({
        success: true,
        message: "Item deleted successfully",
        deletedItem: {
          id: item.id,
          uuid: item.uuid,
          name: item.name,
        },
      });
    } catch (error) {
      console.error("Error deleting item:", error);
      next(error);
    }
  }

  // Toggle availability with better error handling
  static async toggleAvailability(req, res, next) {
    try {
      const { itemUuid } = req.params;
      const ownerId = req.user?.uuid || req.headers["x-user-id"];

      const restaurant = await Restaurant.findOne({ where: { ownerId } });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
          message: "No restaurant found for your account",
        });
      }

      const item = await Item.findOne({
        where: {
          [Op.or]: [
            { uuid: itemUuid },
            { id: !isNaN(itemUuid) ? parseInt(itemUuid) : null },
          ].filter(Boolean),
          restaurantId: restaurant.id,
        },
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          error: "Item not found",
          message:
            "The item does not exist or does not belong to your restaurant",
        });
      }

      const newAvailability = !item.isAvailable;
      await item.update({ isAvailable: newAvailability });

      res.json({
        success: true,
        message: `Item ${
          newAvailability ? "made available" : "made unavailable"
        }`,
        item: {
          id: item.id,
          uuid: item.uuid,
          name: item.name,
          isAvailable: newAvailability,
        },
      });
    } catch (error) {
      console.error("Error toggling item availability:", error);
      next(error);
    }
  }

  // Additional helper methods...
  static async getPopularItems(req, res, next) {
    try {
      const { restaurantUuid, limit = 10 } = req.query;
      const validLimit = Math.min(50, Math.max(1, parseInt(limit) || 10));

      const whereClause = {
        isAvailable: true,
        isPopular: true,
      };

      if (restaurantUuid) {
        const restaurant = await Restaurant.findOne({
          where: { uuid: restaurantUuid, isActive: true },
        });
        if (restaurant) {
          whereClause.restaurantId = restaurant.id;
        }
      }

      const items = await Item.findAll({
        where: whereClause,
        include: [
          { model: Category, as: "category" },
          {
            model: Restaurant,
            as: "restaurant",
            attributes: ["uuid", "name", "rating"],
          },
        ],
        order: [
          ["orderCount", "DESC"],
          ["rating", "DESC"],
        ],
        limit: validLimit,
      });

      res.json({
        success: true,
        items,
        count: items.length,
      });
    } catch (error) {
      console.error("Error fetching popular items:", error);
      next(error);
    }
  }

  static async searchItems(req, res, next) {
    try {
      const { q, city, categoryId, page = 1, limit = 20 } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Invalid search query",
          message: "Search query must be at least 2 characters long",
        });
      }

      const validPage = Math.max(1, parseInt(page) || 1);
      const validLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));

      const itemWhereClause = {
        isAvailable: true,
        [Op.or]: [
          { name: { [Op.like]: `%${q.trim()}%` } },
          { description: { [Op.like]: `%${q.trim()}%` } },
        ],
      };

      if (categoryId) itemWhereClause.categoryId = categoryId;

      const restaurantWhereClause = {
        isActive: true,
        isOpen: true,
      };

      if (city) restaurantWhereClause.city = city;

      const { count, rows: items } = await Item.findAndCountAll({
        where: itemWhereClause,
        include: [
          {
            model: Restaurant,
            as: "restaurant",
            where: restaurantWhereClause,
            attributes: [
              "uuid",
              "name",
              "city",
              "rating",
              "deliveryFee",
              "averageDeliveryTime",
            ],
          },
          { model: Category, as: "category" },
        ],
        order: [
          ["rating", "DESC"],
          ["orderCount", "DESC"],
        ],
        limit: validLimit,
        offset: (validPage - 1) * validLimit,
      });

      res.json({
        success: true,
        items,
        pagination: {
          currentPage: validPage,
          totalPages: Math.ceil(count / validLimit),
          totalCount: count,
          limit: validLimit,
        },
        searchQuery: q.trim(),
      });
    } catch (error) {
      console.error("Error searching items:", error);
      next(error);
    }
  }
}

module.exports = ItemController;
