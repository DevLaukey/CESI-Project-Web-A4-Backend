const rateLimit = require("express-rate-limit");

// Only use Redis store if Redis is available and properly configured
let redisStore = null;
let redisClient = null;

// Try to create Redis store only if Redis URL is provided
if (process.env.REDIS_URL) {
  try {
    const { RedisStore } = require("rate-limit-redis");
    const Redis = require("redis");

    redisClient = Redis.createClient({
      url: process.env.REDIS_URL,
    });

    // Handle Redis connection with proper error handling
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

    redisClient.on("ready", () => {
      console.log("✅ Redis ready for rate limiting");
    });

    // Connect to Redis with proper error handling
    redisClient
      .connect()
      .then(() => {
        // Create Redis store only after successful connection
        redisStore = new RedisStore({
          sendCommand: (...args) => redisClient.sendCommand(args),
        });
        console.log("✅ Redis store created successfully");
      })
      .catch((err) => {
        console.warn(
          "Failed to connect to Redis (using memory store):",
          err.message
        );
        redisStore = null;
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

// Enhanced rate limit configurations with better error handling
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

    // Improved key generator with fallback
    keyGenerator: (req) => {
      return (
        req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        "unknown"
      );
    },

    // Enhanced handler with more details
    handler: (req, res, next) => {
      const resetTime = new Date(Date.now() + windowMs);

      res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        message,
        retryAfter: Math.ceil(windowMs / 1000),
        limit: max,
        windowMs,
        resetTime: resetTime.toISOString(),
        ip: req.ip,
      });
    },

    // Add skip function for health checks and options requests
    skip: (req) => {
      // Skip rate limiting for OPTIONS requests (CORS preflight)
      if (req.method === "OPTIONS") {
        return true;
      }

      // Skip for health check endpoints
      if (req.path === "/health" || req.path === "/ping") {
        return true;
      }

      return false;
    },

    // On limit reached callback for logging
    onLimitReached: (req, res, options) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    },
  };

  // Use Redis store if available, otherwise use default memory store
  if (redisStore) {
    config.store = redisStore;
  }

  return rateLimit(config);
};

// More conservative rate limiters for auth endpoints
const rateLimitMiddleware = {
  // General API rate limit - more lenient
  general: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    2000, // 2000 requests per 15 minutes (increased from 1000)
    "Too many requests from this IP, please try again later."
  ),

  // Authentication endpoints - more lenient for development
  register: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    10, // 10 registration attempts per hour (increased from 5)
    "Too many registration attempts. Please try again in an hour.",
    true // Skip counting successful requests
  ),

  login: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    20, // 20 login attempts per 15 minutes (increased from 10)
    "Too many login attempts. Please try again later.",
    true // Skip counting successful logins
  ),

  forgotPassword: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    5, // 5 password reset requests per hour (increased from 3)
    "Too many password reset requests. Please try again in an hour."
  ),

  // Profile updates
  profileUpdate: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    50, // 50 profile updates per hour (increased from 20)
    "Too many profile update requests. Please try again later."
  ),

  // File uploads
  fileUpload: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    20, // 20 file uploads per hour (increased from 10)
    "Too many file upload requests. Please try again later."
  ),

  // Location updates (for drivers)
  locationUpdate: createRateLimiter(
    60 * 1000, // 1 minute
    120, // 120 location updates per minute (increased from 60)
    "Too many location updates. Please slow down."
  ),

  // Admin operations
  adminOperations: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    200, // 200 admin operations per hour (increased from 100)
    "Too many admin operations. Please try again later."
  ),

  // API calls (for developers)
  apiCalls: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    2000, // 2000 API calls per hour (increased from 1000)
    "API rate limit exceeded. Please upgrade your plan or try again later."
  ),

  // Password changes
  passwordChange: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    5, // 5 password changes per hour (increased from 3)
    "Too many password change attempts. Please try again later."
  ),
};

// Alternative simple rate limiters without Redis (fallback)
const simpleRateLimiters = {
  // Basic rate limiter without external dependencies
  basic: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 requests per windowMs (increased from 100)
    message: {
      success: false,
      error: "Rate limit exceeded",
      message: "Too many requests, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) =>
      req.method === "OPTIONS" ||
      req.path === "/health" ||
      req.path === "/ping",
  }),

  // More lenient limiter for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // 15 attempts per 15 minutes (increased from 5)
    message: {
      success: false,
      error: "Rate limit exceeded",
      message: "Too many authentication attempts, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skip: (req) => req.method === "OPTIONS",
  }),
};

// Create no-op middleware for development
const createNoOpMiddleware = () => {
  return Object.keys(rateLimitMiddleware).reduce((acc, key) => {
    acc[key] = (req, res, next) => {
      // Add debug headers in development
      if (process.env.NODE_ENV === "development") {
        res.set("X-RateLimit-Disabled", "true");
      }
      next();
    };
    return acc;
  }, {});
};

// Export based on environment and configuration
module.exports = {
  rateLimitMiddleware:
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_RATE_LIMITING === "false"
      ? createNoOpMiddleware()
      : rateLimitMiddleware,

  simpleRateLimiters,

  // Helper function to disable rate limiting for development
  createNoOpLimiter: () => (req, res, next) => {
    if (process.env.NODE_ENV === "development") {
      res.set("X-RateLimit-Disabled", "true");
    }
    next();
  },

  // Helper to check if Redis is available
  isRedisAvailable: () => redisStore !== null,

  // Helper to get current Redis status
  getRedisStatus: () => ({
    connected: redisClient?.isReady || false,
    storeAvailable: redisStore !== null,
    connectionState: redisClient?.status || "disconnected",
  }),

  // Graceful shutdown helper
  shutdown: async () => {
    if (redisClient) {
      try {
        await redisClient.quit();
        console.log("Redis client disconnected");
      } catch (error) {
        console.warn("Error disconnecting Redis client:", error.message);
      }
    }
  },
};
