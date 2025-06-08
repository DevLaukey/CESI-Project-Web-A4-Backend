

require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");

// Import utilities and configuration
const logger = require("./src/utils/logger");
const database = require("./src/config/database");
const errorHandler = require("./src/middleware/errorHandler");
const requestLogger = require("./src/middleware/requestLogger");
const securityMiddleware = require("./src/middleware/security");

// Import services
const SocketManager = require("./src/services/socketManager");
const schedulerService = require("./src/services/schedulerService");
const cleanupService = require("./src/services/cleanupService");
const monitoringService = require("./src/services/monitoringService");

// Import routes
const notificationRoutes = require("./src/routes/notificationRoutes");
const deviceRoutes = require("./src/routes/deviceRoutes");
const templateRoutes = require("./src/routes/templateRoutes");
const webhookRoutes = require("./src/routes/webhookRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const publicRoutes = require("./src/routes/publicRoutes");

// ================================================================
// APPLICATION SETUP
// ================================================================

const app = express();
const server = http.createServer(app);

// Socket.IO setup with enhanced configuration
const io = socketIo(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.ALLOWED_ORIGINS?.split(",") || ["https://yourdomain.com"]
        : [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:8080",
          ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: true,
});

const PORT = process.env.PORT || 3006;
const SOCKET_PORT = process.env.SOCKET_PORT || 3016;

// Initialize Socket Manager
const socketManager = new SocketManager(io);

// ================================================================
// MIDDLEWARE SETUP
// ================================================================

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins =
        process.env.NODE_ENV === "production"
          ? process.env.ALLOWED_ORIGINS?.split(",") || [
              "https://yourdomain.com",
            ]
          : [
              "http://localhost:3000",
              "http://localhost:3001",
              "http://localhost:8080",
            ];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Service-Key",
      "X-API-Key",
    ],
  })
);

// Compression middleware
app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// Request logging
if (process.env.NODE_ENV !== "test") {
  app.use(
    morgan("combined", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
      skip: (req, res) => {
        // Skip health check logs to reduce noise
        return req.url === "/health" || req.url === "/api/public/health";
      },
    })
  );
}

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 1000 : 2000, // More restrictive in production
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
    error_code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and internal service calls
    return (
      req.url === "/health" ||
      req.url === "/api/public/health" ||
      req.headers["x-service-key"] === process.env.SERVICE_API_KEY
    );
  },
});
app.use(globalLimiter);

// Body parsing middleware with size limits
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      // Store raw body for webhook signature verification
      req.rawBody = buf;
    },
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// Custom security middleware
app.use(securityMiddleware);

// Request logging and monitoring
app.use(requestLogger);

// Make socket manager available to routes
app.set("socketManager", socketManager);

// Trust proxy if behind load balancer
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ================================================================
// HEALTH CHECK AND STATUS ENDPOINTS
// ================================================================

// Simple health check
app.get("/health", async (req, res) => {
  try {
    // Quick database connectivity check
    await database.testConnection();

    res.status(200).json({
      status: "OK",
      service: "Notification Microservice",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      version: process.env.SERVICE_VERSION || "1.0.0",
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "ERROR",
      service: "Notification Microservice",
      error: "Service unavailable",
      timestamp: new Date().toISOString(),
    });
  }
});

// Detailed status endpoint
app.get("/status", async (req, res) => {
  try {
    const dbStatus = await database.testConnection();
    const connectedUsers = socketManager.getConnectedUsersCount();
    const systemMetrics = await monitoringService.getSystemMetrics();

    res.json({
      status: "OK",
      service: "Notification Microservice",
      version: process.env.SERVICE_VERSION || "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      components: {
        database: dbStatus ? "OK" : "ERROR",
        websocket: "OK",
        push_service: "OK",
        sms_service: process.env.TWILIO_ACCOUNT_SID ? "OK" : "DISABLED",
      },
      metrics: {
        connected_users: connectedUsers,
        ...systemMetrics,
      },
    });
  } catch (error) {
    logger.error("Status check failed:", error);
    res.status(500).json({
      status: "ERROR",
      error: "Failed to get service status",
    });
  }
});

// ================================================================
// API ROUTES REGISTRATION
// ================================================================

// Public routes (no authentication required)
app.use("/api/public", publicRoutes);

// Main notification routes
app.use("/api/notifications", notificationRoutes);

// Device management routes
app.use("/api/devices", deviceRoutes);

// Template management routes
app.use("/api/templates", templateRoutes);

// Webhook routes (external service callbacks)
app.use("/api/webhooks", webhookRoutes);

// Administrative routes
app.use("/api/admin", adminRoutes);

// ================================================================
// API DOCUMENTATION ROUTE
// ================================================================

app.get("/api/docs", (req, res) => {
  res.json({
    service: "Notification Microservice",
    version: process.env.SERVICE_VERSION || "1.0.0",
    description:
      "Multi-channel notification service supporting push, SMS, in-app, and real-time notifications",
    endpoints: {
      notifications: "/api/notifications",
      devices: "/api/devices",
      templates: "/api/templates",
      webhooks: "/api/webhooks",
      admin: "/api/admin",
      public: "/api/public",
    },
    websocket: {
      url: `ws://localhost:${PORT}`,
      events: ["notification", "unread_count", "delivery_status"],
    },
    authentication: {
      user_endpoints: "Bearer JWT token in Authorization header",
      service_endpoints: "X-Service-Key header",
      webhooks: "Provider-specific signature verification",
    },
    rate_limits: {
      user_operations: "100 requests per 15 minutes",
      service_operations: "1000 requests per 15 minutes",
      admin_operations: "200 requests per 15 minutes",
      bulk_operations: "10 requests per hour",
    },
  });
});

// ================================================================
// ERROR HANDLING
// ================================================================

// 404 handler for unknown routes
app.use("*", (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(errorHandler);

// ================================================================
// GRACEFUL SHUTDOWN HANDLING
// ================================================================

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Stop accepting new connections
    server.close(async () => {
      logger.info("HTTP server closed");

      try {
        // Close WebSocket connections
        io.close(() => {
          logger.info("WebSocket server closed");
        });

        // Stop scheduler jobs
        await schedulerService.stop();
        logger.info("Scheduler stopped");

        // Close database connections
        await database.close();
        logger.info("Database connections closed");

        // Final cleanup
        await cleanupService.finalCleanup();
        logger.info("Cleanup completed");

        logger.info("Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        logger.error("Error during graceful shutdown:", error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 30000);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

// ================================================================
// DATABASE INITIALIZATION
// ================================================================

const initializeDatabase = async () => {
  try {
    await database.testConnection();
    logger.info("Database connection established");

    // Initialize database tables
    const Notification = require("./src/models/Notification");
    const Device = require("./src/models/Device");
    const NotificationTemplate = require("./src/models/NotificationTemplate");

    await Notification.createTable();
    await Device.createTable();
    await NotificationTemplate.createTable();

    // Create user preferences table
    await database.query(`
      CREATE TABLE IF NOT EXISTS user_notification_preferences (
        user_id VARCHAR(36) PRIMARY KEY,
        preferences JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_updated_at (updated_at)
      )
    `);

    logger.info("Database tables initialized");

    // Insert default templates if they don't exist
    await insertDefaultTemplates();
  } catch (error) {
    logger.error("Database initialization failed:", error);
    throw error;
  }
};

// ================================================================
// DEFAULT TEMPLATES INITIALIZATION
// ================================================================

const insertDefaultTemplates = async () => {
  try {
    const NotificationTemplate = require("./src/models/NotificationTemplate");

    const defaultTemplates = [
      {
        name: "order_confirmed",
        type: "order",
        title_template: "Order Confirmed! 🎉",
        message_template:
          "Your order #{{order_number}} has been confirmed and will be prepared soon. Estimated delivery: {{estimated_time}}.",
        default_channels: ["in_app", "push"],
        variables: ["order_number", "estimated_time"],
      },
      {
        name: "order_preparing",
        type: "order",
        title_template: "Your Order is Being Prepared 👨‍🍳",
        message_template:
          "Great news! {{restaurant_name}} is now preparing your order #{{order_number}}.",
        default_channels: ["in_app", "push"],
        variables: ["restaurant_name", "order_number"],
      },
      {
        name: "driver_assigned",
        type: "delivery",
        title_template: "Driver on the Way! 🚗",
        message_template:
          "{{driver_name}} is on their way to pick up your order. Track your delivery in real-time!",
        default_channels: ["in_app", "push"],
        variables: ["driver_name"],
      },
      {
        name: "order_delivered",
        type: "delivery",
        title_template: "Order Delivered! 🎉",
        message_template:
          "Your order has been delivered! Enjoy your meal and don't forget to rate your experience.",
        default_channels: ["in_app", "push"],
        variables: [],
      },
      {
        name: "payment_successful",
        type: "payment",
        title_template: "Payment Successful ✅",
        message_template:
          "Your payment of ${{amount}} has been processed successfully for order #{{order_number}}.",
        default_channels: ["in_app", "push"],
        variables: ["amount", "order_number"],
      },
      {
        name: "referral_earned",
        type: "referral",
        title_template: "Referral Bonus Earned! 💰",
        message_template:
          "Congratulations! You've earned ${{amount}} for referring {{referee_name}}. Bonus has been added to your account.",
        default_channels: ["in_app", "push"],
        variables: ["amount", "referee_name"],
      },
    ];

    for (const template of defaultTemplates) {
      try {
        const existing = await NotificationTemplate.findByName(template.name);
        if (!existing) {
          await NotificationTemplate.create(template);
          logger.info(`Created default template: ${template.name}`);
        }
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY") {
          logger.error(`Failed to create template ${template.name}:`, error);
        }
      }
    }
  } catch (error) {
    logger.error("Failed to initialize default templates:", error);
  }
};

// ================================================================
// SERVICE INITIALIZATION AND STARTUP
// ================================================================

const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();

    // Initialize monitoring
    await monitoringService.initialize();

    // Initialize scheduled jobs
    schedulerService.initializeScheduledJobs();

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Notification Microservice started successfully`);
      logger.info(`📡 HTTP Server running on port ${PORT}`);
      logger.info(`🔌 WebSocket Server running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
      logger.info(
        `👥 Connected users: ${socketManager.getConnectedUsersCount()}`
      );
      logger.info(`📊 Monitoring: Active`);
      logger.info(`⏰ Scheduler: Active`);
      logger.info(`💾 Database: Connected`);

      // Log service capabilities
      const capabilities = {
        push_notifications: !!process.env.FIREBASE_PROJECT_ID,
        sms_notifications: !!process.env.TWILIO_ACCOUNT_SID,
        web_push: !!process.env.VAPID_PUBLIC_KEY,
        real_time: true,
        templates: true,
        scheduling: true,
        analytics: true,
      };

      logger.info(`🔧 Service capabilities:`, capabilities);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// ================================================================
// START THE SERVICE
// ================================================================

// Start the service
startServer();

// Export for testing
module.exports = { app, server, io, socketManager };
