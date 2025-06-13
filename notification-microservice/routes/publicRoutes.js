const express = require("express");
const PublicController = require("../controllers/publicController");
const rateLimitMiddleware = require("../middleware/rateLimit");
const router = express.Router();

// Health check endpoint
router.get(
  "/health",
  rateLimitMiddleware.publicRate,
  PublicController.healthCheck
);

// Service status endpoint
router.get(
  "/status",
  rateLimitMiddleware.publicRate,
  PublicController.getServiceStatus
);

// Get service capabilities
router.get(
  "/capabilities",
  rateLimitMiddleware.publicRate,
  PublicController.getServiceCapabilities
);

// WebSocket connection info
router.get(
  "/websocket/info",
  rateLimitMiddleware.publicRate,
  PublicController.getWebSocketInfo
);

// VAPID public key for web push
router.get(
  "/webpush/public-key",
  rateLimitMiddleware.publicRate,
  PublicController.getWebPushPublicKey
);

module.exports = router;
