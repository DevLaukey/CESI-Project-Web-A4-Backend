require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");
const logger = require("./src/utils/logger");
const database = require("./src/config/database");
const notificationRoutes = require("./src/routes/notificationRoutes");
const deviceRoutes = require("./src/routes/deviceRoutes");
const templateRoutes = require("./src/routes/templateRoutes");
const errorHandler = require("./src/middleware/errorHandler");
const SocketManager = require("./src/services/socketManager");
const cleanupService = require("./src/services/cleanupService");

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

const PORT = process.env.PORT || 3006;

// Initialize Socket Manager
const socketManager = new SocketManager(io);

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
  max: 200, // Higher limit for notification service
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
    service: "Notification Microservice",
    timestamp: new Date().toISOString(),
    realtime: "Active",
    connected_users: socketManager.getConnectedUsersCount(),
  });
});

// Routes
app.use("/api/notifications", notificationRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/templates", templateRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Initialize cleanup cron job - runs daily at 2 AM
cron.schedule("0 2 * * *", async () => {
  try {
    await cleanupService.cleanupOldNotifications();
    await cleanupService.cleanupFailedNotifications();
  } catch (error) {
    logger.error("Cleanup cron job error:", error);
  }
});

// Start server
server.listen(PORT, async () => {
  try {
    await database.testConnection();
    logger.info(`Notification Microservice running on port ${PORT}`);
    logger.info("Real-time notifications active");
    logger.info("Cleanup cron job scheduled");
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
});
