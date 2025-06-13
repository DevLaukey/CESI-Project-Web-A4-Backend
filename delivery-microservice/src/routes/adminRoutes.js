
const express = require("express");
const AdminController = require("../controllers/adminController");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const rateLimitMiddleware = require("../middleware/rateLimit");
const router = express.Router();

// ================================================================
// SYSTEM OVERVIEW
// ================================================================

// Get delivery system overview
router.get(
  "/system/overview",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getSystemOverview
);

// Get real-time metrics
router.get(
  "/system/metrics",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getRealTimeMetrics
);

// Get system health
router.get(
  "/system/health",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getSystemHealth
);

// ================================================================
// DELIVERY MANAGEMENT
// ================================================================

// Get all deliveries with filters
router.get(
  "/deliveries",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getAllDeliveries
);

// Manually assign delivery
router.post(
  "/deliveries/:id/assign",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.manuallyAssignDelivery
);

// Reassign delivery
router.post(
  "/deliveries/:id/reassign",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.reassignDelivery
);

// Cancel delivery
router.post(
  "/deliveries/:id/cancel",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  AdminController.cancelDelivery
);

// ================================================================
// DRIVER MANAGEMENT
// ================================================================

// Get all drivers with filters
router.get(
  "/drivers",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getAllDrivers
);

// Get driver details
router.get(
  "/drivers/:id",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getDriverDetails
);

// Approve driver application
router.post(
  "/drivers/:id/approve",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.approveDriver
);

// Reject driver application
router.post(
  "/drivers/:id/reject",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.rejectDriver
);

// Suspend driver
router.post(
  "/drivers/:id/suspend",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  AdminController.suspendDriver
);

// Reactivate driver
router.post(
  "/drivers/:id/reactivate",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  AdminController.reactivateDriver
);

// ================================================================
// ANALYTICS AND REPORTING
// ================================================================

// Get delivery analytics
router.get(
  "/analytics/deliveries",
  auth,
  adminAuth(["admin", "support", "sales"]),
  rateLimitMiddleware.adminRate,
  AdminController.getDeliveryAnalytics
);

// Get driver analytics
router.get(
  "/analytics/drivers",
  auth,
  adminAuth(["admin", "support", "sales"]),
  rateLimitMiddleware.adminRate,
  AdminController.getDriverAnalytics
);

// Get performance metrics
router.get(
  "/analytics/performance",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getPerformanceMetrics
);

// Generate reports
router.post(
  "/reports/generate",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.reportRate,
  AdminController.generateReport
);

// ================================================================
// CONFIGURATION MANAGEMENT
// ================================================================

// Get delivery configuration
router.get(
  "/config/delivery",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getDeliveryConfig
);

// Update delivery configuration
router.put(
  "/config/delivery",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  AdminController.updateDeliveryConfig
);

// Get zone configuration
router.get(
  "/config/zones",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getZoneConfig
);

// Update zone configuration
router.put(
  "/config/zones",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  AdminController.updateZoneConfig
);

module.exports = router;
