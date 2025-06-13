const rateLimit = require("express-rate-limit");

const rateLimitMiddleware = {
  // Public routes - moderate limits
  publicRate: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    message: { success: false, message: "Too many requests from this IP" },
  }),

  // User operations - standard limits
  userRate: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: "User rate limit exceeded" },
  }),

  // Service-to-service - higher limits
  serviceRate: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { success: false, message: "Service rate limit exceeded" },
  }),

  // Driver operations - moderate limits
  driverRate: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    message: {
      success: false,
      message: "Driver operation rate limit exceeded",
    },
  }),

  // Location updates - high frequency allowed
  locationRate: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 300,
    message: { success: false, message: "Location update rate limit exceeded" },
  }),

  // Delivery operations - moderate limits
  deliveryRate: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
      success: false,
      message: "Delivery operation rate limit exceeded",
    },
  }),

  // QR code operations - lower limits
  qrRate: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
      success: false,
      message: "QR code operation rate limit exceeded",
    },
  }),

  // Tracking operations - high limits for public access
  trackingRate: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { success: false, message: "Tracking rate limit exceeded" },
  }),

  // Admin operations
  adminRate: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, message: "Admin rate limit exceeded" },
  }),

  // Registration operations - very low limits
  registrationRate: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { success: false, message: "Registration rate limit exceeded" },
  }),

  // Availability updates - moderate limits
  availabilityRate: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
      success: false,
      message: "Availability update rate limit exceeded",
    },
  }),

  // Upload operations - low limits
  uploadRate: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: "Upload rate limit exceeded" },
  }),

  // Emergency operations - very low limits
  emergencyRate: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
      success: false,
      message: "Emergency operation rate limit exceeded",
    },
  }),

  // Contact operations - low limits
  contactRate: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: {
      success: false,
      message: "Contact operation rate limit exceeded",
    },
  }),

  // Referral operations
  referralRate: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
      success: false,
      message: "Referral operation rate limit exceeded",
    },
  }),

  // Report generation - very low limits
  reportRate: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
      success: false,
      message: "Report generation rate limit exceeded",
    },
  }),
};

module.exports = rateLimitMiddleware;
