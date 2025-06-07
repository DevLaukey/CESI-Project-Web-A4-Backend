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
const driverRoutes = require("./src/routes/driverRoutes");
const trackingRoutes = require("./src/routes/trackingRoutes");
const errorHandler = require("./src/middleware/errorHandler");
const SocketManager = require("./src/services/socketManager");

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
  });
});

// Routes
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/tracking", trackingRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start server
server.listen(PORT, async () => {
  try {
    await database.testConnection();
    logger.info(`Delivery Microservice running on port ${PORT}`);
    logger.info("Real-time tracking is active");
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
});
