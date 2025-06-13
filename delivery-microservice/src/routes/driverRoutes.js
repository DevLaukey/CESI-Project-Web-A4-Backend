const Driver = require("../models/Driver");
const logger = require("../utils/logger");
const externalServices = require("../services/externalServices");
const {
  validateDriverRegistration,
  validateDriverUpdate,
  validateLocationUpdate,
  validateVehicleInfo,
} = require("../validators/driverValidator");

/**
 * Driver Controller
 * Handles all driver-related operations
 */
class DriverController {
  // ================================================================
  // DRIVER REGISTRATION AND PROFILE
  // ================================================================

  /**
   * Register as driver
   */
  static async registerDriver(req, res) {
    try {
      const { error, value } = validateDriverRegistration(req.body);
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

      // Process uploaded documents
      const documents = {};
      if (req.uploadedDocuments) {
        Object.keys(req.uploadedDocuments).forEach((docType) => {
          documents[docType] = req.uploadedDocuments[docType].map((file) => ({
            filename: file.filename,
            url: file.url,
            uploaded_at: new Date(),
          }));
        });
      }

      // Create driver profile
      const driverData = {
        ...value,
        user_id: req.user.id,
        documents,
        is_verified: false,
        is_available: false,
        status: "pending_verification",
      };

      const driver = await Driver.create(driverData);

      // Send notification to admin for verification
      await externalServices.sendNotification("admin", {
        type: "driver_registration",
        driver_id: driver.id,
        user_id: req.user.id,
      });

      logger.info(`Driver registration: ${driver.id} for user: ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: "Driver registration submitted successfully",
        data: {
          driver_id: driver.id,
          status: driver.status,
          verification_required: true,
        },
      });
    } catch (error) {
      logger.error("Driver registration error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get driver profile
   */
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

  /**
   * Update driver profile
   */
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

      // Process new uploaded documents if any
      const newDocuments = {};
      if (req.uploadedDocuments) {
        Object.keys(req.uploadedDocuments).forEach((docType) => {
          newDocuments[docType] = req.uploadedDocuments[docType].map(
            (file) => ({
              filename: file.filename,
              url: file.url,
              uploaded_at: new Date(),
            })
          );
        });
      }

      const updateData = {
        ...value,
        updated_at: new Date(),
      };

      if (Object.keys(newDocuments).length > 0) {
        updateData.new_documents = newDocuments;
      }

      const updatedDriver = await Driver.update(driver.id, updateData);

      logger.info(`Driver profile updated: ${driver.id}`);

      res.json({
        success: true,
        message: "Driver profile updated successfully",
        data: updatedDriver,
      });
    } catch (error) {
      logger.error("Update driver profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Upload driver documents
   */
  static async uploadDriverDocuments(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      if (
        !req.uploadedDocuments ||
        Object.keys(req.uploadedDocuments).length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "No documents uploaded",
        });
      }

      // Process uploaded documents
      const documents = {};
      Object.keys(req.uploadedDocuments).forEach((docType) => {
        documents[docType] = req.uploadedDocuments[docType].map((file) => ({
          filename: file.filename,
          url: file.url,
          uploaded_at: new Date(),
        }));
      });

      await Driver.addDocuments(driver.id, documents);

      logger.info(`Driver documents uploaded: ${driver.id}`);

      res.json({
        success: true,
        message: "Documents uploaded successfully",
        data: {
          uploaded_documents: Object.keys(documents),
          total_files: Object.values(documents).flat().length,
        },
      });
    } catch (error) {
      logger.error("Upload driver documents error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get driver verification status
   */
  static async getVerificationStatus(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const verificationStatus = await Driver.getVerificationStatus(driver.id);

      res.json({
        success: true,
        data: verificationStatus,
      });
    } catch (error) {
      logger.error("Get verification status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // LOCATION AND AVAILABILITY
  // ================================================================

  /**
   * Update driver location
   */
  static async updateLocation(req, res) {
    try {
      const { latitude, longitude, heading, speed } = req.body;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      await Driver.updateLocation(driver.id, {
        latitude,
        longitude,
        heading,
        speed,
        timestamp: new Date(),
      });

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

  /**
   * Toggle driver availability
   */
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
        return res.status(403).json({
          success: false,
          message: "Driver must be verified to toggle availability",
        });
      }

      await Driver.updateAvailability(driver.id, available);

      logger.info(
        `Driver availability updated: ${driver.id} - ${
          available ? "available" : "unavailable"
        }`
      );

      res.json({
        success: true,
        message: `Driver is now ${available ? "available" : "unavailable"}`,
        data: {
          is_available: available,
        },
      });
    } catch (error) {
      logger.error("Toggle availability error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get nearby drivers (admin/support)
   */
  static async getNearbyDrivers(req, res) {
    try {
      const { latitude, longitude, radius = 10 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      const drivers = await Driver.findNearbyDrivers(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(radius)
      );

      res.json({
        success: true,
        data: {
          drivers,
          count: drivers.length,
          radius: parseFloat(radius),
        },
      });
    } catch (error) {
      logger.error("Get nearby drivers error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Set driver work schedule
   */
  static async setDriverSchedule(req, res) {
    try {
      const { schedule } = req.body;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      await Driver.updateSchedule(driver.id, schedule);

      res.json({
        success: true,
        message: "Work schedule updated successfully",
        data: { schedule },
      });
    } catch (error) {
      logger.error("Set driver schedule error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get driver work schedule
   */
  static async getDriverSchedule(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const schedule = await Driver.getSchedule(driver.id);

      res.json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      logger.error("Get driver schedule error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // DELIVERY MANAGEMENT
  // ================================================================

  /**
   * Get available deliveries for driver
   */
  static async getAvailableDeliveries(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      if (!driver.is_verified || !driver.is_available) {
        return res.status(403).json({
          success: false,
          message: "Driver must be verified and available",
        });
      }

      const availableDeliveries = await Driver.getAvailableDeliveries(
        driver.id
      );

      res.json({
        success: true,
        data: availableDeliveries,
      });
    } catch (error) {
      logger.error("Get available deliveries error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get current delivery
   */
  static async getCurrentDelivery(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const currentDelivery = await Driver.getCurrentDelivery(driver.id);

      res.json({
        success: true,
        data: currentDelivery,
      });
    } catch (error) {
      logger.error("Get current delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get driver deliveries history
   */
  static async getDriverDeliveries(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const deliveries = await Driver.getDeliveryHistory(
        driver.id,
        parseInt(page),
        parseInt(limit),
        status
      );

      res.json({
        success: true,
        data: deliveries,
      });
    } catch (error) {
      logger.error("Get driver deliveries error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get delivery route optimization
   */
  static async getOptimizedRoute(req, res) {
    try {
      const { deliveryId } = req.params;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const route = await Driver.getOptimizedRoute(driver.id, deliveryId);

      res.json({
        success: true,
        data: route,
      });
    } catch (error) {
      logger.error("Get optimized route error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // EARNINGS AND STATISTICS
  // ================================================================

  /**
   * Get driver statistics
   */
  static async getDriverStats(req, res) {
    try {
      const { timeframe = "week" } = req.query;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const stats = await Driver.getDriverStats(driver.id, timeframe);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Get driver stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get driver earnings
   */
  static async getDriverEarnings(req, res) {
    try {
      const { start_date, end_date } = req.query;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const earnings = await Driver.getEarnings(
        driver.id,
        start_date,
        end_date
      );

      res.json({
        success: true,
        data: earnings,
      });
    } catch (error) {
      logger.error("Get driver earnings error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get driver performance metrics
   */
  static async getDriverPerformance(req, res) {
    try {
      const { timeframe = "month" } = req.query;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const performance = await Driver.getPerformanceMetrics(
        driver.id,
        timeframe
      );

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      logger.error("Get driver performance error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get driver ratings and reviews
   */
  static async getDriverRatings(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const ratings = await Driver.getRatings(
        driver.id,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: ratings,
      });
    } catch (error) {
      logger.error("Get driver ratings error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // REFERRAL SYSTEM
  // ================================================================

  /**
   * Get driver referral code
   */
  static async getDriverReferralCode(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const referralCode = await Driver.getReferralCode(driver.id);

      res.json({
        success: true,
        data: referralCode,
      });
    } catch (error) {
      logger.error("Get driver referral code error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get referral statistics
   */
  static async getReferralStats(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const stats = await Driver.getReferralStats(driver.id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Get referral stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Generate new referral code
   */
  static async generateReferralCode(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const newCode = await Driver.generateNewReferralCode(driver.id);

      res.json({
        success: true,
        message: "New referral code generated",
        data: newCode,
      });
    } catch (error) {
      logger.error("Generate referral code error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // VEHICLE MANAGEMENT
  // ================================================================

  /**
   * Update vehicle information
   */
  static async updateVehicleInfo(req, res) {
    try {
      const { error, value } = validateVehicleInfo(req.body);
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

      // Process uploaded vehicle documents
      const documents = {};
      if (req.uploadedDocuments) {
        Object.keys(req.uploadedDocuments).forEach((docType) => {
          documents[docType] = req.uploadedDocuments[docType].map((file) => ({
            filename: file.filename,
            url: file.url,
            uploaded_at: new Date(),
          }));
        });
      }

      const vehicleData = {
        ...value,
        documents,
        updated_at: new Date(),
      };

      await Driver.updateVehicleInfo(driver.id, vehicleData);

      res.json({
        success: true,
        message: "Vehicle information updated successfully",
      });
    } catch (error) {
      logger.error("Update vehicle info error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get vehicle information
   */
  static async getVehicleInfo(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const vehicleInfo = await Driver.getVehicleInfo(driver.id);

      res.json({
        success: true,
        data: vehicleInfo,
      });
    } catch (error) {
      logger.error("Get vehicle info error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Report vehicle issue
   */
  static async reportVehicleIssue(req, res) {
    try {
      const { issue_type, description, severity } = req.body;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const issue = await Driver.reportVehicleIssue(driver.id, {
        issue_type,
        description,
        severity: severity || "medium",
        reported_at: new Date(),
      });

      // Notify support
      await externalServices.sendNotification("support", {
        type: "vehicle_issue_reported",
        driver_id: driver.id,
        issue_id: issue.id,
        severity,
      });

      res.json({
        success: true,
        message: "Vehicle issue reported successfully",
        data: issue,
      });
    } catch (error) {
      logger.error("Report vehicle issue error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // ADMIN ROUTES
  // ================================================================

  /**
   * Get all drivers (admin)
   */
  static async getAllDrivers(req, res) {
    try {
      const { page = 1, limit = 20, status, verified } = req.query;

      const drivers = await Driver.getAllDrivers({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        verified:
          verified === "true" ? true : verified === "false" ? false : undefined,
      });

      res.json({
        success: true,
        data: drivers,
      });
    } catch (error) {
      logger.error("Get all drivers error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Verify driver (admin)
   */
  static async verifyDriver(req, res) {
    try {
      const { id } = req.params;
      const { verified, notes } = req.body;

      const result = await Driver.updateVerificationStatus(id, verified, {
        verified_by: req.user.id,
        verification_notes: notes,
        verified_at: new Date(),
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        });
      }

      // Notify driver
      const driver = await Driver.findById(id);
      if (driver) {
        await externalServices.sendNotification(driver.user_id, {
          type: "verification_status_update",
          verified,
          notes,
        });
      }

      logger.info(
        `Driver verification updated: ${id} - ${
          verified ? "verified" : "rejected"
        }`
      );

      res.json({
        success: true,
        message: `Driver ${verified ? "verified" : "rejected"} successfully`,
      });
    } catch (error) {
      logger.error("Verify driver error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Suspend driver (admin)
   */
  static async suspendDriver(req, res) {
    try {
      const { id } = req.params;
      const { reason, duration } = req.body;

      const result = await Driver.suspendDriver(id, {
        reason,
        duration,
        suspended_by: req.user.id,
        suspended_at: new Date(),
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        });
      }

      // Notify driver
      const driver = await Driver.findById(id);
      if (driver) {
        await externalServices.sendNotification(driver.user_id, {
          type: "account_suspended",
          reason,
          duration,
        });
      }

      logger.info(`Driver suspended: ${id} - ${reason}`);

      res.json({
        success: true,
        message: "Driver suspended successfully",
      });
    } catch (error) {
      logger.error("Suspend driver error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get driver admin details
   */
  static async getDriverAdminDetails(req, res) {
    try {
      const { id } = req.params;

      const driver = await Driver.getAdminDetails(id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        });
      }

      res.json({
        success: true,
        data: driver,
      });
    } catch (error) {
      logger.error("Get driver admin details error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = DriverController;
