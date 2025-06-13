const express = require("express");
const AdminController = require("../controllers/adminController");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const rateLimitMiddleware = require("../middleware/rateLimit");
const router = express.Router();

// ================================================================
// SYSTEM MANAGEMENT
// ================================================================

// Get system overview and health
router.get(
  "/system/overview",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getSystemOverview
);

// Get real-time system metrics
router.get(
  "/system/metrics",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getSystemMetrics
);

// Get connected users via WebSocket
router.get(
  "/system/connected-users",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getConnectedUsers
);

// ================================================================
// USER MANAGEMENT
// ================================================================

// Get user notification history (admin view)
router.get(
  "/users/:userId/notifications",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getUserNotificationHistory
);

// Get user preferences (admin view)
router.get(
  "/users/:userId/preferences",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getUserPreferences
);

// Update user preferences (admin action)
router.put(
  "/users/:userId/preferences",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  AdminController.updateUserPreferences
);

// Get user devices (admin view)
router.get(
  "/users/:userId/devices",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getUserDevices
);

// ================================================================
// NOTIFICATION MANAGEMENT
// ================================================================

// Get all notifications with advanced filtering
router.get(
  "/notifications",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getAllNotifications
);

// Resend failed notification
router.post(
  "/notifications/:id/resend",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.resendNotification
);

// Cancel scheduled notification
router.post(
  "/notifications/:id/cancel",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  AdminController.cancelNotification
);

// Bulk operations on notifications
router.post(
  "/notifications/bulk-action",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.bulkRate,
  AdminController.bulkNotificationAction
);

// ================================================================
// ANALYTICS AND REPORTING
// ================================================================

// Generate comprehensive report
router.post(
  "/reports/generate",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.generateReport
);

// Get delivery statistics
router.get(
  "/analytics/delivery",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getDeliveryAnalytics
);

// Get user engagement metrics
router.get(
  "/analytics/engagement",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getEngagementAnalytics
);

// Get channel performance
router.get(
  "/analytics/channels",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getChannelAnalytics
);

// ================================================================
// MAINTENANCE OPERATIONS
// ================================================================

// Manual cleanup operations
router.post(
  "/maintenance/cleanup",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  AdminController.performCleanup
);

// Update system configuration
router.put(
  "/config/system",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  AdminController.updateSystemConfig
);

// Test system components
router.post(
  "/test/system",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.testRate,
  AdminController.testSystemComponents
);

module.exports = router;
