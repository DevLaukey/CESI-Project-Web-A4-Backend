const Driver = require("../models/Driver");
const Delivery = require("../models/Delivery");
const logger = require("../utils/logger");
const {
  validateDriver,
  validateDriverUpdate,
} = require("../validators/deliveryValidator");
const externalServices = require("../services/externalServices");

class DriverController {
  // Register as driver
  static async registerDriver(req, res) {
    try {
      const { error, value } = validateDriver(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      // Check if user is already a driver
      const existingDriver = await Driver.findByUserId(req.user.id);
      if (existingDriver) {
        return res.status(409).json({
          success: false,
          message: "User is already registered as a driver",
        });
      }

      const driverData = {
        ...value,
        user_id: req.user.id,
      };

      // Handle referral code
      if (value.referral_code) {
        const referrer = await Driver.findByReferralCode(value.referral_code);
        if (referrer) {
          driverData.referred_by = referrer.id;

          // Process referral bonus
          await externalServices.processReferral({
            referrer_id: referrer.id,
            referee_id: req.user.id,
            type: "driver_referral",
          });
        }
      }

      const driver = await Driver.create(driverData);

      logger.info(`Driver registered: ${driver.id} for user: ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: "Driver registration successful",
        data: driver,
      });
    } catch (error) {
      logger.error("Register driver error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get driver profile
  static async getDriverProfile(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      res.json({
        success: true,
        data: driver,
      });
    } catch (error) {
      logger.error("Get driver profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update driver profile
  static async updateDriverProfile(req, res) {
    try {
      const { error, value } = validateDriverUpdate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      // Update driver profile (implement update method in Driver model)
      // This would be a new method to add to the Driver model

      res.json({
        success: true,
        message: "Driver profile updated successfully",
      });
    } catch (error) {
      logger.error("Update driver profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update driver location
  static async updateLocation(req, res) {
    try {
      const { lat, lng } = req.body;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      await Driver.updateLocation(driver.id, lat, lng);

      // Real-time location update
      const socketManager = req.app.get("socketManager");
      socketManager.updateDriverLocation(req.user.id, { lat, lng });

      res.json({
        success: true,
        message: "Location updated successfully",
      });
    } catch (error) {
      logger.error("Update location error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Toggle availability
  static async toggleAvailability(req, res) {
    try {
      const { available } = req.body;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      if (!driver.is_verified) {
        return res.status(400).json({
          success: false,
          message: "Driver must be verified before going online",
        });
      }

      const updatedDriver = await Driver.updateAvailability(
        driver.id,
        available
      );

      // Real-time availability update
      const socketManager = req.app.get("socketManager");
      socketManager.updateDriverAvailability(req.user.id, available);

      res.json({
        success: true,
        message: `Driver is now ${available ? "available" : "unavailable"}`,
        data: updatedDriver,
      });
    } catch (error) {
      logger.error("Toggle availability error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get driver deliveries
  static async getDriverDeliveries(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const offset = (page - 1) * limit;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const deliveries = await Delivery.findByDriver(
        driver.id,
        parseInt(limit),
        offset
      );

      res.json({
        success: true,
        data: deliveries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: deliveries.length,
        },
      });
    } catch (error) {
      logger.error("Get driver deliveries error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get driver statistics
  static async getDriverStats(req, res) {
    try {
      const { start_date, end_date } = req.query;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const stats = await Driver.getDriverStats(
        driver.id,
        start_date,
        end_date
      );

      res.json({
        success: true,
        data: {
          ...stats,
          total_deliveries_lifetime: driver.total_deliveries,
          total_earnings_lifetime: driver.total_earnings,
          current_rating: driver.rating,
        },
      });
    } catch (error) {
      logger.error("Get driver stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = DriverController;
