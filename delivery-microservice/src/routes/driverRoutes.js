
const express = require("express");
const DriverController = require("../controllers/driverController");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const rateLimitMiddleware = require("../middleware/rateLimit");
const validateLocation = require("../middleware/validateLocation");
const uploadMiddleware = require("../middleware/upload");
const router = express.Router();

// ================================================================
// DRIVER REGISTRATION AND PROFILE
// ================================================================

// Register as driver
router.post(
  "/register",
  auth,
  uploadMiddleware.driverDocuments,
  rateLimitMiddleware.registrationRate,
  DriverController.registerDriver
);

// Get driver profile
router.get(
  "/profile",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverProfile
);

// Update driver profile
router.put(
  "/profile",
  auth,
  uploadMiddleware.driverDocuments,
  rateLimitMiddleware.userRate,
  DriverController.updateDriverProfile
);

// Upload driver documents
router.post(
  "/documents",
  auth,
  uploadMiddleware.driverDocuments,
  rateLimitMiddleware.uploadRate,
  DriverController.uploadDriverDocuments
);

// Get driver verification status
router.get(
  "/verification-status",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getVerificationStatus
);

// ================================================================
// LOCATION AND AVAILABILITY
// ================================================================

// Update driver location
router.post(
  "/location",
  auth,
  rateLimitMiddleware.locationRate,
  validateLocation,
  DriverController.updateLocation
);

// Toggle driver availability
router.post(
  "/availability",
  auth,
  rateLimitMiddleware.availabilityRate,
  DriverController.toggleAvailability
);

// Get nearby drivers (admin/support)
router.get(
  "/nearby",
  auth,
  adminAuth(["admin", "support", "restaurant"]),
  rateLimitMiddleware.adminRate,
  DriverController.getNearbyDrivers
);

// Set driver work schedule
router.put(
  "/schedule",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.setDriverSchedule
);

// Get driver work schedule
router.get(
  "/schedule",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverSchedule
);

// ================================================================
// DELIVERY MANAGEMENT
// ================================================================

// Get available deliveries for driver
router.get(
  "/available-deliveries",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getAvailableDeliveries
);

// Get current delivery
router.get(
  "/current-delivery",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getCurrentDelivery
);

// Get driver deliveries history
router.get(
  "/deliveries",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverDeliveries
);

// Get delivery route optimization
router.get(
  "/route/:deliveryId",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getOptimizedRoute
);

// ================================================================
// EARNINGS AND STATISTICS
// ================================================================

// Get driver statistics
router.get(
  "/stats",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverStats
);

// Get driver earnings
router.get(
  "/earnings",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverEarnings
);

// Get driver performance metrics
router.get(
  "/performance",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverPerformance
);

// Get driver ratings and reviews
router.get(
  "/ratings",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverRatings
);

// ================================================================
// REFERRAL SYSTEM
// ================================================================

// Get driver referral code
router.get(
  "/referral-code",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverReferralCode
);

// Get referral statistics
router.get(
  "/referral-stats",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getReferralStats
);

// Generate new referral code
router.post(
  "/referral-code/generate",
  auth,
  rateLimitMiddleware.referralRate,
  DriverController.generateReferralCode
);

// ================================================================
// VEHICLE MANAGEMENT
// ================================================================

// Update vehicle information
router.put(
  "/vehicle",
  auth,
  uploadMiddleware.vehicleDocuments,
  rateLimitMiddleware.userRate,
  DriverController.updateVehicleInfo
);

// Get vehicle information
router.get(
  "/vehicle",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getVehicleInfo
);

// Report vehicle issue
router.post(
  "/vehicle/issue",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.reportVehicleIssue
);

// ================================================================
// ADMIN ROUTES
// ================================================================

// Get all drivers (admin)
router.get(
  "/all",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  DriverController.getAllDrivers
);

// Verify driver (admin)
router.post(
  "/:id/verify",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  DriverController.verifyDriver
);

// Suspend driver (admin)
router.post(
  "/:id/suspend",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  DriverController.suspendDriver
);

// Get driver admin details
router.get(
  "/:id/admin-details",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  DriverController.getDriverAdminDetails
);

module.exports = router;