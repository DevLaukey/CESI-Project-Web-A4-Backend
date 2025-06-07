const express = require("express");
const OrderController = require("../controllers/orderController");
const auth = require("../middleware/auth");
const router = express.Router();

// Create order
router.post("/", auth, OrderController.createOrder);

// Get order by ID
router.get("/:id", auth, OrderController.getOrder);

// Update order status
router.patch("/:id/status", auth, OrderController.updateOrderStatus);

// Cancel order
router.patch("/:id/cancel", auth, OrderController.cancelOrder);

// Get order history
router.get("/history", auth, OrderController.getOrderHistory);

// Get order statistics
router.get("/stats", auth, OrderController.getOrderStats);

module.exports = router;
