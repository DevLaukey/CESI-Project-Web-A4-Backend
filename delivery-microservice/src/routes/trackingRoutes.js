
const express = require("express");
const TrackingController = require("../controllers/trackingController");
const auth = require("../middleware/authMiddleware");
const rateLimitMiddleware = require("../middleware/rateLimit");
const validateLocation = require("../middleware/validateLocation");
const router = express.Router();

// ================================================================
// PUBLIC TRACKING ROUTES
// ================================================================

// Track delivery by tracking number (public)
router.get(
  "/:trackingNumber",
  rateLimitMiddleware.trackingRate,
  TrackingController.trackDelivery
);

// Get delivery status updates (public)
router.get(
  "/:trackingNumber/status",
  rateLimitMiddleware.trackingRate,
  TrackingController.getDeliveryStatus
);

// Get estimated delivery time (public)
router.get(
  "/:trackingNumber/eta",
  rateLimitMiddleware.trackingRate,
  TrackingController.getEstimatedDeliveryTime
);

// ================================================================
// REAL-TIME TRACKING ROUTES
// ================================================================

// Get real-time delivery location
router.get(
  "/:trackingNumber/location",
  TrackingController.getRealTimeLocation
);

// Subscribe to delivery updates (WebSocket info)
router.get(
  "/:trackingNumber/subscribe",
  rateLimitMiddleware.trackingRate,
  TrackingController.getSubscriptionInfo
);

// Get delivery route
router.get(
  "/:trackingNumber/route",
  rateLimitMiddleware.trackingRate,
  TrackingController.getDeliveryRoute
);

// ================================================================
// AUTHENTICATED TRACKING ROUTES
// ================================================================

// Get detailed tracking info (requires auth)
router.get(
  "/:trackingNumber/details",
  auth,
  rateLimitMiddleware.userRate,
  TrackingController.getDetailedTrackingInfo
);

// Get delivery history/timeline
router.get(
  "/:trackingNumber/timeline",
  auth,
  rateLimitMiddleware.userRate,
  TrackingController.getDeliveryTimeline
);

// Update delivery milestone (driver only)
router.post(
  "/:trackingNumber/milestone",
  auth,
  rateLimitMiddleware.driverRate,
  validateLocation,
  TrackingController.updateDeliveryMilestone
);

module.exports = router;