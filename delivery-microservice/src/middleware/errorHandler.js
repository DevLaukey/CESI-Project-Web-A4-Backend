// errorHandler.js
const {
  ValidationError,
  UniqueConstraintError,
  DatabaseError,
} = require("sequelize");

/**
 * Centralized error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  console.error("Error occurred:", {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: req.user?.id || "anonymous",
    timestamp: new Date().toISOString(),
  });

  // Sequelize validation errors
  if (error instanceof ValidationError) {
    const errors = error.errors.map((err) => ({
      field: err.path,
      message: err.message,
      value: err.value,
    }));

    return res.status(400).json({
      success: false,
      error: "Validation Error",
      message: "Data validation failed",
      details: errors,
    });
  }

  // Sequelize unique constraint errors
  if (error instanceof UniqueConstraintError) {
    const field = error.errors[0]?.path || "field";
    return res.status(409).json({
      success: false,
      error: "Duplicate Entry",
      message: `A record with this ${field} already exists`,
      field,
    });
  }

  // Sequelize database errors
  if (error instanceof DatabaseError) {
    return res.status(500).json({
      success: false,
      error: "Database Error",
      message: "A database error occurred. Please try again later.",
    });
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: "Invalid Token",
      message: "Authentication token is invalid",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: "Token Expired",
      message: "Authentication token has expired",
    });
  }

  // Multer upload errors
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      error: "File Too Large",
      message: "Uploaded file exceeds size limit",
    });
  }

  // Custom application errors
  if (error.status) {
    return res.status(error.status).json({
      success: false,
      error: error.name || "Application Error",
      message: error.message,
    });
  }

  // Default server error
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: "An unexpected error occurred. Please try again later.",
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
      details: error.message,
    }),
  });
};

/**
 * Not found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
    suggestion: "Check the API documentation for available endpoints",
  });
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
