
const express = require("express");
const DeliveryController = require("../controllers/deliveryController");
const auth = require("../middleware/auth");
const serviceAuth = require("../middleware/serviceAuth");
const adminAuth = require("../middleware/adminAuth");
const rateLimitMiddleware = require("../middleware/rateLimit");
const validateLocation = require("../middleware/validateLocation");
const router = express.Router();

// ================================================================
// SERVICE-TO-SERVICE ROUTES (Internal API calls)
// ================================================================

// Create delivery request (from order service)
router.post(
  "/",
  serviceAuth,
  rateLimitMiddleware.serviceRate,
  DeliveryController.createDelivery
);

// Assign delivery to driver (internal)
router.post(
  "/:id/assign",
  serviceAuth,
  rateLimitMiddleware.serviceRate,
  DeliveryController.assignDeliveryInternal
);

// Update delivery status (from external services)
router.patch(
  "/:id/status-update",
  serviceAuth,
  rateLimitMiddleware.serviceRate,
  DeliveryController.updateDeliveryStatusInternal
);

// ================================================================
// PUBLIC ROUTES (No authentication required)
// ================================================================

// Track delivery by tracking number (public)
router.get(
  "/track/:trackingNumber",
  rateLimitMiddleware.publicRate,
  DeliveryController.trackDelivery
);

// Get delivery ETA (public)
router.get(
  "/eta/:trackingNumber",
  rateLimitMiddleware.publicRate,
  DeliveryController.getDeliveryETA
);

// ================================================================
// USER ROUTES (Customer/Restaurant/Driver access)
// ================================================================

// Get delivery details
router.get(
  "/:id",
  auth,
  rateLimitMiddleware.userRate,
  DeliveryController.getDelivery
);

// Update delivery status (driver/restaurant actions)
router.patch(
  "/:id/status",
  auth,
  rateLimitMiddleware.deliveryRate,
  DeliveryController.updateDeliveryStatus
);

// Get delivery history for user
router.get(
  "/history/user",
  auth,
  rateLimitMiddleware.userRate,
  DeliveryController.getUserDeliveryHistory
);

// ================================================================
// DRIVER SPECIFIC ROUTES
// ================================================================

// Accept delivery (driver)
router.post(
  "/:id/accept",
  auth,
  rateLimitMiddleware.driverRate,
  DeliveryController.acceptDelivery
);

// Decline delivery (driver)
router.post(
  "/:id/decline",
  auth,
  rateLimitMiddleware.driverRate,
  DeliveryController.declineDelivery
);

// Start delivery (driver picks up from restaurant)
router.post(
  "/:id/pickup",
  auth,
  rateLimitMiddleware.driverRate,
  validateLocation,
  DeliveryController.pickupDelivery
);

// Complete delivery (driver delivers to customer)
router.post(
  "/:id/complete",
  auth,
  rateLimitMiddleware.driverRate,
  validateLocation,
  DeliveryController.completeDelivery
);

// Update driver location during delivery
router.post(
  "/:id/location",
  auth,
  rateLimitMiddleware.locationRate,
  validateLocation,
  DeliveryController.updateDeliveryLocation
);

// Report delivery issue
router.post(
  "/:id/issue",
  auth,
  rateLimitMiddleware.userRate,
  DeliveryController.reportDeliveryIssue
);

// ================================================================
// QR CODE ROUTES
// ================================================================

// Validate QR code for pickup/delivery
router.post(
  "/:id/validate-qr",
  auth,
  rateLimitMiddleware.qrRate,
  DeliveryController.validateQRCode
);

// Generate QR code image
router.get(
  "/:id/qr-code",
  auth,
  rateLimitMiddleware.userRate,
  DeliveryController.generateQRCodeImage
);

// Regenerate QR codes (admin/restaurant)
router.post(
  "/:id/regenerate-qr",
  auth,
  rateLimitMiddleware.adminRate,
  DeliveryController.regenerateQRCodes
);

// ================================================================
// RATING AND FEEDBACK ROUTES
// ================================================================

// Rate delivery (customer)
router.post(
  "/:id/rate",
  auth,
  rateLimitMiddleware.userRate,
  DeliveryController.rateDelivery
);

// Get delivery ratings
router.get(
  "/:id/ratings",
  auth,
  rateLimitMiddleware.userRate,
  DeliveryController.getDeliveryRatings
);

// Add delivery feedback
router.post(
  "/:id/feedback",
  auth,
  rateLimitMiddleware.userRate,
  DeliveryController.addDeliveryFeedback
);

// ================================================================
// ANALYTICS AND STATISTICS ROUTES
// ================================================================

// Get delivery statistics
router.get(
  "/stats/overview",
  auth,
  rateLimitMiddleware.userRate,
  DeliveryController.getDeliveryStats
);

// Get delivery performance metrics
router.get(
  "/analytics/performance",
  auth,
  adminAuth(["admin", "support", "sales"]),
  rateLimitMiddleware.adminRate,
  DeliveryController.getDeliveryPerformance
);

// Get driver performance
router.get(
  "/analytics/driver/:driverId",
  auth,
  rateLimitMiddleware.userRate,
  DeliveryController.getDriverPerformance
);

// ================================================================
// EMERGENCY AND SUPPORT ROUTES
// ================================================================

// Emergency stop delivery
router.post(
  "/:id/emergency-stop",
  auth,
  rateLimitMiddleware.emergencyRate,
  DeliveryController.emergencyStopDelivery
);

// Contact customer/restaurant/driver
router.post(
  "/:id/contact",
  auth,
  rateLimitMiddleware.contactRate,
  DeliveryController.contactParticipant
);

// Get delivery timeline
router.get(
  "/:id/timeline",
  auth,
  rateLimitMiddleware.userRate,
  DeliveryController.getDeliveryTimeline
);

module.exports = router;






// ----------------------------------------------------------------
// Main Route Registration (add to server.js)
// ----------------------------------------------------------------

/*
// Add these route registrations to your delivery microservice server.js:

// Main delivery routes
app.use('/api/deliveries', deliveryRoutes);

// Driver management routes
app.use('/api/drivers', driverRoutes);

// Real-time tracking routes
app.use('/api/tracking', trackingRoutes);

// Administrative routes
app.use('/api/admin', adminRoutes);

// Health check and status
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Delivery Microservice',
    timestamp: new Date().toISOString(),
    realtime: 'Active'
  });
});
*/
