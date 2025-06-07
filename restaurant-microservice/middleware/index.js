const rateLimit = require("express-rate-limit");
const cors = require("cors");

// CORS Configuration
const corsMiddleware = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://your-frontend-domain.com",
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id"],
});

// Rate Limiting
const rateLimitMiddleware = {
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: "Too many requests",
      message: "Please try again later",
    },
  }),

  strict: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs
    message: {
      success: false,
      error: "Too many requests",
      message: "Please try again later",
    },
  }),
};

// Authentication Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const userId = req.headers["x-user-id"];

    if (!token && !userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        message: "Please provide authentication token or user ID",
      });
    }

    // If using token, verify it with user service
    if (token) {
      // TODO: Implement token verification with user microservice
      // For now, we'll extract user ID from token or header
      req.user = { uuid: userId }; // Simplified for this example
    } else if (userId) {
      req.user = { uuid: userId };
    }

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Invalid authentication",
      message: "Please check your authentication credentials",
    });
  }
};

// Owner Middleware (checks if user owns a restaurant)
const ownerMiddleware = async (req, res, next) => {
  try {
    const { Restaurant } = require("../models");
    const ownerId = req.user?.uuid;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const restaurant = await Restaurant.findOne({ where: { ownerId } });
    if (!restaurant) {
      return res.status(403).json({
        success: false,
        error: "Restaurant owner access required",
        message: "You must be a restaurant owner to access this resource",
      });
    }

    req.restaurant = restaurant;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server error during authorization",
    });
  }
};

// Admin Middleware
const adminMiddleware = async (req, res, next) => {
  try {
    // TODO: Implement admin check with user microservice
    // For now, we'll use a simple header check
    const isAdmin = req.headers["x-admin"] === "true";

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Admin access required",
        message: "You must be an admin to access this resource",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server error during authorization",
    });
  }
};

// Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Sequelize validation error
  if (err.name === "SequelizeValidationError") {
    const errors = err.errors.map((error) => ({
      field: error.path,
      message: error.message,
    }));

    return res.status(400).json({
      success: false,
      error: "Validation Error",
      details: errors,
    });
  }

  // Sequelize unique constraint error
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).json({
      success: false,
      error: "Duplicate entry",
      message: "A record with this information already exists",
    });
  }

  // Sequelize foreign key constraint error
  if (err.name === "SequelizeForeignKeyConstraintError") {
    return res.status(400).json({
      success: false,
      error: "Invalid reference",
      message: "Referenced record does not exist",
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

// Not Found Handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: {
      restaurants: "/api/restaurants",
      items: "/api/items",
      menus: "/api/menus",
      categories: "/api/categories",
      stats: "/api/stats",
      reviews: "/api/reviews",
    },
  });
};

module.exports = {
  corsMiddleware,
  rateLimitMiddleware,
  authMiddleware,
  ownerMiddleware,
  adminMiddleware,
  errorHandler,
  notFoundHandler,
};
