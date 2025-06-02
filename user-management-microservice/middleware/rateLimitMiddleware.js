const rateLimit = require("express-rate-limit");

// Only use Redis store if Redis is available and properly configured
let redisStore = null;

// Try to create Redis store only if Redis URL is provided
if (process.env.REDIS_URL) {
  try {
    const { RedisStore } = require("rate-limit-redis");
    const Redis = require("redis");

    const redisClient = Redis.createClient({
      url: process.env.REDIS_URL,
    });

    // Handle Redis connection
    redisClient.on("error", (err) => {
      console.warn(
        "Redis connection error (rate limiting will use memory):",
        err.message
      );
      redisStore = null;
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis connected for rate limiting");
    });

    // Connect to Redis
    redisClient.connect().catch((err) => {
      console.warn(
        "Failed to connect to Redis (using memory store):",
        err.message
      );
      redisStore = null;
    });

    // Create Redis store
    redisStore = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    });
  } catch (error) {
    console.warn(
      "Redis store initialization failed (using memory store):",
      error.message
    );
    redisStore = null;
  }
} else {
  console.log(
    "ℹ️  No Redis URL provided, using memory store for rate limiting"
  );
}

// Rate limit configurations
const createRateLimiter = (
  windowMs,
  max,
  message,
  skipSuccessfulRequests = false
) => {
  const config = {
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
    // Add request info to help with debugging
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || "unknown";
    },
    // Custom handler for rate limit exceeded
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
  };

  // Use Redis store if available, otherwise use default memory store
  if (redisStore) {
    config.store = redisStore;
    console.log("🔄 Using Redis store for rate limiting");
  } else {
    console.log("💾 Using memory store for rate limiting");
  }

  return rateLimit(config);
};

// Specific rate limiters
const rateLimitMiddleware = {
  // General API rate limit
  general: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    1000, // 1000 requests per 15 minutes
    "Too many requests from this IP, please try again later."
  ),

  // Authentication endpoints
  register: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    5, // 5 registration attempts per hour
    "Too many registration attempts. Please try again in an hour.",
    true // Skip counting successful requests
  ),

  login: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    10, // 10 login attempts per 15 minutes
    "Too many login attempts. Please try again later.",
    true // Skip counting successful logins
  ),

  forgotPassword: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    3, // 3 password reset requests per hour
    "Too many password reset requests. Please try again in an hour."
  ),

  // Profile updates
  profileUpdate: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    20, // 20 profile updates per hour
    "Too many profile update requests. Please try again later."
  ),

  // File uploads
  fileUpload: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    10, // 10 file uploads per hour
    "Too many file upload requests. Please try again later."
  ),

  // Location updates (for drivers)
  locationUpdate: createRateLimiter(
    60 * 1000, // 1 minute
    60, // 60 location updates per minute (1 per second)
    "Too many location updates. Please slow down."
  ),

  // Admin operations
  adminOperations: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    100, // 100 admin operations per hour
    "Too many admin operations. Please try again later."
  ),

  // API calls (for developers)
  apiCalls: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    1000, // 1000 API calls per hour
    "API rate limit exceeded. Please upgrade your plan or try again later."
  ),

  // Password changes
  passwordChange: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    3, // 3 password changes per hour
    "Too many password change attempts. Please try again later."
  ),
};

// Alternative simple rate limiters without Redis (fallback)
const simpleRateLimiters = {
  // Basic rate limiter without external dependencies
  basic: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: "Rate limit exceeded",
      message: "Too many requests, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Strict limiter for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: {
      success: false,
      error: "Rate limit exceeded",
      message: "Too many authentication attempts, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  }),
};

// Export based on what's available
module.exports = {
  rateLimitMiddleware:
    process.env.ENABLE_RATE_LIMITING === "false"
      ? // If rate limiting is disabled, return no-op middleware
        Object.keys(rateLimitMiddleware).reduce((acc, key) => {
          acc[key] = (req, res, next) => next();
          return acc;
        }, {})
      : rateLimitMiddleware,

  simpleRateLimiters,

  // Helper function to disable rate limiting for development
  createNoOpLimiter: () => (req, res, next) => next(),

  // Helper to check if Redis is available
  isRedisAvailable: () => redisStore !== null,
};
