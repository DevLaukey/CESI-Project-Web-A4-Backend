const rateLimit = require("express-rate-limit");

// Different rate limits for different types of operations
const rateLimitMiddleware = {
  // User operations - moderate limits
  userRate: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: "Too many requests from this user",
  }),

  // Service-to-service - higher limits
  serviceRate: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window
    message: "Service rate limit exceeded",
  }),

  // Admin operations - moderate limits
  adminRate: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per window
    message: "Admin rate limit exceeded",
  }),

  // Device operations - lower limits (device registration is less frequent)
  deviceRate: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per window
    message: "Device operation rate limit exceeded",
  }),

  // Bulk operations - very low limits
  bulkRate: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 bulk operations per hour
    message: "Bulk operation rate limit exceeded",
  }),

  // Broadcast operations - very restrictive
  broadcastRate: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 broadcasts per hour
    message: "Broadcast rate limit exceeded",
  }),

  // Test operations - moderate limits
  testRate: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 test operations per window
    message: "Test operation rate limit exceeded",
  }),

  // Webhook operations - higher limits for external services
  webhookRate: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 webhook calls per window
    message: "Webhook rate limit exceeded",
  }),

  // Heartbeat operations - higher limits for frequent calls
  heartbeatRate: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // 100 heartbeats per window
    message: "Heartbeat rate limit exceeded",
  }),

  // Public endpoint rate limiting
  publicRate: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per window
    message: "Public API rate limit exceeded",
  }),
};

module.exports = rateLimitMiddleware;
