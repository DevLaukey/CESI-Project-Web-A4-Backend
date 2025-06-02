const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const Redis = require("redis");

// Create Redis client for rate limiting (optional)
let redisClient;
if (process.env.REDIS_URL) {
  redisClient = Redis.createClient({
    url: process.env.REDIS_URL,
  });
  redisClient.connect().catch(console.error);
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
  };

  // Use Redis store if available
  if (redisClient) {
    config.store = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    });
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
};

module.exports = {
  rateLimitMiddleware,
};
