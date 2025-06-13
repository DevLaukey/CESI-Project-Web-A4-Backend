const Device = require("../models/Device");
const logger = require("../utils/logger");
const { validateDevice } = require("../validators/notificationValidator");

class DeviceController {
  // Register device for push notifications
  static async registerDevice(req, res) {
    try {
      const { error, value } = validateDevice(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const deviceData = {
        ...value,
        user_id: req.user.id,
      };

      const device = await Device.create(deviceData);

      logger.info(
        `Device registered: ${device.id} for user: ${req.user.id} (${device.device_type})`
      );

      res.status(201).json({
        success: true,
        message: "Device registered successfully",
        data: {
          id: device.id,
          device_type: device.device_type,
          device_name: device.device_name,
          is_active: device.is_active,
          created_at: device.created_at,
        },
      });
    } catch (error) {
      logger.error("Register device error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get user devices
  static async getUserDevices(req, res) {
    try {
      const { active_only = true } = req.query;
      const devices = await Device.findByUser(
        req.user.id,
        active_only === "true"
      );

      // Remove sensitive data (device tokens)
      const sanitizedDevices = devices.map((device) => ({
        id: device.id,
        device_type: device.device_type,
        device_name: device.device_name,
        app_version: device.app_version,
        os_version: device.os_version,
        is_active: device.is_active,
        last_seen: device.last_seen,
        created_at: device.created_at,
      }));

      res.json({
        success: true,
        data: sanitizedDevices,
      });
    } catch (error) {
      logger.error("Get user devices error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update device
  static async updateDevice(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = validateDevice(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const device = await Device.findById(id);
      if (!device || device.user_id !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: "Device not found",
        });
      }

      const updatedDevice = await Device.update(id, value);

      res.json({
        success: true,
        message: "Device updated successfully",
        data: {
          id: updatedDevice.id,
          device_type: updatedDevice.device_type,
          device_name: updatedDevice.device_name,
          is_active: updatedDevice.is_active,
          updated_at: updatedDevice.updated_at,
        },
      });
    } catch (error) {
      logger.error("Update device error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Deactivate device
  static async deactivateDevice(req, res) {
    try {
      const { id } = req.params;

      const device = await Device.findById(id);
      if (!device || device.user_id !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: "Device not found",
        });
      }

      await Device.deactivate(id);

      logger.info(`Device deactivated: ${id} for user: ${req.user.id}`);

      res.json({
        success: true,
        message: "Device deactivated successfully",
      });
    } catch (error) {
      logger.error("Deactivate device error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Test push notification to device
  static async testPushNotification(req, res) {
    try {
      const { id } = req.params;
      const {
        title = "Test Notification",
        message = "This is a test notification",
      } = req.body;

      const device = await Device.findById(id);
      if (!device || device.user_id !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: "Device not found",
        });
      }

      if (!device.is_active) {
        return res.status(400).json({
          success: false,
          message: "Device is not active",
        });
      }

      const pushService = require("../services/pushService");
      const result = await pushService.sendToDevice(
        device.device_token,
        {
          title,
          message,
          data: { test: true },
          priority: "normal",
        },
        device.device_type
      );

      res.json({
        success: true,
        message: "Test notification sent",
        data: result,
      });
    } catch (error) {
      logger.error("Test push notification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send test notification",
      });
    }
  }
}

module.exports = DeviceController;
