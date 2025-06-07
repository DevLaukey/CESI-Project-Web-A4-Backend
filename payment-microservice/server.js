require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const logger = require("./src/utils/logger");
const database = require("./src/config/database");
const paymentRoutes = require("./src/routes/paymentRoutes");
const webhookRoutes = require("./src/routes/webhookRoutes");
const simulatorRoutes = require("./src/routes/simulatorRoutes");
const errorHandler = require("./src/middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3004;

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
  max: 200, // Higher limit for payment service
  message: "Too many requests from this IP",
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Payment Microservice",
    timestamp: new Date().toISOString(),
    simulator: "Active",
  });
});

// Routes
app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/simulator", simulatorRoutes); // Internal payment gateway simulator

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
app.listen(PORT, async () => {
  try {
    await database.testConnection();
    logger.info(`Payment Microservice running on port ${PORT}`);
    logger.info("Payment Gateway Simulator is active");
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
});
