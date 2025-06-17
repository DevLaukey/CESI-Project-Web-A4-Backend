const express = require("express");
const AdminController = require("../controllers/adminController");
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminAuth");
const rateLimitMiddleware = require("../middleware/rateLimit");
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Admin - System
 *     description: System overview and health monitoring
 *   - name: Admin - Deliveries
 *     description: Administrative delivery management
 *   - name: Admin - Drivers
 *     description: Driver management and approval
 *   - name: Admin - Analytics
 *     description: Analytics and reporting
 *   - name: Admin - Configuration
 *     description: System configuration management
 */

// ================================================================
// SYSTEM OVERVIEW
// ================================================================

/**
 * @swagger
 * /api/admin/system/overview:
 *   get:
 *     summary: Get delivery system overview
 *     tags: [Admin - System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System overview data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalDeliveries:
 *                       type: integer
 *                     activeDeliveries:
 *                       type: integer
 *                     totalDrivers:
 *                       type: integer
 *                     activeDrivers:
 *                       type: integer
 *                     systemHealth:
 *                       type: string
 *                       enum: [healthy, degraded, critical]
 *       403:
 *         description: Insufficient permissions
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/system/overview",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getSystemOverview
);


/**
 * @swagger
 * /api/admin/system/health:
 *   get:
 *     summary: Get system health status
 *     tags: [Admin - System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health information
 */
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

/**
 * @swagger
 * /api/admin/deliveries:
 *   get:
 *     summary: Get all deliveries with admin filters
 *     tags: [Admin - Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, picked_up, in_transit, delivered, cancelled]
 *       - in: query
 *         name: driverId
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of deliveries with admin details
 */
router.get(
  "/deliveries",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getAllDeliveries
);

/**
 * @swagger
 * /api/admin/deliveries/{id}/assign:
 *   post:
 *     summary: Manually assign delivery to driver
 *     tags: [Admin - Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverId
 *             properties:
 *               driverId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 description: Reason for manual assignment
 *     responses:
 *       200:
 *         description: Delivery assigned successfully
 *       404:
 *         description: Delivery or driver not found
 */
router.post(
  "/deliveries/:id/assign",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.manuallyAssignDelivery
);

/**
 * @swagger
 * /api/admin/deliveries/{id}/reassign:
 *   post:
 *     summary: Reassign delivery to different driver
 *     tags: [Admin - Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newDriverId
 *               - reason
 *             properties:
 *               newDriverId:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Delivery reassigned successfully
 */
router.post(
  "/deliveries/:id/reassign",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.reassignDelivery
);

/**
 * @swagger
 * /api/admin/deliveries/{id}/cancel:
 *   post:
 *     summary: Cancel delivery (admin only)
 *     tags: [Admin - Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *               refundAmount:
 *                 type: number
 *               notifyCustomer:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Delivery cancelled successfully
 */
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

/**
 * @swagger
 * /api/admin/drivers:
 *   get:
 *     summary: Get all drivers with admin filters
 *     tags: [Admin - Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending_verification, verified, suspended, rejected]
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of drivers with admin details
 */
router.get(
  "/drivers",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getAllDrivers
);

/**
 * @swagger
 * /api/admin/drivers/{id}:
 *   get:
 *     summary: Get detailed driver information
 *     tags: [Admin - Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed driver information
 *       404:
 *         description: Driver not found
 */
router.get(
  "/drivers/:id",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getDriverDetails
);

/**
 * @swagger
 * /api/admin/drivers/{id}/approve:
 *   post:
 *     summary: Approve driver application
 *     tags: [Admin - Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Approval notes
 *     responses:
 *       200:
 *         description: Driver approved successfully
 */
router.post(
  "/drivers/:id/approve",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.approveDriver
);

/**
 * @swagger
 * /api/admin/drivers/{id}/reject:
 *   post:
 *     summary: Reject driver application
 *     tags: [Admin - Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Driver rejected successfully
 */
router.post(
  "/drivers/:id/reject",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.rejectDriver
);

/**
 * @swagger
 * /api/admin/drivers/{id}/suspend:
 *   post:
 *     summary: Suspend driver (admin only)
 *     tags: [Admin - Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *               duration:
 *                 type: integer
 *                 description: Suspension duration in days
 *     responses:
 *       200:
 *         description: Driver suspended successfully
 */
router.post(
  "/drivers/:id/suspend",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  AdminController.suspendDriver
);

/**
 * @swagger
 * /api/admin/drivers/{id}/reactivate:
 *   post:
 *     summary: Reactivate suspended driver (admin only)
 *     tags: [Admin - Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Driver reactivated successfully
 */
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

/**
 * @swagger
 * /api/admin/analytics/deliveries:
 *   get:
 *     summary: Get delivery analytics
 *     tags: [Admin - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *           default: month
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Delivery analytics data
 */
router.get(
  "/analytics/deliveries",
  auth,
  adminAuth(["admin", "support", "sales"]),
  rateLimitMiddleware.adminRate,
  AdminController.getDeliveryAnalytics
);

/**
 * @swagger
 * /api/admin/analytics/drivers:
 *   get:
 *     summary: Get driver analytics
 *     tags: [Admin - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Driver analytics data
 */
router.get(
  "/analytics/drivers",
  auth,
  adminAuth(["admin", "support", "sales"]),
  rateLimitMiddleware.adminRate,
  AdminController.getDriverAnalytics
);

/**
 * @swagger
 * /api/admin/analytics/performance:
 *   get:
 *     summary: Get performance metrics
 *     tags: [Admin - Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance metrics
 */
router.get(
  "/analytics/performance",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  AdminController.getPerformanceMetrics
);

/**
 * @swagger
 * /api/admin/reports/generate:
 *   post:
 *     summary: Generate custom reports
 *     tags: [Admin - Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reportType
 *               - dateRange
 *             properties:
 *               reportType:
 *                 type: string
 *                 enum: [delivery_summary, driver_performance, financial, operational]
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   startDate:
 *                     type: string
 *                     format: date
 *                   endDate:
 *                     type: string
 *                     format: date
 *               filters:
 *                 type: object
 *               format:
 *                 type: string
 *                 enum: [json, csv, pdf]
 *                 default: json
 *     responses:
 *       200:
 *         description: Report generated successfully
 */
router.post(
  "/reports/generate",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.reportRate,
  AdminController.generateReport
);



module.exports = router;
