require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const logger = require("./src/utils/logger");
const database = require("./src/config/database");
const deliveryRoutes = require("./src/routes/deliveryRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const driverRoutes = require("./src/routes/driverRoutes");
const trackingRoutes = require("./src/routes/trackingRoutes");
const {
  errorHandler,
  notFoundHandler,
  asyncHandler,
} = require("./src/middleware/errorHandler");
const swaggerSetup = require("./src/config/swagger");

// ADD THIS IMPORT - adjust path as needed
const SocketManager = require("./src/utils/socketManager");
// OR
// const { SocketManager } = require("./src/utils/socketManager");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com"]
        : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3005;

// Initialize Socket Manager
const socketManager = new SocketManager(io);

// Setup Swagger documentation BEFORE other middleware
swaggerSetup(app);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com"]
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP",
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Make socket manager available to routes
app.set("socketManager", socketManager);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Delivery Microservice",
    timestamp: new Date().toISOString(),
    realtime: "Active",
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    swagger: `http://localhost:${PORT}/api-docs`,
  });
});

// API Routes
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/admin", adminRoutes);

// API info endpoint
app.get("/api", (req, res) => {
  res.json({
    service: "Delivery Microservice API",
    version: "1.0.0",
    documentation: `http://localhost:${PORT}/api-docs`,
    endpoints: {
      deliveries: "/api/deliveries",
      drivers: "/api/drivers",
      tracking: "/api/tracking",
      admin: "/api/admin",
    },
    health: "/health",
  });
});





// Error handler - MUST be the LAST middleware
app.use(errorHandler);

// Start server
server.listen(PORT, async () => {
  try {
    await database.testConnection();
    logger.info(`🚀 Delivery Microservice running on port ${PORT}`);
    logger.info(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    logger.info(`📡 Real-time tracking is active`);
    logger.info(`🔍 API Explorer: http://localhost:${PORT}/api-docs.json`);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
  });
});

module.exports = app;
