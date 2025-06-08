const express = require("express");
const NotificationController = require("../controllers/notificationController");
const auth = require("../middleware/auth");
const serviceAuth = require("../middleware/serviceAuth");
const adminAuth = require("../middleware/adminAuth");
const rateLimitMiddleware = require("../middleware/rateLimit");
const router = express.Router();

// ================================================================
// SERVICE-TO-SERVICE ROUTES (Internal API calls)
// ================================================================

// Send single notification (from other microservices)
router.post(
  "/",
  serviceAuth,
  rateLimitMiddleware.serviceRate,
  NotificationController.sendNotification
);

// Send bulk notifications (batch processing)
router.post(
  "/bulk",
  serviceAuth,
  rateLimitMiddleware.bulkRate,
  NotificationController.sendBulkNotifications
);

// Send notification to restaurant
router.post(
  "/restaurant",
  serviceAuth,
  rateLimitMiddleware.serviceRate,
  NotificationController.sendToRestaurant
);

// Send notification to specific driver
router.post(
  "/driver",
  serviceAuth,
  rateLimitMiddleware.serviceRate,
  NotificationController.sendToDriver
);

// Send system-wide broadcast (admin only via service)
router.post(
  "/broadcast",
  serviceAuth,
  rateLimitMiddleware.broadcastRate,
  NotificationController.sendBroadcast
);

// ================================================================
// USER ROUTES (Customer/Driver/Restaurant access)
// ================================================================

// Get user's notifications with filtering and pagination
router.get(
  "/user",
  auth,
  rateLimitMiddleware.userRate,
  NotificationController.getUserNotifications
);

// Get unread notification count
router.get(
  "/unread-count",
  auth,
  rateLimitMiddleware.userRate,
  NotificationController.getUnreadCount
);

// Mark specific notification as read
router.put(
  "/:id/read",
  auth,
  rateLimitMiddleware.userRate,
  NotificationController.markAsRead
);

// Mark all notifications as read (with optional type filter)
router.put(
  "/read-all",
  auth,
  rateLimitMiddleware.userRate,
  NotificationController.markAllAsRead
);

// Delete/hide notification
router.delete(
  "/:id",
  auth,
  rateLimitMiddleware.userRate,
  NotificationController.deleteNotification
);

// Get specific notification details
router.get(
  "/:id",
  auth,
  rateLimitMiddleware.userRate,
  NotificationController.getNotification
);

// ================================================================
// PREFERENCE ROUTES
// ================================================================

// Get user notification preferences
router.get(
  "/preferences",
  auth,
  rateLimitMiddleware.userRate,
  NotificationController.getNotificationPreferences
);

// Update user notification preferences
router.put(
  "/preferences",
  auth,
  rateLimitMiddleware.userRate,
  NotificationController.updateNotificationPreferences
);

// Reset preferences to default
router.post(
  "/preferences/reset",
  auth,
  rateLimitMiddleware.userRate,
  NotificationController.resetNotificationPreferences
);

// ================================================================
// ADMIN/ANALYTICS ROUTES
// ================================================================

// Get notification statistics (admin/support only)
router.get(
  "/stats",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  NotificationController.getNotificationStats
);

// Get detailed analytics
router.get(
  "/analytics",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  NotificationController.getNotificationAnalytics
);

// Get system health metrics
router.get(
  "/health/metrics",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  NotificationController.getHealthMetrics
);

// Manual retry failed notifications
router.post(
  "/retry-failed",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  NotificationController.retryFailedNotifications
);

// Cleanup old notifications
router.post(
  "/cleanup",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  NotificationController.cleanupNotifications
);

module.exports = router;
