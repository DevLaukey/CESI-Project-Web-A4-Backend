const Delivery = require("../models/Delivery");
const Driver = require("../models/Driver");
const Tracking = require("../models/Tracking");
const Admin = require("../models/Admin");
const logger = require("../utils/logger");
const externalServices = require("../services/externalServices");
const {
  validateAdminDeliveryUpdate,
  validateBulkOperation,
  validateSystemConfig,
  validateNotificationBroadcast,
} = require("../validators/adminValidator");

/**
 * Admin Controller
 * Handles all administrative operations for the delivery platform
 */
class AdminController {
  // ================================================================
  // DELIVERY MANAGEMENT (ADMIN)
  // ================================================================

  /**
   * Get all deliveries with advanced filtering
   */
  static async getAllDeliveries(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        driver_id,
        restaurant_id,
        customer_id,
        start_date,
        end_date,
        search,
        sort_by = "created_at",
        sort_order = "desc",
      } = req.query;

      const filters = {
        status: status ? status.split(",") : null,
        driver_id,
        restaurant_id,
        customer_id,
        start_date,
        end_date,
        search,
        page: parseInt(page),
        limit: parseInt(limit),
        sort_by,
        sort_order,
      };

      const deliveries = await Admin.getAllDeliveries(filters);
      const stats = await Admin.getDeliveryStats(filters);

      res.json({
        success: true,
        data: {
          deliveries: deliveries.data,
          pagination: deliveries.pagination,
          stats,
        },
      });
    } catch (error) {
      logger.error("Get all deliveries error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get delivery details with full information
   */
  static async getDeliveryDetails(req, res) {
    try {
      const { id } = req.params;

      const delivery = await Admin.getDeliveryDetails(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Get tracking history
      const trackingHistory = await Tracking.getLocationHistory(id);

      // Get related data
      const [customer, restaurant, driver] = await Promise.all([
        externalServices.getUser(delivery.customer_id),
        externalServices.getRestaurant(delivery.restaurant_id),
        delivery.driver_id ? Driver.findById(delivery.driver_id) : null,
      ]);

      res.json({
        success: true,
        data: {
          delivery,
          tracking_history: trackingHistory,
          customer,
          restaurant,
          driver,
        },
      });
    } catch (error) {
      logger.error("Get delivery details error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Update delivery status (admin override)
   */
  static async updateDeliveryStatus(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = validateAdminDeliveryUpdate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Update delivery with admin override
      const updatedDelivery = await Admin.updateDeliveryStatus(
        id,
        value.status,
        {
          admin_notes: value.admin_notes,
          override_reason: value.override_reason,
          updated_by: req.user.id,
        }
      );

      // Log admin action
      await Admin.logAdminAction({
        action: "delivery_status_update",
        admin_id: req.user.id,
        target_id: id,
        target_type: "delivery",
        details: value,
      });

      // Send notifications
      await this.sendAdminUpdateNotifications(delivery, value);

      logger.info(`Admin delivery status update: ${id} to ${value.status}`, {
        admin_id: req.user.id,
      });

      res.json({
        success: true,
        message: "Delivery status updated successfully",
        data: updatedDelivery,
      });
    } catch (error) {
      logger.error("Admin update delivery status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Cancel delivery (admin)
   */
  static async cancelDelivery(req, res) {
    try {
      const { id } = req.params;
      const { reason, refund_amount, notify_parties = true } = req.body;

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      if (delivery.status === "delivered") {
        return res.status(400).json({
          success: false,
          message: "Cannot cancel delivered delivery",
        });
      }

      // Cancel delivery
      const cancelledDelivery = await Admin.cancelDelivery(id, {
        reason,
        cancelled_by: req.user.id,
        cancelled_at: new Date(),
      });

      // Process refund if specified
      if (refund_amount && refund_amount > 0) {
        await externalServices.refundDeliveryFee(delivery.order_id, {
          amount: refund_amount,
          reason: `Admin cancellation: ${reason}`,
        });
      }

      // Make driver available again
      if (delivery.driver_id) {
        await Driver.updateAvailability(delivery.driver_id, true);
      }

      // Send notifications
      if (notify_parties) {
        await this.sendCancellationNotifications(delivery, reason);
      }

      // Log admin action
      await Admin.logAdminAction({
        action: "delivery_cancelled",
        admin_id: req.user.id,
        target_id: id,
        target_type: "delivery",
        details: { reason, refund_amount },
      });

      logger.info(`Admin cancelled delivery: ${id}`, {
        admin_id: req.user.id,
        reason,
      });

      res.json({
        success: true,
        message: "Delivery cancelled successfully",
        data: cancelledDelivery,
      });
    } catch (error) {
      logger.error("Admin cancel delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Reassign delivery to different driver
   */
  static async reassignDelivery(req, res) {
    try {
      const { id } = req.params;
      const { new_driver_id, reason } = req.body;

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Validate new driver
      const newDriver = await Driver.findById(new_driver_id);
      if (!newDriver || !newDriver.is_verified || !newDriver.is_available) {
        return res.status(400).json({
          success: false,
          message: "New driver is not available",
        });
      }

      const oldDriverId = delivery.driver_id;

      // Reassign delivery
      const reassignedDelivery = await Admin.reassignDelivery(id, {
        new_driver_id,
        old_driver_id: oldDriverId,
        reason,
        reassigned_by: req.user.id,
        reassigned_at: new Date(),
      });

      // Update driver availability
      if (oldDriverId) {
        await Driver.updateAvailability(oldDriverId, true);
      }
      await Driver.updateAvailability(new_driver_id, false);

      // Send notifications
      await this.sendReassignmentNotifications(delivery, newDriver, reason);

      // Log admin action
      await Admin.logAdminAction({
        action: "delivery_reassigned",
        admin_id: req.user.id,
        target_id: id,
        target_type: "delivery",
        details: { old_driver_id: oldDriverId, new_driver_id, reason },
      });

      logger.info(`Admin reassigned delivery: ${id}`, {
        admin_id: req.user.id,
        old_driver_id: oldDriverId,
        new_driver_id,
      });

      res.json({
        success: true,
        message: "Delivery reassigned successfully",
        data: reassignedDelivery,
      });
    } catch (error) {
      logger.error("Admin reassign delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Force complete delivery (emergency)
   */
  static async forceCompleteDelivery(req, res) {
    try {
      const { id } = req.params;
      const { reason, admin_notes } = req.body;

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      if (delivery.status === "delivered") {
        return res.status(400).json({
          success: false,
          message: "Delivery already completed",
        });
      }

      // Force complete delivery
      const completedDelivery = await Admin.forceCompleteDelivery(id, {
        reason,
        admin_notes,
        force_completed_by: req.user.id,
        force_completed_at: new Date(),
      });

      // Update driver availability
      if (delivery.driver_id) {
        await Driver.updateAvailability(delivery.driver_id, true);
        await Driver.incrementDeliveries(
          delivery.driver_id,
          delivery.delivery_fee
        );
      }

      // Send notifications
      await this.sendForceCompleteNotifications(delivery, reason);

      // Log admin action
      await Admin.logAdminAction({
        action: "delivery_force_completed",
        admin_id: req.user.id,
        target_id: id,
        target_type: "delivery",
        details: { reason, admin_notes },
      });

      logger.warn(`Admin force completed delivery: ${id}`, {
        admin_id: req.user.id,
        reason,
      });

      res.json({
        success: true,
        message: "Delivery force completed successfully",
        data: completedDelivery,
      });
    } catch (error) {
      logger.error("Admin force complete delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get delivery timeline and logs
   */
  static async getDeliveryTimeline(req, res) {
    try {
      const { id } = req.params;

      const timeline = await Admin.getDeliveryTimeline(id);
      if (!timeline) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      res.json({
        success: true,
        data: timeline,
      });
    } catch (error) {
      logger.error("Get delivery timeline error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Bulk delivery operations
   */
  static async bulkDeliveryOperations(req, res) {
    try {
      const { error, value } = validateBulkOperation(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const { operation, delivery_ids, parameters } = value;

      const results = await Admin.bulkDeliveryOperation(
        operation,
        delivery_ids,
        parameters,
        req.user.id
      );

      // Log admin action
      await Admin.logAdminAction({
        action: `bulk_delivery_${operation}`,
        admin_id: req.user.id,
        target_type: "bulk_deliveries",
        details: { delivery_count: delivery_ids.length, parameters },
      });

      logger.info(`Admin bulk delivery operation: ${operation}`, {
        admin_id: req.user.id,
        count: delivery_ids.length,
      });

      res.json({
        success: true,
        message: `Bulk ${operation} completed`,
        data: results,
      });
    } catch (error) {
      logger.error("Bulk delivery operations error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // DRIVER MANAGEMENT (ADMIN)
  // ================================================================

  /**
   * Get all drivers
   */
  static async getAllDrivers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        verified,
        available,
        search,
        sort_by = "created_at",
        sort_order = "desc",
      } = req.query;

      const filters = {
        status: status ? status.split(",") : null,
        verified:
          verified === "true" ? true : verified === "false" ? false : null,
        available:
          available === "true" ? true : available === "false" ? false : null,
        search,
        page: parseInt(page),
        limit: parseInt(limit),
        sort_by,
        sort_order,
      };

      const drivers = await Admin.getAllDrivers(filters);
      const stats = await Admin.getDriverStats(filters);

      res.json({
        success: true,
        data: {
          drivers: drivers.data,
          pagination: drivers.pagination,
          stats,
        },
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
   * Get driver details with full information
   */
  static async getDriverDetails(req, res) {
    try {
      const { id } = req.params;

      const driver = await Admin.getDriverDetails(id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        });
      }

      // Get additional data
      const [deliveryStats, recentDeliveries, ratings] = await Promise.all([
        Driver.getDriverStats(id),
        Driver.getRecentDeliveries(id, 10),
        Driver.getRecentRatings(id, 10),
      ]);

      res.json({
        success: true,
        data: {
          driver,
          stats: deliveryStats,
          recent_deliveries: recentDeliveries,
          recent_ratings: ratings,
        },
      });
    } catch (error) {
      logger.error("Get driver details error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Verify driver
   */
  static async verifyDriver(req, res) {
    try {
      const { id } = req.params;
      const { verified = true, notes } = req.body;

      const driver = await Driver.findById(id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        });
      }

      // Update verification status
      const updatedDriver = await Admin.updateDriverVerification(id, {
        verified,
        verification_notes: notes,
        verified_by: req.user.id,
        verified_at: new Date(),
      });

      // Send notification to driver
      await externalServices.sendNotification(driver.user_id, {
        type: "verification_status_update",
        verified,
        notes,
      });

      // Log admin action
      await Admin.logAdminAction({
        action: verified ? "driver_verified" : "driver_verification_rejected",
        admin_id: req.user.id,
        target_id: id,
        target_type: "driver",
        details: { notes },
      });

      logger.info(`Admin ${verified ? "verified" : "rejected"} driver: ${id}`, {
        admin_id: req.user.id,
      });

      res.json({
        success: true,
        message: `Driver ${
          verified ? "verified" : "verification rejected"
        } successfully`,
        data: updatedDriver,
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
   * Suspend driver
   */
  static async suspendDriver(req, res) {
    try {
      const { id } = req.params;
      const { reason, duration, notify = true } = req.body;

      const driver = await Driver.findById(id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        });
      }

      // Suspend driver
      const suspendedDriver = await Admin.suspendDriver(id, {
        reason,
        duration,
        suspended_by: req.user.id,
        suspended_at: new Date(),
      });

      // Cancel any active deliveries
      await Admin.cancelDriverActiveDeliveries(id, "Driver suspended");

      // Send notification
      if (notify) {
        await externalServices.sendNotification(driver.user_id, {
          type: "account_suspended",
          reason,
          duration,
        });
      }

      // Log admin action
      await Admin.logAdminAction({
        action: "driver_suspended",
        admin_id: req.user.id,
        target_id: id,
        target_type: "driver",
        details: { reason, duration },
      });

      logger.info(`Admin suspended driver: ${id}`, {
        admin_id: req.user.id,
        reason,
      });

      res.json({
        success: true,
        message: "Driver suspended successfully",
        data: suspendedDriver,
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
   * Unsuspend driver
   */
  static async unsuspendDriver(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const driver = await Driver.findById(id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        });
      }

      // Unsuspend driver
      const unsuspendedDriver = await Admin.unsuspendDriver(id, {
        notes,
        unsuspended_by: req.user.id,
        unsuspended_at: new Date(),
      });

      // Send notification
      await externalServices.sendNotification(driver.user_id, {
        type: "account_unsuspended",
        notes,
      });

      // Log admin action
      await Admin.logAdminAction({
        action: "driver_unsuspended",
        admin_id: req.user.id,
        target_id: id,
        target_type: "driver",
        details: { notes },
      });

      logger.info(`Admin unsuspended driver: ${id}`, {
        admin_id: req.user.id,
      });

      res.json({
        success: true,
        message: "Driver unsuspended successfully",
        data: unsuspendedDriver,
      });
    } catch (error) {
      logger.error("Unsuspend driver error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // ANALYTICS AND REPORTS
  // ================================================================

  /**
   * Get dashboard overview statistics
   */
  static async getDashboardOverview(req, res) {
    try {
      const { timeframe = "day" } = req.query;

      const overview = await Admin.getDashboardOverview(timeframe);

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      logger.error("Get dashboard overview error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get delivery analytics
   */
  static async getDeliveryAnalytics(req, res) {
    try {
      const {
        timeframe = "week",
        group_by = "day",
        restaurant_id,
        driver_id,
      } = req.query;

      const analytics = await Admin.getDeliveryAnalytics({
        timeframe,
        group_by,
        restaurant_id,
        driver_id,
      });

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error("Get delivery analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get driver analytics
   */
  static async getDriverAnalytics(req, res) {
    try {
      const { timeframe = "week", top_count = 10 } = req.query;

      const analytics = await Admin.getDriverAnalytics(timeframe, top_count);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error("Get driver analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(req, res) {
    try {
      const { timeframe = "week" } = req.query;

      const metrics = await Admin.getPerformanceMetrics(timeframe);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error("Get performance metrics error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // MONITORING
  // ================================================================

  /**
   * Get real-time delivery monitoring
   */
  static async getDeliveryMonitoring(req, res) {
    try {
      const monitoring = await Admin.getDeliveryMonitoring();

      res.json({
        success: true,
        data: monitoring,
      });
    } catch (error) {
      logger.error("Get delivery monitoring error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get driver monitoring
   */
  static async getDriverMonitoring(req, res) {
    try {
      const monitoring = await Admin.getDriverMonitoring();

      res.json({
        success: true,
        data: monitoring,
      });
    } catch (error) {
      logger.error("Get driver monitoring error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get system health
   */
  static async getSystemHealth(req, res) {
    try {
      const health = await Admin.getSystemHealth();

      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      logger.error("Get system health error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================

  /**
   * Send admin update notifications
   */
  static async sendAdminUpdateNotifications(delivery, updateData) {
    try {
      // Notify customer
      await externalServices.sendNotification(delivery.customer_id, {
        type: "admin_delivery_update",
        delivery_id: delivery.id,
        status: updateData.status,
        admin_notes: updateData.admin_notes,
      });

      // Notify driver if assigned
      if (delivery.driver_id) {
        const driver = await Driver.findById(delivery.driver_id);
        if (driver) {
          await externalServices.sendNotification(driver.user_id, {
            type: "admin_delivery_update",
            delivery_id: delivery.id,
            status: updateData.status,
          });
        }
      }

      // Notify restaurant
      await externalServices.notifyRestaurant(delivery.restaurant_id, {
        type: "admin_delivery_update",
        delivery_id: delivery.id,
        status: updateData.status,
      });
    } catch (error) {
      logger.error("Failed to send admin update notifications:", error);
    }
  }

  /**
   * Send cancellation notifications
   */
  static async sendCancellationNotifications(delivery, reason) {
    try {
      const notifications = [
        externalServices.sendNotification(delivery.customer_id, {
          type: "delivery_cancelled_admin",
          delivery_id: delivery.id,
          reason,
        }),
        externalServices.notifyRestaurant(delivery.restaurant_id, {
          type: "delivery_cancelled_admin",
          delivery_id: delivery.id,
          reason,
        }),
      ];

      if (delivery.driver_id) {
        const driver = await Driver.findById(delivery.driver_id);
        if (driver) {
          notifications.push(
            externalServices.sendNotification(driver.user_id, {
              type: "delivery_cancelled_admin",
              delivery_id: delivery.id,
              reason,
            })
          );
        }
      }

      await Promise.all(notifications);
    } catch (error) {
      logger.error("Failed to send cancellation notifications:", error);
    }
  }

  /**
   * Send reassignment notifications
   */
  static async sendReassignmentNotifications(delivery, newDriver, reason) {
    try {
      await Promise.all([
        externalServices.sendNotification(delivery.customer_id, {
          type: "delivery_reassigned",
          delivery_id: delivery.id,
          new_driver: `${newDriver.first_name} ${newDriver.last_name}`,
          reason,
        }),
        externalServices.sendNotification(newDriver.user_id, {
          type: "delivery_assigned",
          delivery_id: delivery.id,
          reason,
        }),
      ]);
    } catch (error) {
      logger.error("Failed to send reassignment notifications:", error);
    }
  }

  /**
   * Send force complete notifications
   */
  static async sendForceCompleteNotifications(delivery, reason) {
    try {
      await Promise.all([
        externalServices.sendNotification(delivery.customer_id, {
          type: "delivery_force_completed",
          delivery_id: delivery.id,
          reason,
        }),
        externalServices.notifyRestaurant(delivery.restaurant_id, {
          type: "delivery_force_completed",
          delivery_id: delivery.id,
          reason,
        }),
      ]);
    } catch (error) {
      logger.error("Failed to send force complete notifications:", error);
    }
  }
}

module.exports = AdminController;
