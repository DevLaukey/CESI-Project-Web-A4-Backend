routes / simulatorRoutes.js;
const express = require("express");
const paymentGateway = require("../services/paymentGateway");
const router = express.Router();

// Gateway simulator endpoints (for testing and monitoring)
router.get("/status", (req, res) => {
  const status = paymentGateway.getStatus();
  res.json({
    success: true,
    data: status,
  });
});

// Simulate webhook sending (for testing)
router.post("/webhook-test", async (req, res) => {
  const { payment_id, event_type } = req.body;

  // This would typically be called by the gateway
  const webhookPayload = {
    event_type: event_type || "payment.completed",
    payment_id: payment_id,
    transaction_id: paymentGateway.generateTransactionId(),
    timestamp: new Date().toISOString(),
  };

  res.json({
    success: true,
    message: "Webhook simulation prepared",
    payload: webhookPayload,
  });
});

module.exports = router;