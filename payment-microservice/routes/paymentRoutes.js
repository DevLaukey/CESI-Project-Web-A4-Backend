const express = require("express");
const PaymentController = require("../controllers/paymentController");
const auth = require("../middleware/auth");
const router = express.Router();

// Payment processing
router.post("/", auth, PaymentController.processPayment);
router.get("/:id", auth, PaymentController.getPayment);
router.get("/order/:orderId", auth, PaymentController.getPaymentByOrder);
router.post("/:id/refund", auth, PaymentController.processRefund);

// Payment history and analytics
router.get("/history", auth, PaymentController.getPaymentHistory);
router.get("/stats", auth, PaymentController.getPaymentStats);
router.get("/analytics/revenue", auth, PaymentController.getRevenueAnalytics);

// Payment methods management
router.post("/methods", auth, PaymentController.addPaymentMethod);
router.get("/methods", auth, PaymentController.getPaymentMethods);
router.put(
  "/methods/:id/default",
  auth,
  PaymentController.setDefaultPaymentMethod
);
router.delete("/methods/:id", auth, PaymentController.deletePaymentMethod);

module.exports = router;
