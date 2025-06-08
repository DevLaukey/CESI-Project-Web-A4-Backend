const express = require("express");
const WebhookController = require("../controllers/webhookController");
const webhookAuth = require("../middleware/webhookAuth");
const rateLimitMiddleware = require("../middleware/rateLimit");
const router = express.Router();

// Firebase Cloud Messaging delivery receipts
router.post(
  "/fcm/delivery",
  webhookAuth.fcm,
  rateLimitMiddleware.webhookRate,
  WebhookController.handleFCMDeliveryReceipt
);

// Twilio SMS delivery status
router.post(
  "/twilio/status",
  webhookAuth.twilio,
  rateLimitMiddleware.webhookRate,
  WebhookController.handleTwilioStatus
);

// Web push subscription changes
router.post(
  "/webpush/subscription",
  webhookAuth.webpush,
  rateLimitMiddleware.webhookRate,
  WebhookController.handleWebPushSubscription
);

// Generic webhook for third-party integrations
router.post(
  "/generic/:provider",
  webhookAuth.generic,
  rateLimitMiddleware.webhookRate,
  WebhookController.handleGenericWebhook
);

module.exports = router;
