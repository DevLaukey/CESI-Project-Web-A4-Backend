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

  
  getUserID = (req) => {
    return req.user?.uuid || req.headers["x-user-id"];
  };

  // Create restaurant profile
  static async createRestaurant(req, res, next) {
    try {
      const { error, value } = restaurantValidation.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          details: error.details.map((detail) => detail.message),
        });
      }



      const ownerId = req.user?.uuid || req.headers["x-user-id"];

      console.log("Owner ID:", ownerId);
      if (!ownerId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "Owner ID is required",
        });
      }

      // Check if restaurant already exists for this owner
      const existingRestaurant = await Restaurant.findOne({
        where: { ownerId },
      });
      if (existingRestaurant) {
        return res.status(400).json({
          success: false,
          error: "Restaurant already exists",
          message: "You already have a restaurant registered",
        });
      }

      const restaurant = await Restaurant.create({
        ownerId,
        ...value,
      });

      res.status(201).json({
        success: true,
        message: "Restaurant created successfully",
        restaurant: restaurant.toSafeJSON(),
      });
    } catch (error) {
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
            order: [["createdAt", "DESC"]],
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
      const restaurantData = restaurant.toSafeJSON();
      restaurantData.isOpenNow = restaurant.isOpenNow();

      // Add distance if coordinates provided
      const { lat, lng } = req.query;
      if (lat && lng) {
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

  // Get owner's restaurant
  static async getMyRestaurant(req, res, next) {
    try {
      const ownerId = req.user?.uuid || req.headers["x-user-id"];

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

      const ownerId = req.user?.uuid || req.headers["x-user-id"];
      const restaurant = await Restaurant.findOne({ where: { ownerId } });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
          message: "No restaurant found for your account",
        });
      }

      await restaurant.update(value);

      res.json({
        success: true,
        message: "Restaurant updated successfully",
        restaurant: restaurant.toSafeJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  // Search restaurants
  static async searchRestaurants(req, res, next) {
    try {
      const {
        q, // search query
        city,
        cuisineType,
        isOpen,
        minRating,
        maxDeliveryFee,
        page = 1,
        limit = 20,
        sortBy = "rating",
        sortOrder = "DESC",
        lat,
        lng,
        radius = 10,
      } = req.query;

      const whereClause = {
        isActive: true,
      };

      // Search query
      if (q) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${q}%` } },
          { description: { [Op.like]: `%${q}%` } },
          { cuisineType: { [Op.like]: `%${q}%` } },
        ];
      }

      // Filters
      if (city) whereClause.city = city;
      if (cuisineType) whereClause.cuisineType = cuisineType;
      if (isOpen === "true") whereClause.isOpen = true;
      if (minRating) whereClause.rating = { [Op.gte]: parseFloat(minRating) };
      if (maxDeliveryFee)
        whereClause.deliveryFee = { [Op.lte]: parseFloat(maxDeliveryFee) };

      // Location-based filtering
      let havingClause = null;
      let attributes = ["*"];

      if (lat && lng && radius) {
        attributes = [
          "*",
          [
            sequelize.literal(`
              (6371 * acos(cos(radians(${lat})) 
              * cos(radians(latitude)) 
              * cos(radians(longitude) - radians(${lng})) 
              + sin(radians(${lat})) 
              * sin(radians(latitude))))
            `),
            "distance",
          ],
        ];
        havingClause = sequelize.literal(`distance <= ${radius}`);
      }

      const { count, rows: restaurants } = await Restaurant.findAndCountAll({
        where: whereClause,
        attributes,
        having: havingClause,
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
        order:
          lat && lng
            ? [["distance", "ASC"]]
            : [[sortBy, sortOrder.toUpperCase()]],
      });

      const restaurantsWithCalculatedFields = restaurants.map((restaurant) => {
        const restaurantData = restaurant.toSafeJSON();
        restaurantData.isOpenNow = restaurant.isOpenNow();
        if (restaurant.dataValues.distance) {
          restaurantData.distance = parseFloat(restaurant.dataValues.distance);
        }
        return restaurantData;
      });

      res.json({
        success: true,
        restaurants: restaurantsWithCalculatedFields,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalCount: count,
          hasNextPage: parseInt(page) < Math.ceil(count / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit),
        },
        filters: {
          query: q,
          city,
          cuisineType,
          isOpen,
          minRating,
          maxDeliveryFee,
          location: lat && lng ? { lat, lng, radius } : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get popular restaurants
  static async getPopularRestaurants(req, res, next) {
    try {
      const { city, limit = 10 } = req.query;

      const whereClause = {
        isActive: true,
        isOpen: true,
        rating: { [Op.gte]: 4.0 },
      };

      if (city) whereClause.city = city;

      const restaurants = await Restaurant.findAll({
        where: whereClause,
        include: [
          {
            model: Item,
            as: "items",
            where: { isPopular: true },
            required: false,
            limit: 3,
          },
        ],
        order: [
          ["rating", "DESC"],
          ["reviewCount", "DESC"],
        ],
        limit: parseInt(limit),
      });

      const restaurantsWithStatus = restaurants.map((restaurant) => {
        const restaurantData = restaurant.toSafeJSON();
        restaurantData.isOpenNow = restaurant.isOpenNow();
        return restaurantData;
      });

      res.json({
        success: true,
        restaurants: restaurantsWithStatus,
      });
    } catch (error) {
      next(error);
    }
  }

  // Toggle restaurant status (open/closed)
  static async toggleStatus(req, res, next) {
    try {
      const ownerId = req.user?.uuid || req.headers["x-user-id"];
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

  // Get restaurant statistics
  static async getStatistics(req, res, next) {
    try {
      const ownerId = req.user?.uuid || req.headers["x-user-id"];
      const { startDate, endDate, period = "daily" } = req.query;

      const restaurant = await Restaurant.findOne({ where: { ownerId } });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      const whereClause = { restaurantId: restaurant.id };

      if (startDate && endDate) {
        whereClause.date = {
          [Op.between]: [startDate, endDate],
        };
      } else {
        // Default to last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        whereClause.date = {
          [Op.gte]: thirtyDaysAgo,
        };
      }

      const stats = await RestaurantStats.findAll({
        where: whereClause,
        order: [["date", "ASC"]],
      });

      // Calculate summary statistics
      const summary = stats.reduce(
        (acc, stat) => {
          acc.totalOrders += stat.totalOrders;
          acc.totalRevenue += parseFloat(stat.totalRevenue);
          acc.totalItems += stat.itemsSold;
          acc.totalCustomers += stat.newCustomers + stat.returningCustomers;
          return acc;
        },
        {
          totalOrders: 0,
          totalRevenue: 0,
          totalItems: 0,
          totalCustomers: 0,
        }
      );

      summary.averageOrderValue =
        summary.totalOrders > 0
          ? (summary.totalRevenue / summary.totalOrders).toFixed(2)
          : 0;

      res.json({
        success: true,
        statistics: {
          summary,
          daily: stats,
          period: {
            startDate: startDate || stats[0]?.date,
            endDate: endDate || stats[stats.length - 1]?.date,
            totalDays: stats.length,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get nearby restaurants
  static async getNearbyRestaurants(req, res, next) {
    try {
      const { lat, lng, radius = 5, limit = 20 } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "Latitude and longitude are required",
        });
      }

      const restaurants = await Restaurant.findAll({
        where: {
          isActive: true,
          latitude: { [Op.ne]: null },
          longitude: { [Op.ne]: null },
        },
        attributes: [
          "*",
          [
            sequelize.literal(`
              (6371 * acos(cos(radians(${lat})) 
              * cos(radians(latitude)) 
              * cos(radians(longitude) - radians(${lng})) 
              + sin(radians(${lat})) 
              * sin(radians(latitude))))
            `),
            "distance",
          ],
        ],
        having: sequelize.literal(`distance <= ${radius}`),
        order: [["distance", "ASC"]],
        limit: parseInt(limit),
      });

      const restaurantsWithDistance = restaurants.map((restaurant) => {
        const restaurantData = restaurant.toSafeJSON();
        restaurantData.distance = parseFloat(restaurant.dataValues.distance);
        restaurantData.isOpenNow = restaurant.isOpenNow();
        return restaurantData;
      });

      res.json({
        success: true,
        restaurants: restaurantsWithDistance,
        searchCriteria: {
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          radius: parseFloat(radius),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RestaurantController;
