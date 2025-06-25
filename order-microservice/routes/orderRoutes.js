// routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const authenticateJWT = require("../middleware/authenticateJWT");

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management endpoints
 */

/**
 * @swagger
 * /orders/ping-db:
 *   get:
 *     summary: Ping the database
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Database is responsive
 */
router.get("/ping-db", async (req, res) => {
  try {
    const [results] = await require("../config/db").query(
      "SELECT 1 + 1 AS result"
    );
    res.json({ success: true, result: results[0].result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order (payment_id optional initially)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurant_id
 *               - delivery_address
 *               - items
 *             properties:
 *               restaurant_id:
 *                 type: string
 *               payment_id:
 *                 type: string
 *                 description: Optional initially; omit or null when creating before payment
 *               delivery_address:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     item_id:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                     price:
 *                       type: number
 *     responses:
 *       201:
 *         description: Order created
 *       409:
 *         description: Conflict (payment_id already used)
 */
router.post("/", authenticateJWT, orderController.createOrder);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders (no auth)
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: List of all orders
 */
router.get("/", orderController.getOrders);

/**
 * @swagger
 * /orders/my-orders:
 *   get:
 *     summary: Get my orders (user's own)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders for the logged-in user
 */
router.get("/my-orders", authenticateJWT, orderController.getMyOrders);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order found
 */
router.get("/:id", orderController.getOrderById);

/**
 * @swagger
 * /orders/restaurant/{restaurantId}:
 *   get:
 *     summary: Get orders for a restaurant
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Orders found
 */
router.get(
  "/restaurant/:restaurantId",
  orderController.getOrdersByRestaurantId
);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Update status of an order (e.g., preparing, out_for_delivery, etc.)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: confirmed
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Order not found
 */
router.patch("/:id/status", authenticateJWT, orderController.updateOrderStatus);

/**
 * @swagger
 * /orders/{id}/payment:
 *   patch:
 *     summary: Update an order’s payment_id and status once payment completes
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Order ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payment_id
 *               - status
 *             properties:
 *               payment_id:
 *                 type: string
 *                 description: The real payment identifier once paid
 *               status:
 *                 type: string
 *                 enum: [confirmed, cancelled]
 *                 description: New status after payment
 *     responses:
 *       200:
 *         description: Payment_id and status updated
 *       400:
 *         description: Missing or invalid fields
 *       404:
 *         description: Order not found
 *       409:
 *         description: Conflict (payment_id already used or order already processed)
 */
router.patch("/:id/payment", authenticateJWT, orderController.updatePayment);

module.exports = router;
