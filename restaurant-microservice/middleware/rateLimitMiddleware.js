const rateLimit = require("express-rate-limit");

// Create rate limiters without Redis dependency
const createRateLimiter = (
  windowMs,
  max,
  message,
  skipSuccessfulRequests = false
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: "Rate limit exceeded",
      message,
      retryAfter: Math.ceil(windowMs / 1000) + " seconds",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || "unknown";
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        message,
        retryAfter: Math.ceil(windowMs / 1000),
        limit: max,
        windowMs,
      });
    },
  });
};

const rateLimitMiddleware = {
  // General API rate limit
  general: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    1000, // 1000 requests per 15 minutes
    "Too many requests from this IP, please try again later."
  ),

  // Restaurant operations
  restaurantOperations: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    50, // 50 restaurant operations per hour
    "Too many restaurant operations. Please try again later."
  ),

  // Menu and item creation
  contentCreation: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    100, // 100 content operations per hour
    "Too many content creation requests. Please try again later."
  ),

  // File uploads
  fileUpload: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    20, // 20 file uploads per hour
    "Too many file upload requests. Please try again later."
  ),

  // Search operations
  search: createRateLimiter(
    60 * 1000, // 1 minute
    30, // 30 searches per minute
    "Too many search requests. Please slow down."
  ),

  // Public API calls
  publicApi: createRateLimiter(
    60 * 1000, // 1 minute
    60, // 60 requests per minute
    "Too many requests to public API. Please slow down."
  ),
};

module.exports = {
  rateLimitMiddleware,
};
