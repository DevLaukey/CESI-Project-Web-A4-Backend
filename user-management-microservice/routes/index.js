const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");

// Health check route
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "User Management Service",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    status: "healthy",
  });
});

// Service info route
router.get("/info", (req, res) => {
  res.json({
    success: true,
    service: {
      name: "User Management Service",
      version: "1.0.0",
      description:
        "Independent microservice for user authentication and profile management",
      endpoints: {
        authentication: "/api/auth",
        userManagement: "/api/users",
        documentation: "/api-docs",
        health: "/api/health",
      },
      features: [
        "User registration and authentication",
        "Profile management",
        "Role-based access control",
        "Password management",
        "Location tracking for drivers",
        "Admin user management",
        "Inter-service communication",
      ],
      supportedUserTypes: [
        "end_user",
        "restaurant_owner",
        "delivery_driver",
        "developer",
        "sales_dept",
        "tech_support",
      ],
    },
  });
});

// API version info
router.get("/version", (req, res) => {
  res.json({
    success: true,
    version: "1.0.0",
    apiVersion: "v1",
    releaseDate: "2024-01-01",
    changelog: [
      {
        version: "1.0.0",
        date: "2024-01-01",
        changes: [
          "Initial release",
          "User authentication system",
          "Profile management",
          "Role-based permissions",
          "Driver location tracking",
          "Admin user management",
        ],
      },
    ],
  });
});

// Mount route modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);

// API documentation redirect
router.get("/docs", (req, res) => {
  res.redirect("/api-docs");
});

// Catch-all route for undefined endpoints
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      "GET /api/health",
      "GET /api/info",
      "GET /api/version",
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /api/users/profile",
      "PUT /api/users/profile",
    ],
  });
});

module.exports = router;
