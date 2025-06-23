const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");
const { uploadMiddleware } = require("../middleware/uploadMiddleware");
const { rateLimitMiddleware } = require("../middleware/rateLimitMiddleware");

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get("/profile", authMiddleware, UserController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 */
router.put("/profile", authMiddleware, UserController.updateProfile);


// getUserById
router.get("/:userId", authMiddleware, UserController.getUserById);

/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Invalid current password
 */
router.put("/change-password", authMiddleware, UserController.changePassword);

/**
 * @swagger
 * /api/users/location:
 *   put:
 *     summary: Update driver location (drivers only)
 *     tags: [Driver Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 format: double
 *                 minimum: -90
 *                 maximum: 90
 *               longitude:
 *                 type: number
 *                 format: double
 *                 minimum: -180
 *                 maximum: 180
 *               isAvailable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       403:
 *         description: Only delivery drivers can update location
 */
router.put(
  "/location",
  authMiddleware,
  roleMiddleware(["delivery_driver"]),
  UserController.updateLocation
);

/**
 * @swagger
 * /api/users/availability:
 *   put:
 *     summary: Update driver availability (drivers only)
 *     tags: [Driver Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isAvailable
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *       403:
 *         description: Only delivery drivers can update availability
 */
router.put(
  "/availability",
  authMiddleware,
  roleMiddleware(["delivery_driver"]),
  UserController.updateAvailability
);

/**
 * @swagger
 * /api/users/notification-settings:
 *   put:
 *     summary: Update notification settings
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationSettings:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: boolean
 *                   push:
 *                     type: boolean
 *                   sms:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Notification settings updated successfully
 */
router.put(
  "/notification-settings",
  authMiddleware,
  UserController.updateNotificationSettings
);

/**
 * @swagger
 * /api/users/profile-picture:
 *   post:
 *     summary: Upload profile picture
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *       400:
 *         description: No file uploaded
 */
router.post(
  "/profile-picture",
  authMiddleware,
  uploadMiddleware.single("profilePicture"),
  UserController.uploadProfilePicture
);

/**
 * @swagger
 * /api/users/deactivate:
 *   put:
 *     summary: Deactivate user account
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account deactivated successfully
 */
router.put("/deactivate", authMiddleware, UserController.deactivateAccount);

// Service-to-Service Routes (Internal API)
/**
 * @swagger
 * /api/users/internal/{uuid}:
 *   get:
 *     summary: Get user by UUID (internal service use)
 *     tags: [Internal API]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
router.get("/internal/:uuid", UserController.getUserById);

/**
 * @swagger
 * /api/users/internal/bulk:
 *   post:
 *     summary: Get multiple users by UUIDs (internal service use)
 *     tags: [Internal API]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uuids
 *             properties:
 *               uuids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 maxItems: 100
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.post("/internal/bulk", UserController.getUsersByIds);

/**
 * @swagger
 * /api/users/type/{userType}:
 *   get:
 *     summary: Get users by type
 *     tags: [Internal API]
 *     parameters:
 *       - in: path
 *         name: userType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [end_user, restaurant_owner, delivery_driver, developer, sales_dept, tech_support]
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
 *           maximum: 100
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get("/type/:userType", UserController.getUsersByType);

/**
 * @swagger
 * /api/users/drivers/available:
 *   get:
 *     summary: Get available delivery drivers
 *     tags: [Driver Management]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           format: double
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           format: double
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *           description: Search radius in kilometers
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Available drivers retrieved successfully
 */
router.get("/drivers/available", UserController.getAvailableDrivers);

// Admin Routes
/**
 * @swagger
 * /api/users/admin/search:
 *   get:
 *     summary: Search users (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
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
 *         description: Search results
 *       403:
 *         description: Admin access required
 */
router.get(
  "/admin/search",
  authMiddleware,
  roleMiddleware(["sales_dept", "tech_support"]),
  UserController.searchUsers
);

/**
 * @swagger
 * /api/users/admin/{uuid}/reactivate:
 *   put:
 *     summary: Reactivate user account (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Account reactivated successfully
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 */
router.put(
  "/admin/:uuid/reactivate",
  authMiddleware,
  roleMiddleware(["sales_dept", "tech_support"]),
  UserController.reactivateAccount
);

/**
 * @swagger
 * /api/users/stats/{userType}:
 *   get:
 *     summary: Get user statistics (admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [end_user, restaurant_owner, delivery_driver, developer, sales_dept, tech_support]
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
 *         description: Statistics retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get(
  "/stats/:userType?",
  authMiddleware,
  roleMiddleware(["sales_dept", "tech_support"]),
  UserController.getUserStats
);

module.exports = router;
