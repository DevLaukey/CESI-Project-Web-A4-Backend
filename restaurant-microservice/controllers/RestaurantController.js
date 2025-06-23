const {
  Restaurant,
  Item,
  Menu,
  Category,
  RestaurantStats,
  Review,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");
const {
  restaurantValidation,
  updateRestaurantValidation,
} = require("../validators/restaurantValidator");

class RestaurantController {
  // Helper method to get user ID
  static getUserID(req) {
    return req.user?.uuid || req.headers["x-user-id"];
  }

  // Create restaurant profile
  static async createRestaurant(req, res, next) {
    const transaction = await sequelize.transaction();

    try {
      console.log("=== RESTAURANT CREATION DEBUG ===");
      console.log("1. Request body:", JSON.stringify(req.body, null, 2));
      console.log("2. Request headers:", req.headers);

      // Validation
      const { error, value } = restaurantValidation.validate(req.body);
      if (error) {
        console.log("3. Validation error:", error.details);
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          details: error.details.map((detail) => detail.message),
        });
      }

      console.log(
        "3. Validation passed. Validated data:",
        JSON.stringify(value, null, 2)
      );

      // Get owner ID
      const ownerId = RestaurantController.getUserID(req);
      console.log("4. Owner ID:", ownerId);

      if (!ownerId) {
        await transaction.rollback();
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "Owner ID is required",
        });
      }

      // Check if restaurant already exists for this owner
      console.log("5. Checking for existing restaurant...");
      const existingRestaurant = await Restaurant.findOne({
        where: { ownerId },
        transaction,
      });

      if (existingRestaurant) {
        console.log("6. Restaurant already exists for owner:", ownerId);
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: "Restaurant already exists",
          message: "You already have a restaurant registered",
        });
      }

      console.log(
        "6. No existing restaurant found. Proceeding with creation..."
      );

      // Prepare restaurant data
      const restaurantData = {
        ownerId,
        ...value,
      };

      console.log(
        "7. Final restaurant data to be saved:",
        JSON.stringify(restaurantData, null, 2)
      );

      // Create restaurant with transaction
      console.log("8. Attempting to create restaurant in database...");
      const restaurant = await Restaurant.create(restaurantData, {
        transaction,
      });

      console.log("9. Restaurant created successfully with ID:", restaurant.id);
      console.log(
        "10. Created restaurant data:",
        JSON.stringify(restaurant.toJSON(), null, 2)
      );

      // Commit transaction
      await transaction.commit();
      console.log("11. Transaction committed successfully");

      // Return the created restaurant
      const responseData = restaurant.toSafeJSON
        ? restaurant.toSafeJSON()
        : restaurant.toJSON();

      console.log(
        "12. Sending response:",
        JSON.stringify(responseData, null, 2)
      );

      res.status(201).json({
        success: true,
        message: "Restaurant created successfully",
        restaurant: responseData,
      });
    } catch (error) {
      console.error("=== RESTAURANT CREATION ERROR ===");
      console.error("Error details:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);

      if (error.sql) {
        console.error("SQL Query:", error.sql);
      }

      if (error.original) {
        console.error("Original error:", error.original);
      }

      await transaction.rollback();
      console.log("Transaction rolled back");

      // Handle specific database errors
      if (error.name === "SequelizeValidationError") {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({
          success: false,
          error: "Database Validation Error",
          details: error.errors.map((err) => ({
            field: err.path,
            message: err.message,
            value: err.value,
            validatorKey: err.validatorKey,
          })),
        });
      }

      if (error.name === "SequelizeUniqueConstraintError") {
        console.error("Unique constraint errors:", error.errors);
        return res.status(409).json({
          success: false,
          error: "Duplicate Entry",
          message: "A restaurant with this information already exists",
          details: error.errors.map((err) => ({
            field: err.path,
            message: err.message,
            value: err.value,
          })),
        });
      }

      if (error.name === "SequelizeForeignKeyConstraintError") {
        console.error("Foreign key constraint error:", error.fields);
        return res.status(400).json({
          success: false,
          error: "Foreign Key Error",
          message: "Referenced record does not exist",
          field: error.fields,
        });
      }

      if (error.name === "SequelizeDatabaseError") {
        console.error("Database error:", error.parent);
        return res.status(500).json({
          success: false,
          error: "Database Error",
          message: "There was an issue with the database operation",
          details: error.parent?.message || error.message,
        });
      }

      next(error);
    }
  }

  // Search restaurants by name or description
  static async searchRestaurants(req, res, next) {
    try {
      const { query } = req.query;
      if (!query || query.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "Invalid Query",
          message: "Search query cannot be empty",
        });
      }
      const restaurants = await Restaurant.findAll({
        where: {
          isActive: true,
          [Op.or]: [
            { name: { [Op.iLike]: `%${query}%` } },
            { description: { [Op.iLike]: `%${query}%` } },
          ],
        },
        include: [
          {
            model: Item,
            as: "items",
            where: { isAvailable: true },
            required: false,
            limit: 3,

            order: [
              ["isPopular", "DESC"],
              ["rating", "DESC"],
            ],
          },
        ],
        order: [["rating", "DESC"]],
        limit: 20,
      });
      const restaurantsWithStatus = restaurants.map((restaurant) => {
        const restaurantData = restaurant.toSafeJSON
          ? restaurant.toSafeJSON()
          : restaurant.toJSON();
        if (typeof restaurant.isOpenNow === "function") {
          restaurantData.isOpenNow = restaurant.isOpenNow();
        }
        return restaurantData;
      });
      res.json({
        success: true,
        restaurants: restaurantsWithStatus,
      });
    } catch (error) {
      console.error("Error searching restaurants:", error);
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "An error occurred while searching for restaurants",
      });
      next(error);
    }
  }

  // Get restaurant by ID
  static async getRestaurant(req, res, next) {
    try {
      const { uuid } = req.params;

      const restaurant = await Restaurant.findOne({
        where: { uuid, isActive: true },
        include: [
          {
            model: Item,
            as: "items",
            where: { isAvailable: true },
            required: false,
            include: [{ model: Category, as: "category" }],
          },
          {
            model: Menu,
            as: "menus",
            where: { isAvailable: true },
            required: false,
            include: [
              {
                model: Item,
                as: "items",
                through: {
                  attributes: ["quantity", "isOptional", "extraPrice"],
                },
              },
            ],
          },
          {
            model: Review,
            as: "reviews",
            where: { isVisible: true },
            required: false,
            limit: 5,
          },
        ],
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
          message: "No active restaurant found with the provided ID",
        });
      }

      // Add calculated fields
      const restaurantData = restaurant.toSafeJSON
        ? restaurant.toSafeJSON()
        : restaurant.toJSON();

      // Add isOpenNow if method exists
      if (typeof restaurant.isOpenNow === "function") {
        restaurantData.isOpenNow = restaurant.isOpenNow();
      }

      // Add distance if coordinates provided
      const { lat, lng } = req.query;
      if (lat && lng && typeof restaurant.calculateDistance === "function") {
        restaurantData.distance = restaurant.calculateDistance(
          parseFloat(lat),
          parseFloat(lng)
        );
      }

      res.json({
        success: true,
        restaurant: restaurantData,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all restaurants with pagination and sorting
  static async getAllRestaurants(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "rating",
        sortOrder = "DESC",
      } = req.query;

      const { count, rows: restaurants } = await Restaurant.findAndCountAll({
        where: { isActive: true },
        include: [
          {
            model: Item,
            as: "items",
            where: { isAvailable: true },
            required: false,
            limit: 3,
            order: [
              ["isPopular", "DESC"],
              ["rating", "DESC"],
            ],
          },
        ],
        limit: Math.min(parseInt(limit), 50),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [[sortBy, sortOrder.toUpperCase()]],
      });

      const restaurantsWithStatus = restaurants.map((restaurant) => {
        const restaurantData = restaurant.toSafeJSON
          ? restaurant.toSafeJSON()
          : restaurant.toJSON();

        if (typeof restaurant.isOpenNow === "function") {
          restaurantData.isOpenNow = restaurant.isOpenNow();
        }

        return restaurantData;
      });

      res.json({
        success: true,
        restaurants: restaurantsWithStatus,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalCount: count,
          hasNextPage: parseInt(page) < Math.ceil(count / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get owner's restaurant
  static async getMyRestaurant(req, res, next) {
    try {
      const ownerId = RestaurantController.getUserID(req);

      const restaurant = await Restaurant.findOne({
        where: { ownerId },
        include: [
          {
            model: Item,
            as: "items",
            include: [{ model: Category, as: "category" }],
          },
          { model: Menu, as: "menus", include: [{ model: Item, as: "items" }] },
          {
            model: RestaurantStats,
            as: "stats",
            limit: 30,
            order: [["date", "DESC"]],
          },
        ],
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
          message: "No restaurant found for your account",
        });
      }

      res.json({
        success: true,
        restaurant: restaurant.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  // Update restaurant
  static async updateRestaurant(req, res, next) {
    try {
      const { error, value } = updateRestaurantValidation.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          details: error.details.map((detail) => detail.message),
        });
      }

      const ownerId = RestaurantController.getUserID(req);
      const restaurant = await Restaurant.findOne({ where: { ownerId } });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
          message: "No restaurant found for your account",
        });
      }

      await restaurant.update(value);

      const responseData = restaurant.toSafeJSON
        ? restaurant.toSafeJSON()
        : restaurant.toJSON();

      res.json({
        success: true,
        message: "Restaurant updated successfully",
        restaurant: responseData,
      });
    } catch (error) {
      next(error);
    }
  }


  // Get restaurant statistics
  static async getStatistics(req, res, next) {
    try {
      const ownerId = RestaurantController.getUserID(req);

      const restaurant = await Restaurant.findOne({
        where: { ownerId },
        include: [
          {
            model: RestaurantStats,
            as: "stats",
            order: [["date", "DESC"]],
          },
        ],
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
          message: "No restaurant found for your account",
        });
      }

      const stats = restaurant.stats.map((stat) => stat.toJSON());

      res.json({
        success: true,
        statistics: stats,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Toggle restaurant status (open/closed)
  static async toggleStatus(req, res, next) {
    try {
      const ownerId = RestaurantController.getUserID(req);
      const { isOpen } = req.body;

      const restaurant = await Restaurant.findOne({ where: { ownerId } });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      await restaurant.update({
        isOpen: typeof isOpen === "boolean" ? isOpen : !restaurant.isOpen,
      });

      res.json({
        success: true,
        message: `Restaurant ${
          restaurant.isOpen ? "opened" : "closed"
        } successfully`,
        isOpen: restaurant.isOpen,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RestaurantController;
