
const express = require('express');
const WebhookController = require('../controllers/WebhookController');

const router = express.Router();

// Twilio status webhooks
router.post('/twilio', WebhookController.handleTwilioWebhook);

// Delivery status webhooks
router.post('/delivery', WebhookController.handleDeliveryStatusWebhook);

module.exports = router;