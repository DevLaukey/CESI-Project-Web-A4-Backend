const express = require("express");
const DriverController = require("../controllers/driverController");
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminAuth");
const rateLimitMiddleware = require("../middleware/rateLimit");
const validateLocation = require("../middleware/validateLocation");
const upload = require("../middleware/upload");
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Driver - Registration
 *     description: Driver registration and profile management
 *   - name: Driver - Location
 *     description: Driver location and availability management
 *   - name: Driver - Deliveries
 *     description: Driver delivery operations
 *   - name: Driver - Analytics
 *     description: Driver performance and earnings
 *   - name: Driver - Admin
 *     description: Administrative driver operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     DriverProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         licenseNumber:
 *           type: string
 *         vehicle:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *             make:
 *               type: string
 *             model:
 *               type: string
 *             year:
 *               type: integer
 *             licensePlate:
 *               type: string
 *             color:
 *               type: string
 *         isVerified:
 *           type: boolean
 *         isAvailable:
 *           type: boolean
 *         status:
 *           type: string
 *           enum: [pending_verification, verified, suspended, rejected]
 *         location:
 *           type: object
 *           properties:
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *             lastUpdated:
 *               type: string
 *               format: date-time
 *     DriverStats:
 *       type: object
 *       properties:
 *         totalDeliveries:
 *           type: integer
 *         completedDeliveries:
 *           type: integer
 *         totalEarnings:
 *           type: number
 *         averageRating:
 *           type: number
 *         totalHours:
 *           type: number
 *         completionRate:
 *           type: number
 *     VehicleInfo:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [car, motorcycle, bicycle, truck]
 *         make:
 *           type: string
 *         model:
 *           type: string
 *         year:
 *           type: integer
 *         licensePlate:
 *           type: string
 *         color:
 *           type: string
 *         documents:
 *           type: object
 *         lastInspection:
 *           type: string
 *           format: date
 *         insuranceExpiry:
 *           type: string
 *           format: date
 */

// ================================================================
// DRIVER REGISTRATION AND PROFILE
// ================================================================

/**
 * @swagger
 * /api/drivers/register:
 *   post:
 *     summary: Register as a driver
 *     tags: [Driver - Registration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - phone
 *               - licenseNumber
 *               - vehicleType
 *               - vehicleMake
 *               - vehicleModel
 *               - vehicleYear
 *               - licensePlate
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               licenseNumber:
 *                 type: string
 *                 example: "DL123456789"
 *               vehicleType:
 *                 type: string
 *                 enum: [car, motorcycle, bicycle, truck]
 *               vehicleMake:
 *                 type: string
 *                 example: "Toyota"
 *               vehicleModel:
 *                 type: string
 *                 example: "Camry"
 *               vehicleYear:
 *                 type: integer
 *                 example: 2020
 *               licensePlate:
 *                 type: string
 *                 example: "ABC123"
 *               vehicleColor:
 *                 type: string
 *                 example: "Blue"
 *               emergencyContact:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   relation:
 *                     type: string
 *               driverLicense:
 *                 type: string
 *                 format: binary
 *                 description: Driver's license image
 *               vehicleRegistration:
 *                 type: string
 *                 format: binary
 *                 description: Vehicle registration document
 *               insurance:
 *                 type: string
 *                 format: binary
 *                 description: Insurance document
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *                 description: Driver's profile photo
 *     responses:
 *       201:
 *         description: Driver registration submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     verificationRequired:
 *                       type: boolean
 *       400:
 *         description: Validation error
 *       409:
 *         description: User is already registered as a driver
 */
router.post(
  "/register",
  auth,
  upload.driverRegistration,
  rateLimitMiddleware.userRate,
  DriverController.registerDriver
);

/**
 * @swagger
 * /api/drivers/profile:
 *   get:
 *     summary: Get driver profile
 *     tags: [Driver - Registration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DriverProfile'
 *       404:
 *         description: Driver profile not found
 */
router.get(
  "/profile",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverProfile
);

/**
 * @swagger
 * /api/drivers/profile:
 *   put:
 *     summary: Update driver profile
 *     tags: [Driver - Registration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               emergencyContact:
 *                 type: object
 *               vehicleColor:
 *                 type: string
 *               newDocuments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       404:
 *         description: Driver profile not found
 */
router.put(
  "/profile",
  auth,
  upload.driverProfileUpdate,
  rateLimitMiddleware.userRate,
  DriverController.updateDriverProfile
);

/**
 * @swagger
 * /api/drivers/documents:
 *   post:
 *     summary: Upload additional driver documents
 *     tags: [Driver - Registration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Documents uploaded successfully
 *       404:
 *         description: Driver profile not found
 */
router.post(
  "/documents",
  auth,
  upload.driverProfileUpdate,
  rateLimitMiddleware.userRate,
  DriverController.uploadDriverDocuments
);

/**
 * @swagger
 * /api/drivers/verification-status:
 *   get:
 *     summary: Get driver verification status
 *     tags: [Driver - Registration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification status details
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
 *                     isVerified:
 *                       type: boolean
 *                     status:
 *                       type: string
 *                     documentsStatus:
 *                       type: object
 *                     verificationNotes:
 *                       type: string
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 */
router.get(
  "/verification-status",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getVerificationStatus
);

// ================================================================
// LOCATION AND AVAILABILITY
// ================================================================

/**
 * @swagger
 * /api/drivers/location:
 *   post:
 *     summary: Update driver location
 *     tags: [Driver - Location]
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
 *                 example: 40.7128
 *               longitude:
 *                 type: number
 *                 example: -74.0060
 *               heading:
 *                 type: number
 *                 description: Direction in degrees (0-360)
 *               speed:
 *                 type: number
 *                 description: Speed in km/h
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       404:
 *         description: Driver profile not found
 */
router.post(
  "/location",
  auth,
  validateLocation,
  rateLimitMiddleware.locationRate,
  DriverController.updateLocation
);

/**
 * @swagger
 * /api/drivers/availability:
 *   patch:
 *     summary: Toggle driver availability
 *     tags: [Driver - Location]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - available
 *             properties:
 *               available:
 *                 type: boolean
 *                 description: Set driver availability status
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *       403:
 *         description: Driver must be verified to toggle availability
 *       404:
 *         description: Driver profile not found
 */
router.patch(
  "/availability",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.toggleAvailability
);

/**
 * @swagger
 * /api/drivers/schedule:
 *   get:
 *     summary: Get driver work schedule
 *     tags: [Driver - Location]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver work schedule
 *       404:
 *         description: Driver profile not found
 */
router.get(
  "/schedule",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverSchedule
);

/**
 * @swagger
 * /api/drivers/schedule:
 *   post:
 *     summary: Set driver work schedule
 *     tags: [Driver - Location]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - schedule
 *             properties:
 *               schedule:
 *                 type: object
 *                 properties:
 *                   monday:
 *                     type: object
 *                     properties:
 *                       isWorking:
 *                         type: boolean
 *                       startTime:
 *                         type: string
 *                         format: time
 *                       endTime:
 *                         type: string
 *                         format: time
 *                   tuesday:
 *                     type: object
 *                     properties:
 *                       isWorking:
 *                         type: boolean
 *                       startTime:
 *                         type: string
 *                         format: time
 *                       endTime:
 *                         type: string
 *                         format: time
 *                   wednesday:
 *                     type: object
 *                     properties:
 *                       isWorking:
 *                         type: boolean
 *                       startTime:
 *                         type: string
 *                         format: time
 *                       endTime:
 *                         type: string
 *                         format: time
 *                   thursday:
 *                     type: object
 *                     properties:
 *                       isWorking:
 *                         type: boolean
 *                       startTime:
 *                         type: string
 *                         format: time
 *                       endTime:
 *                         type: string
 *                         format: time
 *                   friday:
 *                     type: object
 *                     properties:
 *                       isWorking:
 *                         type: boolean
 *                       startTime:
 *                         type: string
 *                         format: time
 *                       endTime:
 *                         type: string
 *                         format: time
 *                   saturday:
 *                     type: object
 *                     properties:
 *                       isWorking:
 *                         type: boolean
 *                       startTime:
 *                         type: string
 *                         format: time
 *                       endTime:
 *                         type: string
 *                         format: time
 *                   sunday:
 *                     type: object
 *                     properties:
 *                       isWorking:
 *                         type: boolean
 *                       startTime:
 *                         type: string
 *                         format: time
 *                       endTime:
 *                         type: string
 *                         format: time
 *     responses:
 *       200:
 *         description: Work schedule updated successfully
 */
router.post(
  "/schedule",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.setDriverSchedule
);

// ================================================================
// DELIVERY MANAGEMENT
// ================================================================

/**
 * @swagger
 * /api/drivers/deliveries/available:
 *   get:
 *     summary: Get available deliveries for driver
 *     tags: [Driver - Deliveries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available deliveries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Delivery'
 *       403:
 *         description: Driver must be verified and available
 */
router.get(
  "/deliveries/available",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getAvailableDeliveries
);

/**
 * @swagger
 * /api/drivers/deliveries/current:
 *   get:
 *     summary: Get current active delivery
 *     tags: [Driver - Deliveries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current delivery details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Delivery'
 */
router.get(
  "/deliveries/current",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getCurrentDelivery
);

/**
 * @swagger
 * /api/drivers/deliveries/history:
 *   get:
 *     summary: Get driver delivery history
 *     tags: [Driver - Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [completed, cancelled]
 *     responses:
 *       200:
 *         description: Delivery history
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
 *                     deliveries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Delivery'
 *                     pagination:
 *                       type: object
 */
router.get(
  "/deliveries/history",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverDeliveries
);

/**
 * @swagger
 * /api/drivers/deliveries/{deliveryId}/route:
 *   get:
 *     summary: Get optimized route for delivery
 *     tags: [Driver - Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Optimized route information
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
 *                     route:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           lat:
 *                             type: number
 *                           lng:
 *                             type: number
 *                           instruction:
 *                             type: string
 *                     distance:
 *                       type: number
 *                       description: Total distance in kilometers
 *                     estimatedTime:
 *                       type: number
 *                       description: Estimated time in minutes
 *                     traffic:
 *                       type: string
 *                       enum: [light, moderate, heavy]
 *       404:
 *         description: Delivery not found or not assigned to driver
 */
router.get(
  "/deliveries/:deliveryId/route",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getOptimizedRoute
);

// ================================================================
// EARNINGS AND STATISTICS
// ================================================================

/**
 * @swagger
 * /api/drivers/stats:
 *   get:
 *     summary: Get driver statistics
 *     tags: [Driver - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *           default: week
 *         description: Time period for statistics
 *     responses:
 *       200:
 *         description: Driver statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DriverStats'
 *       404:
 *         description: Driver profile not found
 */
router.get(
  "/stats",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverStats
);

/**
 * @swagger
 * /api/drivers/earnings:
 *   get:
 *     summary: Get driver earnings
 *     tags: [Driver - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for earnings period
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for earnings period
 *     responses:
 *       200:
 *         description: Driver earnings breakdown
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
 *                     totalEarnings:
 *                       type: number
 *                     baseEarnings:
 *                       type: number
 *                     tips:
 *                       type: number
 *                     bonuses:
 *                       type: number
 *                     deductions:
 *                       type: number
 *                     netEarnings:
 *                       type: number
 *                     earningsBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           amount:
 *                             type: number
 *                           deliveries:
 *                             type: integer
 */
router.get(
  "/earnings",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverEarnings
);

/**
 * @swagger
 * /api/drivers/performance:
 *   get:
 *     summary: Get driver performance metrics
 *     tags: [Driver - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Performance metrics
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
 *                     averageDeliveryTime:
 *                       type: number
 *                       description: Average delivery time in minutes
 *                     onTimeDeliveryRate:
 *                       type: number
 *                       description: Percentage of on-time deliveries
 *                     customerSatisfactionScore:
 *                       type: number
 *                     totalDistance:
 *                       type: number
 *                       description: Total distance covered in km
 *                     fuelEfficiency:
 *                       type: number
 *                     rank:
 *                       type: integer
 *                       description: Rank among all drivers
 */
router.get(
  "/performance",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverPerformance
);

/**
 * @swagger
 * /api/drivers/ratings:
 *   get:
 *     summary: Get driver ratings and reviews
 *     tags: [Driver - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Driver ratings and reviews
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
 *                     averageRating:
 *                       type: number
 *                     totalRatings:
 *                       type: integer
 *                     ratingDistribution:
 *                       type: object
 *                       properties:
 *                         1:
 *                           type: integer
 *                         2:
 *                           type: integer
 *                         3:
 *                           type: integer
 *                         4:
 *                           type: integer
 *                         5:
 *                           type: integer
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rating:
 *                             type: integer
 *                           comment:
 *                             type: string
 *                           deliveryId:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 */
router.get(
  "/ratings",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverRatings
);

// ================================================================
// REFERRAL SYSTEM
// ================================================================

/**
 * @swagger
 * /api/drivers/referral/code:
 *   get:
 *     summary: Get driver referral code
 *     tags: [Driver - Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver referral code
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
 *                     referralCode:
 *                       type: string
 *                     shareUrl:
 *                       type: string
 *                     qrCode:
 *                       type: string
 *                       description: Base64 encoded QR code image
 */
router.get(
  "/referral/code",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getDriverReferralCode
);

/**
 * @swagger
 * /api/drivers/referral/stats:
 *   get:
 *     summary: Get referral statistics
 *     tags: [Driver - Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral statistics
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
 *                     totalReferrals:
 *                       type: integer
 *                     successfulReferrals:
 *                       type: integer
 *                     pendingReferrals:
 *                       type: integer
 *                     totalEarnings:
 *                       type: number
 *                     referralHistory:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get(
  "/referral/stats",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getReferralStats
);

/**
 * @swagger
 * /api/drivers/referral/generate:
 *   post:
 *     summary: Generate new referral code
 *     tags: [Driver - Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: New referral code generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     referralCode:
 *                       type: string
 *                     shareUrl:
 *                       type: string
 */
router.post(
  "/referral/generate",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.generateReferralCode
);

// ================================================================
// VEHICLE MANAGEMENT
// ================================================================

/**
 * @swagger
 * /api/drivers/vehicle:
 *   get:
 *     summary: Get vehicle information
 *     tags: [Driver - Registration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VehicleInfo'
 */
router.get(
  "/vehicle",
  auth,
  rateLimitMiddleware.userRate,
  DriverController.getVehicleInfo
);

/**
 * @swagger
 * /api/drivers/vehicle:
 *   put:
 *     summary: Update vehicle information
 *     tags: [Driver - Registration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               color:
 *                 type: string
 *               licensePlate:
 *                 type: string
 *               insuranceExpiry:
 *                 type: string
 *                 format: date
 *               registrationExpiry:
 *                 type: string
 *                 format: date
 *               vehicleDocuments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Vehicle information updated successfully
 */
router.put(
  "/vehicle",
  auth,
  upload.vehicleDocuments,
  rateLimitMiddleware.userRate,
  DriverController.updateVehicleInfo
);



// ================================================================
// NEARBY DRIVERS (ADMIN/SUPPORT ONLY)
// ================================================================

/**
 * @swagger
 * /api/drivers/nearby:
 *   get:
 *     summary: Get nearby drivers (admin/support only)
 *     tags: [Driver - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *           description: Search radius in kilometers
 *     responses:
 *       200:
 *         description: List of nearby drivers
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
 *                     drivers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           location:
 *                             type: object
 *                           distance:
 *                             type: number
 *                           isAvailable:
 *                             type: boolean
 *                     count:
 *                       type: integer
 *                     radius:
 *                       type: number
 */
router.get(
  "/nearby",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  DriverController.getNearbyDrivers
);

// ================================================================
// ADMIN ROUTES
// ================================================================

/**
 * @swagger
 * /api/drivers/admin/all:
 *   get:
 *     summary: Get all drivers (admin only)
 *     tags: [Driver - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending_verification, verified, suspended, rejected]
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of all drivers
 */
router.get(
  "/admin/all",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  DriverController.getAllDrivers
);

/**
 * @swagger
 * /api/drivers/admin/{id}/verify:
 *   patch:
 *     summary: Verify driver (admin only)
 *     tags: [Driver - Admin]
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
 *               - verified
 *             properties:
 *               verified:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Driver verification status updated
 */
router.patch(
  "/admin/:id/verify",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  DriverController.verifyDriver
);

/**
 * @swagger
 * /api/drivers/admin/{id}/suspend:
 *   patch:
 *     summary: Suspend driver (admin only)
 *     tags: [Driver - Admin]
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
router.patch(
  "/admin/:id/suspend",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  DriverController.suspendDriver
);

/**
 * @swagger
 * /api/drivers/admin/{id}/details:
 *   get:
 *     summary: Get driver admin details (admin only)
 *     tags: [Driver - Admin]
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
 *         description: Detailed driver information for admin
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
 *                     driver:
 *                       $ref: '#/components/schemas/DriverProfile'
 *                     stats:
 *                       type: object
 *                     verificationHistory:
 *                       type: array
 *                     documents:
 *                       type: object
 *                     issues:
 *                       type: array
 */
router.get(
  "/admin/:id/details",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  DriverController.getDriverAdminDetails
);

module.exports = router;
