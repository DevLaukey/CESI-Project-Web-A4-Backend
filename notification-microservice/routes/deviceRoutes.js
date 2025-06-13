const express = require("express");
const DeviceController = require("../controllers/deviceController");
const auth = require("../middleware/auth");
const rateLimitMiddleware = require("../middleware/rateLimit");
const router = express.Router();

// Register new device for push notifications
router.post(
  "/register",
  auth,
  rateLimitMiddleware.deviceRate,
  DeviceController.registerDevice
);

// Get user's registered devices
router.get(
  "/",
  auth,
  rateLimitMiddleware.userRate,
  DeviceController.getUserDevices
);

// Update device information
router.put(
  "/:id",
  auth,
  rateLimitMiddleware.deviceRate,
  DeviceController.updateDevice
);

// Deactivate/remove device
router.delete(
  "/:id",
  auth,
  rateLimitMiddleware.deviceRate,
  DeviceController.deactivateDevice
);

// Test push notification to specific device
router.post(
  "/:id/test",
  auth,
  rateLimitMiddleware.testRate,
  DeviceController.testPushNotification
);

// Update device last seen (for tracking active devices)
router.post(
  "/:id/heartbeat",
  auth,
  rateLimitMiddleware.heartbeatRate,
  DeviceController.updateDeviceHeartbeat
);

// Get device statistics (for the device owner)
router.get(
  "/:id/stats",
  auth,
  rateLimitMiddleware.userRate,
  DeviceController.getDeviceStats
);

module.exports = router;