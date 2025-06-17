const express = require("express");
const DeliveryController = require("../controllers/deliveryController");
const auth = require("../middleware/authMiddleware");
const serviceAuth = require("../middleware/serviceAuth");
const adminAuth = require("../middleware/adminAuth");
const rateLimitMiddleware = require("../middleware/rateLimit");
const validateLocation = require("../middleware/validateLocation");
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Delivery - Service
 *     description: Service-to-service delivery operations (internal API)
 *   - name: Delivery - Public
 *     description: Public delivery tracking and information
 *   - name: Delivery - User
 *     description: User delivery operations (customer/restaurant access)
 *   - name: Delivery - Driver
 *     description: Driver-specific delivery operations
 *   - name: Delivery - QR Code
 *     description: QR code validation and generation
 *   - name: Delivery - Feedback
 *     description: Rating and feedback system
 *   - name: Delivery - Analytics
 *     description: Statistics and performance metrics
 *   - name: Delivery - Emergency
 *     description: Emergency and support operations
 */

// ================================================================
// SERVICE-TO-SERVICE ROUTES (Internal API calls)
// ================================================================

/**
 * @swagger
 * /api/deliveries:
 *   post:
 *     summary: Create delivery request (service-to-service)
 *     tags: [Delivery - Service]
 *     security:
 *       - serviceAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - customerId
 *               - restaurantId
 *               - pickupAddress
 *               - deliveryAddress
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Order ID from the order service
 *                 example: "order_12345"
 *               customerId:
 *                 type: string
 *                 description: Customer ID
 *                 example: "customer_67890"
 *               restaurantId:
 *                 type: string
 *                 description: Restaurant ID
 *                 example: "restaurant_54321"
 *               pickupAddress:
 *                 type: object
 *                 required:
 *                   - street
 *                   - city
 *                   - latitude
 *                   - longitude
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "123 Restaurant St"
 *                   city:
 *                     type: string
 *                     example: "New York"
 *                   state:
 *                     type: string
 *                     example: "NY"
 *                   zipCode:
 *                     type: string
 *                     example: "10001"
 *                   latitude:
 *                     type: number
 *                     example: 40.7128
 *                   longitude:
 *                     type: number
 *                     example: -74.0060
 *               deliveryAddress:
 *                 type: object
 *                 required:
 *                   - street
 *                   - city
 *                   - latitude
 *                   - longitude
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "456 Customer Ave"
 *                   city:
 *                     type: string
 *                     example: "New York"
 *                   state:
 *                     type: string
 *                     example: "NY"
 *                   zipCode:
 *                     type: string
 *                     example: "10002"
 *                   latitude:
 *                     type: number
 *                     example: 40.7580
 *                   longitude:
 *                     type: number
 *                     example: -73.9855
 *                   instructions:
 *                     type: string
 *                     example: "Ring doorbell, leave at door"
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *                 default: normal
 *               estimatedValue:
 *                 type: number
 *                 description: Estimated order value for insurance
 *                 example: 25.99
 *               specialInstructions:
 *                 type: string
 *                 example: "Handle with care - fragile items"
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *                 description: Scheduled delivery time (optional)
 *     responses:
 *       201:
 *         description: Delivery created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Delivery'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized service
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  serviceAuth,
  rateLimitMiddleware.serviceRate,
  DeliveryController.createDelivery
);

/**
 * @swagger
 * /api/deliveries/{id}/assign:
 *   post:
 *     summary: Assign delivery to driver (service-to-service)
 *     tags: [Delivery - Service]
 *     security:
 *       - serviceAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Delivery ID
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
 *                 description: Driver ID to assign
 *               assignmentType:
 *                 type: string
 *                 enum: [automatic, manual, priority]
 *                 default: automatic
 *               estimatedPickupTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Delivery assigned successfully
 *       404:
 *         description: Delivery or driver not found
 *       409:
 *         description: Delivery already assigned or driver unavailable
 */
router.post(
  "/:id/assign",
  serviceAuth,
  rateLimitMiddleware.serviceRate,
  DeliveryController.assignDeliveryInternal
);

/**
 * @swagger
 * /api/deliveries/{id}/status-update:
 *   patch:
 *     summary: Update delivery status (service-to-service)
 *     tags: [Delivery - Service]
 *     security:
 *       - serviceAuth: []
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, assigned, picked_up, in_transit, delivered, cancelled]
 *               reason:
 *                 type: string
 *               updatedBy:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch(
  "/:id/status-update",
  serviceAuth,
  rateLimitMiddleware.serviceRate,
  DeliveryController.updateDeliveryStatusInternal
);

// ================================================================
// PUBLIC ROUTES (No authentication required)
// ================================================================

/**
 * @swagger
 * /api/deliveries/track/{trackingNumber}:
 *   get:
 *     summary: Track delivery by tracking number (public)
 *     tags: [Delivery - Public]
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique tracking number
 *         example: "TRK123456789"
 *     responses:
 *       200:
 *         description: Delivery tracking information
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
 *                     trackingNumber:
 *                       type: string
 *                     status:
 *                       type: string
 *                     estimatedDeliveryTime:
 *                       type: string
 *                       format: date-time
 *                     currentLocation:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                         address:
 *                           type: string
 *                     timeline:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Tracking number not found
 */
router.get(
  "/track/:trackingNumber",
  rateLimitMiddleware.publicRate,
  DeliveryController.trackDelivery
);

/**
 * @swagger
 * /api/deliveries/eta/{trackingNumber}:
 *   get:
 *     summary: Get delivery ETA (public)
 *     tags: [Delivery - Public]
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estimated delivery time
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
 *                     estimatedDeliveryTime:
 *                       type: string
 *                       format: date-time
 *                     confidence:
 *                       type: string
 *                       enum: [high, medium, low]
 *                     remainingMinutes:
 *                       type: integer
 */
router.get(
  "/eta/:trackingNumber",
  rateLimitMiddleware.publicRate,
  DeliveryController.getDeliveryETA
);

// ================================================================
// USER ROUTES (Customer/Restaurant/Driver access)
// ================================================================

/**
 * @swagger
 * /api/deliveries/{id}:
 *   get:
 *     summary: Get delivery details
 *     tags: [Delivery - User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Delivery ID
 *     responses:
 *       200:
 *         description: Delivery details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Delivery'
 *       404:
 *         description: Delivery not found or access denied
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:id",
  auth,
  rateLimitMiddleware.userRate,
  DeliveryController.getDelivery
);

/**
 * @swagger
 * /api/deliveries/{id}/status:
 *   patch:
 *     summary: Update delivery status (driver/restaurant actions)
 *     tags: [Delivery - User]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [picked_up, in_transit, delivered, cancelled]
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               notes:
 *                 type: string
 *               proof:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [photo, signature, qr_code]
 *                   data:
 *                     type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch(
  "/:id/status",
  auth,
  rateLimitMiddleware.deliveryRate,
  DeliveryController.updateDeliveryStatus
);

/**
 * @swagger
 * /api/deliveries/history/user:
 *   get:
 *     summary: Get delivery history for authenticated user
 *     tags: [Delivery - User]
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
 *           enum: [completed, cancelled, in_progress]
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
 *     responses:
 *       200:
 *         description: User delivery history
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
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
router.get(
  "/history/user",
  auth,
  rateLimitMiddleware.userRate,
  DeliveryController.getUserDeliveryHistory
);

// ================================================================
// DRIVER SPECIFIC ROUTES
// ================================================================

/**
 * @swagger
 * /api/deliveries/{id}/accept:
 *   post:
 *     summary: Accept delivery (driver)
 *     tags: [Delivery - Driver]
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
 *               estimatedPickupTime:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Delivery accepted successfully
 *       404:
 *         description: Delivery not found or not available
 *       409:
 *         description: Delivery already accepted or driver unavailable
 */
router.post(
  "/:id/accept",
  auth,
  rateLimitMiddleware.driverRate,
  DeliveryController.acceptDelivery
);

/**
 * @swagger
 * /api/deliveries/{id}/decline:
 *   post:
 *     summary: Decline delivery (driver)
 *     tags: [Delivery - Driver]
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
 *               reason:
 *                 type: string
 *                 enum: [too_far, unavailable, vehicle_issue, other]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Delivery declined successfully
 */
router.post(
  "/:id/decline",
  auth,
  rateLimitMiddleware.driverRate,
  DeliveryController.declineDelivery
);

/**
 * @swagger
 * /api/deliveries/{id}/pickup:
 *   post:
 *     summary: Mark delivery as picked up (driver)
 *     tags: [Delivery - Driver]
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
 *               - location
 *             properties:
 *               location:
 *                 type: object
 *                 required:
 *                   - latitude
 *                   - longitude
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               qrCode:
 *                 type: string
 *                 description: QR code from restaurant
 *               notes:
 *                 type: string
 *               photo:
 *                 type: string
 *                 description: Base64 encoded photo
 *     responses:
 *       200:
 *         description: Pickup confirmed successfully
 *       400:
 *         description: Invalid location or missing QR code
 */
router.post(
  "/:id/pickup",
  auth,
  rateLimitMiddleware.driverRate,
  validateLocation,
  DeliveryController.pickupDelivery
);

/**
 * @swagger
 * /api/deliveries/{id}/complete:
 *   post:
 *     summary: Complete delivery (driver delivers to customer)
 *     tags: [Delivery - Driver]
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
 *               - location
 *             properties:
 *               location:
 *                 type: object
 *                 required:
 *                   - latitude
 *                   - longitude
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               proof:
 *                 type: object
 *                 required:
 *                   - type
 *                   - data
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [photo, signature, qr_code, pin]
 *                   data:
 *                     type: string
 *                     description: Base64 encoded proof or PIN
 *               notes:
 *                 type: string
 *               customerPresent:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Delivery completed successfully
 *       400:
 *         description: Invalid location or proof
 */
router.post(
  "/:id/complete",
  auth,
  rateLimitMiddleware.driverRate,
  validateLocation,
  DeliveryController.completeDelivery
);

/**
 * @swagger
 * /api/deliveries/{id}/location:
 *   post:
 *     summary: Update driver location during delivery
 *     tags: [Delivery - Driver]
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
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               heading:
 *                 type: number
 *                 description: Direction in degrees
 *               speed:
 *                 type: number
 *                 description: Speed in km/h
 *               accuracy:
 *                 type: number
 *                 description: GPS accuracy in meters
 *     responses:
 *       200:
 *         description: Location updated successfully
 */
router.post(
  "/:id/location",
  auth,
  rateLimitMiddleware.locationRate,
  validateLocation,
  DeliveryController.updateDeliveryLocation
);

/**
 * @swagger
 * /api/deliveries/{id}/issue:
 *   post:
 *     summary: Report delivery issue
 *     tags: [Delivery - Driver]
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
 *               - issueType
 *               - description
 *             properties:
 *               issueType:
 *                 type: string
 *                 enum: [customer_unavailable, wrong_address, vehicle_breakdown, weather, accident, restaurant_delay, other]
 *               description:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               contactedCustomer:
 *                 type: boolean
 *                 default: false
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: Base64 encoded photos
 *     responses:
 *       200:
 *         description: Issue reported successfully
 */
router.post(
  "/:id/issue",
  auth,
  rateLimitMiddleware.userRate,
  DeliveryController.reportDeliveryIssue
);

// Continue with remaining routes...

/**
 * @swagger
 * tags:
 *   name: Deliveries
 *   description: Delivery management endpoints
 */

/**
 * @swagger
 * /api/deliveries:
 *   get:
 *     summary: Get all deliveries
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, picked_up, in_transit, delivered, cancelled]
 *         description: Filter deliveries by status
 *       - in: query
 *         name: driverId
 *         schema:
 *           type: string
 *         description: Filter deliveries by driver ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of deliveries per page
 *     responses:
 *       200:
 *         description: List of deliveries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deliveries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Delivery'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/" /* your middleware here, */ /* deliveryController.getAllDeliveries */
);

/**
 * @swagger
 * /api/deliveries:
 *   post:
 *     summary: Create a new delivery
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickupAddress
 *               - deliveryAddress
 *               - customerId
 *             properties:
 *               pickupAddress:
 *                 type: string
 *                 description: Pickup location address
 *                 example: "123 Main St, City, State 12345"
 *               deliveryAddress:
 *                 type: string
 *                 description: Delivery destination address
 *                 example: "456 Oak Ave, City, State 67890"
 *               customerId:
 *                 type: string
 *                 description: Customer ID requesting the delivery
 *                 example: "customer_123"
 *               instructions:
 *                 type: string
 *                 description: Special delivery instructions
 *                 example: "Leave at front door"
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *                 default: normal
 *                 description: Delivery priority level
 *     responses:
 *       201:
 *         description: Delivery created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Delivery'
 *       400:
 *         description: Bad request - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/" /* your middleware here, */ /* deliveryController.createDelivery */
);

/**
 * @swagger
 * /api/deliveries/{id}:
 *   get:
 *     summary: Get delivery by ID
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Delivery ID
 *     responses:
 *       200:
 *         description: Delivery details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Delivery'
 *       404:
 *         description: Delivery not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id" /* your middleware here, */ /* deliveryController.getDeliveryById */
);

/**
 * @swagger
 * /api/deliveries/{id}/status:
 *   patch:
 *     summary: Update delivery status
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Delivery ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, assigned, picked_up, in_transit, delivered, cancelled]
 *                 description: New delivery status
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                 description: Current location (required for certain status updates)
 *               notes:
 *                 type: string
 *                 description: Additional notes about the status update
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Delivery'
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Delivery not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/:id/status" /* your middleware here, */ /* deliveryController.updateDeliveryStatus */
);

/**
 * @swagger
 * /api/deliveries/{id}/assign:
 *   patch:
 *     summary: Assign delivery to a driver
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Delivery ID
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
 *                 description: Driver ID to assign the delivery to
 *                 example: "driver_456"
 *     responses:
 *       200:
 *         description: Delivery assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Delivery'
 *       400:
 *         description: Invalid assignment (driver not available, etc.)
 *       404:
 *         description: Delivery or driver not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/:id/assign" /* your middleware here, */ /* deliveryController.assignDelivery */
);

module.exports = router;
