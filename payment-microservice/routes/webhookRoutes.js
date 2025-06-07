const express = require("express");
const WebhookController = require("../controllers/webhookController");
const router = express.Router();

// Payment gateway webhooks (no auth required for webhooks)
router.post("/payment", WebhookController.handlePaymentWebhook);

module.exports = router;
