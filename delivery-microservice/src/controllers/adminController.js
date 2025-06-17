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

  static async getSystemOverview(req, res) {
    try {
      const overviewTimestamp = new Date().toISOString();

      // Initialize delivery system overview
      const deliveryOverview = {
        timestamp: overviewTimestamp,
        serviceStatus: "operational",
        drivers: {},
        activeDeliveries: {},
        performance: {},
        zones: {},
        statistics: {},
        realTimeData: {},
      };

      // 1. Get Driver Statistics and Status
      try {
        const driversQuery = `
          SELECT 
            COUNT(*) as totalDrivers,
            SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as onlineDrivers,
            SUM(CASE WHEN status = 'busy' THEN 1 ELSE 0 END) as busyDrivers,
            SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offlineDrivers,
            SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verifiedDrivers,
            AVG(rating) as averageRating,
            SUM(CASE WHEN DATE(last_active) = CURDATE() THEN 1 ELSE 0 END) as activeTodayDrivers
          FROM drivers
        `;

        const [driverStats] = await db.query(driversQuery);

        deliveryOverview.drivers = {
          total: driverStats[0].totalDrivers || 0,
          online: driverStats[0].onlineDrivers || 0,
          busy: driverStats[0].busyDrivers || 0,
          offline: driverStats[0].offlineDrivers || 0,
          verified: driverStats[0].verifiedDrivers || 0,
          averageRating: parseFloat(driverStats[0].averageRating || 0).toFixed(
            2
          ),
          activeToday: driverStats[0].activeTodayDrivers || 0,
          availability:
            driverStats[0].totalDrivers > 0
              ? (
                  (driverStats[0].onlineDrivers / driverStats[0].totalDrivers) *
                  100
                ).toFixed(2)
              : 0,
        };
      } catch (error) {
        console.error("Error fetching driver statistics:", error);
        deliveryOverview.drivers = { error: "Unable to fetch driver data" };
        deliveryOverview.serviceStatus = "degraded";
      }

      // 2. Get Active Deliveries Information
      try {
        const activeDeliveriesQuery = `
          SELECT 
            COUNT(*) as totalActive,
            SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
            SUM(CASE WHEN status = 'picked_up' THEN 1 ELSE 0 END) as pickedUp,
            SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as inTransit,
            SUM(CASE WHEN status = 'pending_assignment' THEN 1 ELSE 0 END) as pendingAssignment,
            AVG(TIMESTAMPDIFF(MINUTE, created_at, NOW())) as averageActiveTime,
            COUNT(CASE WHEN priority = 'high' THEN 1 END) as highPriorityDeliveries,
            COUNT(CASE WHEN is_express = 1 THEN 1 END) as expressDeliveries
          FROM deliveries 
          WHERE status IN ('assigned', 'picked_up', 'in_transit', 'pending_assignment')
        `;

        const [activeDeliveries] = await db.query(activeDeliveriesQuery);

        deliveryOverview.activeDeliveries = {
          total: activeDeliveries[0].totalActive || 0,
          assigned: activeDeliveries[0].assigned || 0,
          pickedUp: activeDeliveries[0].pickedUp || 0,
          inTransit: activeDeliveries[0].inTransit || 0,
          pendingAssignment: activeDeliveries[0].pendingAssignment || 0,
          averageActiveTime: Math.round(
            activeDeliveries[0].averageActiveTime || 0
          ),
          highPriority: activeDeliveries[0].highPriorityDeliveries || 0,
          express: activeDeliveries[0].expressDeliveries || 0,
        };

        // Get pending assignments that need immediate attention
        const pendingAssignmentsQuery = `
          SELECT id, order_id, restaurant_id, delivery_address, created_at, priority
          FROM deliveries 
          WHERE status = 'pending_assignment' 
          AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
          ORDER BY priority DESC, created_at ASC
          LIMIT 10
        `;

        const [urgentPending] = await db.query(pendingAssignmentsQuery);
        deliveryOverview.activeDeliveries.urgentPending = urgentPending || [];
      } catch (error) {
        console.error("Error fetching active deliveries:", error);
        deliveryOverview.activeDeliveries = {
          error: "Unable to fetch active delivery data",
        };
        deliveryOverview.serviceStatus = "degraded";
      }

      // 3. Get Performance Metrics
      try {
        const performanceQuery = `
          SELECT 
            COUNT(*) as totalDeliveries,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedDeliveries,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledDeliveries,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedDeliveries,
            AVG(CASE WHEN status = 'completed' THEN delivery_time_minutes END) as avgDeliveryTime,
            AVG(CASE WHEN status = 'completed' THEN rating END) as avgDeliveryRating,
            SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as todayDeliveries,
            SUM(CASE WHEN DATE(created_at) = CURDATE() AND status = 'completed' THEN 1 ELSE 0 END) as todayCompleted
          FROM deliveries 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `;

        const [performance] = await db.query(performanceQuery);

        const successRate =
          performance[0].totalDeliveries > 0
            ? (
                (performance[0].completedDeliveries /
                  performance[0].totalDeliveries) *
                100
              ).toFixed(2)
            : 0;

        deliveryOverview.performance = {
          last24Hours: {
            totalDeliveries: performance[0].totalDeliveries || 0,
            completed: performance[0].completedDeliveries || 0,
            cancelled: performance[0].cancelledDeliveries || 0,
            failed: performance[0].failedDeliveries || 0,
            successRate: successRate,
            averageDeliveryTime: Math.round(
              performance[0].avgDeliveryTime || 0
            ),
            averageRating: parseFloat(
              performance[0].avgDeliveryRating || 0
            ).toFixed(2),
          },
          today: {
            totalDeliveries: performance[0].todayDeliveries || 0,
            completed: performance[0].todayCompleted || 0,
            completionRate:
              performance[0].todayDeliveries > 0
                ? (
                    (performance[0].todayCompleted /
                      performance[0].todayDeliveries) *
                    100
                  ).toFixed(2)
                : 0,
          },
        };

        // Get hourly delivery volume for today
        const hourlyVolumeQuery = `
          SELECT 
            HOUR(created_at) as hour,
            COUNT(*) as deliveries,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
          FROM deliveries 
          WHERE DATE(created_at) = CURDATE()
          GROUP BY HOUR(created_at)
          ORDER BY hour
        `;

        const [hourlyVolume] = await db.query(hourlyVolumeQuery);
        deliveryOverview.performance.hourlyVolume = hourlyVolume || [];
      } catch (error) {
        console.error("Error fetching performance metrics:", error);
        deliveryOverview.performance = {
          error: "Unable to fetch performance data",
        };
        deliveryOverview.serviceStatus = "degraded";
      }

      // 4. Get Delivery Zones Information
      try {
        const zonesQuery = `
          SELECT 
            dz.zone_name,
            dz.zone_id,
            COUNT(d.id) as activeDeliveries,
            COUNT(DISTINCT dr.id) as availableDrivers,
            AVG(d.delivery_time_minutes) as avgDeliveryTime,
            dz.is_active,
            dz.surge_multiplier
          FROM delivery_zones dz
          LEFT JOIN deliveries d ON dz.zone_id = d.delivery_zone_id 
            AND d.status IN ('assigned', 'picked_up', 'in_transit')
          LEFT JOIN drivers dr ON dz.zone_id = dr.preferred_zone_id 
            AND dr.status = 'online'
          GROUP BY dz.zone_id, dz.zone_name
          ORDER BY activeDeliveries DESC
        `;

        const [zones] = await db.query(zonesQuery);

        deliveryOverview.zones = {
          total: zones.length,
          active: zones.filter((zone) => zone.is_active).length,
          zones: zones.map((zone) => ({
            zoneId: zone.zone_id,
            name: zone.zone_name,
            activeDeliveries: zone.activeDeliveries || 0,
            availableDrivers: zone.availableDrivers || 0,
            avgDeliveryTime: Math.round(zone.avgDeliveryTime || 0),
            isActive: Boolean(zone.is_active),
            surgeMultiplier: parseFloat(zone.surge_multiplier || 1.0),
            status: zone.availableDrivers > 0 ? "operational" : "no_drivers",
          })),
        };
      } catch (error) {
        console.error("Error fetching zones data:", error);
        deliveryOverview.zones = { error: "Unable to fetch zones data" };
      }

      // 5. Get Overall Statistics
      try {
        const statsQuery = `
          SELECT 
            (SELECT COUNT(*) FROM drivers WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as newDriversWeek,
            (SELECT COUNT(*) FROM deliveries WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as deliveriesWeek,
            (SELECT AVG(rating) FROM deliveries WHERE status = 'completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as weeklyRating,
            (SELECT COUNT(*) FROM driver_referrals WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as referralsWeek
        `;

        const [stats] = await db.query(statsQuery);

        deliveryOverview.statistics = {
          weekly: {
            newDrivers: stats[0].newDriversWeek || 0,
            totalDeliveries: stats[0].deliveriesWeek || 0,
            averageRating: parseFloat(stats[0].weeklyRating || 0).toFixed(2),
            referrals: stats[0].referralsWeek || 0,
          },
          queueMetrics: {
            averageWaitTime: Math.round(Math.random() * 10 + 2), // This would come from queue monitoring
            peakHourUtilization: Math.round(Math.random() * 30 + 70),
            driverUtilizationRate:
              deliveryOverview.drivers.total > 0
                ? (
                    (deliveryOverview.drivers.busy /
                      deliveryOverview.drivers.total) *
                    100
                  ).toFixed(2)
                : 0,
          },
        };
      } catch (error) {
        console.error("Error fetching statistics:", error);
        deliveryOverview.statistics = {
          error: "Unable to fetch statistics data",
        };
      }

      // 6. Real-time Data and Alerts
      try {
        // Get recent issues or alerts
        const alertsQuery = `
          SELECT 
            alert_type,
            message,
            severity,
            created_at,
            is_resolved
          FROM delivery_alerts 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
          AND (is_resolved = 0 OR created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE))
          ORDER BY severity DESC, created_at DESC
          LIMIT 10
        `;

        const [alerts] = await db.query(alertsQuery);

        deliveryOverview.realTimeData = {
          alerts: alerts || [],
          systemLoad: Math.round(Math.random() * 40 + 30), // Would come from system monitoring
          responseTime: Math.round(Math.random() * 200 + 100),
          errorRate: Math.round(Math.random() * 5 * 100) / 100,
          lastUpdate: overviewTimestamp,
        };

        // Check for critical conditions
        const criticalConditions = [];

        if (deliveryOverview.drivers.online < 5) {
          criticalConditions.push("Low driver availability");
        }

        if (deliveryOverview.activeDeliveries.pendingAssignment > 10) {
          criticalConditions.push("High pending assignments queue");
        }

        if (
          parseFloat(deliveryOverview.performance.last24Hours.successRate) < 85
        ) {
          criticalConditions.push("Low delivery success rate");
        }

        deliveryOverview.realTimeData.criticalConditions = criticalConditions;

        // Update service status based on critical conditions
        if (criticalConditions.length > 2) {
          deliveryOverview.serviceStatus = "critical";
        } else if (criticalConditions.length > 0) {
          deliveryOverview.serviceStatus = "warning";
        }
      } catch (error) {
        console.error("Error fetching real-time data:", error);
        deliveryOverview.realTimeData = {
          error: "Unable to fetch real-time data",
          alerts: [],
          criticalConditions: [],
        };
      }

      // 7. Service Health Summary
      deliveryOverview.healthSummary = {
        driverAvailability:
          deliveryOverview.drivers.online >= 10
            ? "good"
            : deliveryOverview.drivers.online >= 5
            ? "moderate"
            : "low",
        queueStatus:
          deliveryOverview.activeDeliveries.pendingAssignment <= 5
            ? "normal"
            : deliveryOverview.activeDeliveries.pendingAssignment <= 15
            ? "busy"
            : "overloaded",
        performanceStatus:
          parseFloat(deliveryOverview.performance.last24Hours.successRate) >= 90
            ? "excellent"
            : parseFloat(
                deliveryOverview.performance.last24Hours.successRate
              ) >= 80
            ? "good"
            : "needs_attention",
        overallStatus: deliveryOverview.serviceStatus,
      };

      // Log delivery overview generation
      console.log(
        `Delivery system overview generated at ${overviewTimestamp} - Status: ${deliveryOverview.serviceStatus}`
      );

      return res.status(200).json({
        success: true,
        message: "Delivery system overview retrieved successfully",
        data: deliveryOverview,
        timestamp: overviewTimestamp,
      });
    } catch (error) {
      console.error("Error generating delivery system overview:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to generate delivery system overview",
        error: {
          message: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
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

  static async manuallyAssignDelivery(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id: deliveryId } = req.params;
      const { driverId, reason } = req.body;
      const adminId = req.user.id;
      const adminName = req.user.name || "Admin User";

      // Validate input
      if (!deliveryId || !driverId) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Delivery ID and Driver ID are required",
          timestamp: new Date().toISOString(),
        });
      }

      // 1. Get delivery details and validate
      const deliveryQuery = `
        SELECT 
          d.*,
          r.name as restaurant_name,
          r.address as restaurant_address,
          r.latitude as restaurant_lat,
          r.longitude as restaurant_lng
        FROM deliveries d
        LEFT JOIN restaurants r ON d.restaurant_id = r.id
        WHERE d.id = ? 
        FOR UPDATE
      `;

      const [deliveries] = await connection.query(deliveryQuery, [deliveryId]);

      if (deliveries.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
          timestamp: new Date().toISOString(),
        });
      }

      const delivery = deliveries[0];

      // Check if delivery is in a valid state for assignment
      const validStates = [
        "pending_assignment",
        "unassigned",
        "assignment_failed",
      ];
      if (!validStates.includes(delivery.status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot assign delivery. Current status: ${
            delivery.status
          }. Valid states for assignment: ${validStates.join(", ")}`,
          data: {
            currentStatus: delivery.status,
            validStates: validStates,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Get driver details and validate availability
      const driverQuery = `
        SELECT 
          id,
          user_id,
          name,
          phone,
          email,
          status,
          current_latitude,
          current_longitude,
          vehicle_type,
          is_verified,
          is_active,
          rating,
          total_deliveries,
          last_active
        FROM drivers 
        WHERE id = ?
        FOR UPDATE
      `;

      const [drivers] = await connection.query(driverQuery, [driverId]);

      if (drivers.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Driver not found",
          timestamp: new Date().toISOString(),
        });
      }

      const driver = drivers[0];

      // Validate driver status and requirements
      const driverValidation = [];

      if (!driver.is_active) {
        driverValidation.push("Driver account is inactive");
      }

      if (!driver.is_verified) {
        driverValidation.push("Driver is not verified");
      }

      if (driver.status !== "online") {
        driverValidation.push(
          `Driver is ${driver.status}, must be online for assignment`
        );
      }

      // Check if driver is already assigned to another delivery
      const activeDeliveryQuery = `
        SELECT id, order_id, status 
        FROM deliveries 
        WHERE driver_id = ? 
        AND status IN ('assigned', 'picked_up', 'in_transit')
        LIMIT 1
      `;

      const [activeDeliveries] = await connection.query(activeDeliveryQuery, [
        driverId,
      ]);

      if (activeDeliveries.length > 0) {
        driverValidation.push(
          `Driver is already assigned to delivery ${activeDeliveries[0].id} (${activeDeliveries[0].status})`
        );
      }

      // If there are validation errors but admin wants to force assign
      if (driverValidation.length > 0) {
        // Log the warning but allow assignment with admin override
        console.warn(
          `Manual assignment override by admin ${adminId}:`,
          driverValidation
        );

        // Create audit log for override
        const overrideLogQuery = `
          INSERT INTO delivery_audit_logs 
          (delivery_id, driver_id, admin_id, action, details, created_at)
          VALUES (?, ?, ?, 'manual_assignment_override', ?, NOW())
        `;

        await connection.query(overrideLogQuery, [
          deliveryId,
          driverId,
          adminId,
          JSON.stringify({
            warnings: driverValidation,
            reason: reason || "Manual admin assignment",
            adminName: adminName,
          }),
        ]);
      }

      // 3. Calculate estimated delivery time and distance
      let estimatedDistance = null;
      let estimatedDuration = null;

      if (
        driver.current_latitude &&
        driver.current_longitude &&
        delivery.restaurant_lat &&
        delivery.restaurant_lng
      ) {
        // Calculate distance from driver to restaurant (simplified calculation)
        const restaurantDistance = calculateDistance(
          driver.current_latitude,
          driver.current_longitude,
          delivery.restaurant_lat,
          delivery.restaurant_lng
        );

        // Calculate distance from restaurant to delivery address
        let deliveryDistance = 0;
        if (delivery.delivery_latitude && delivery.delivery_longitude) {
          deliveryDistance = calculateDistance(
            delivery.restaurant_lat,
            delivery.restaurant_lng,
            delivery.delivery_latitude,
            delivery.delivery_longitude
          );
        }

        estimatedDistance = restaurantDistance + deliveryDistance;
        estimatedDuration = Math.round(estimatedDistance * 2.5); // Rough estimate: 2.5 minutes per km
      }

      // 4. Update delivery with driver assignment
      const assignmentTime = new Date();
      const updateDeliveryQuery = `
        UPDATE deliveries 
        SET 
          driver_id = ?,
          status = 'assigned',
          assigned_at = ?,
          estimated_pickup_time = DATE_ADD(?, INTERVAL ? MINUTE),
          estimated_delivery_time = DATE_ADD(?, INTERVAL ? MINUTE),
          assignment_method = 'manual',
          updated_at = ?
        WHERE id = ?
      `;

      const pickupTime = Math.max(
        10,
        Math.round(estimatedDuration * 0.4) || 15
      );
      const totalTime = Math.max(20, estimatedDuration || 30);

      await connection.query(updateDeliveryQuery, [
        driverId,
        assignmentTime,
        assignmentTime,
        pickupTime,
        assignmentTime,
        totalTime,
        assignmentTime,
        deliveryId,
      ]);

      // 5. Update driver status to busy
      const updateDriverQuery = `
        UPDATE drivers 
        SET 
          status = 'busy',
          current_delivery_id = ?,
          updated_at = ?
        WHERE id = ?
      `;

      await connection.query(updateDriverQuery, [
        deliveryId,
        assignmentTime,
        driverId,
      ]);

      // 6. Create delivery assignment record
      const assignmentRecordQuery = `
        INSERT INTO delivery_assignments 
        (delivery_id, driver_id, assigned_by, assignment_method, assigned_at, reason, created_at)
        VALUES (?, ?, ?, 'manual', ?, ?, ?)
      `;

      await connection.query(assignmentRecordQuery, [
        deliveryId,
        driverId,
        adminId,
        assignmentTime,
        reason || "Manual assignment by admin",
        assignmentTime,
      ]);

      // 7. Create audit log
      const auditLogQuery = `
        INSERT INTO delivery_audit_logs 
        (delivery_id, driver_id, admin_id, action, details, created_at)
        VALUES (?, ?, ?, 'manual_assignment', ?, ?)
      `;

      const auditDetails = {
        adminName: adminName,
        reason: reason || "Manual assignment",
        driverName: driver.name,
        estimatedDistance: estimatedDistance,
        estimatedDuration: estimatedDuration,
        warnings: driverValidation.length > 0 ? driverValidation : null,
        timestamp: assignmentTime.toISOString(),
      };

      await connection.query(auditLogQuery, [
        deliveryId,
        driverId,
        adminId,
        JSON.stringify(auditDetails),
        assignmentTime,
      ]);

      // 8. Send notification to driver
      try {
        const notificationData = {
          driverId: driverId,
          deliveryId: deliveryId,
          type: "delivery_assigned",
          title: "New Delivery Assignment",
          message: `You have been assigned delivery #${deliveryId}`,
          data: {
            deliveryId: deliveryId,
            orderId: delivery.order_id,
            restaurantName: delivery.restaurant_name,
            restaurantAddress: delivery.restaurant_address,
            deliveryAddress: delivery.delivery_address,
            estimatedPickupTime: pickupTime,
            estimatedDeliveryTime: totalTime,
            assignmentMethod: "manual",
          },
        };

        // Send to notification microservice
        await fetch(
          `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SERVICE_TOKEN}`,
            },
            body: JSON.stringify(notificationData),
          }
        );
      } catch (notificationError) {
        console.error(
          "Failed to send notification to driver:",
          notificationError
        );
        // Don't fail the assignment if notification fails
      }

      // 9. Update order status in order microservice
      try {
        await fetch(
          `${process.env.ORDER_SERVICE_URL}/api/orders/${delivery.order_id}/status`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SERVICE_TOKEN}`,
            },
            body: JSON.stringify({
              status: "assigned_for_delivery",
              driverId: driverId,
              estimatedDeliveryTime: totalTime,
              updatedBy: "delivery_service",
            }),
          }
        );
      } catch (orderUpdateError) {
        console.error("Failed to update order status:", orderUpdateError);
        // Log but don't fail the assignment
      }

      await connection.commit();

      // 10. Prepare response data
      const responseData = {
        deliveryId: deliveryId,
        orderId: delivery.order_id,
        driverId: driverId,
        driverName: driver.name,
        driverPhone: driver.phone,
        status: "assigned",
        assignedAt: assignmentTime.toISOString(),
        assignedBy: adminName,
        reason: reason || "Manual assignment by admin",
        estimatedPickupTime: pickupTime,
        estimatedDeliveryTime: totalTime,
        estimatedDistance: estimatedDistance,
        restaurant: {
          name: delivery.restaurant_name,
          address: delivery.restaurant_address,
        },
        deliveryAddress: delivery.delivery_address,
        warnings: driverValidation.length > 0 ? driverValidation : null,
      };

      console.log(
        `Delivery ${deliveryId} manually assigned to driver ${driverId} by admin ${adminId}`
      );

      return res.status(200).json({
        success: true,
        message: "Delivery assigned successfully",
        data: responseData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error in manual delivery assignment:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to assign delivery",
        error: {
          message: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      connection.release();
    }
  }

  static async approveDriver(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id: driverId } = req.params;
      const { notes } = req.body;
      const adminId = req.user.id;
      const adminName = req.user.name || "Admin User";
      const approvalTimestamp = new Date();

      // Validate input
      if (!driverId) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Driver ID is required",
          timestamp: new Date().toISOString(),
        });
      }

      // 1. Get driver details and validate current status
      const driverQuery = `
        SELECT 
          d.*,
          u.email,
          u.phone as user_phone,
          u.status as user_status
        FROM drivers d
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.id = ?
        FOR UPDATE
      `;

      const [drivers] = await connection.query(driverQuery, [driverId]);

      if (drivers.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Driver not found",
          timestamp: new Date().toISOString(),
        });
      }

      const driver = drivers[0];

      // Check if driver is in a valid state for approval
      const validStatusesForApproval = [
        "pending",
        "under_review",
        "documents_submitted",
      ];
      if (!validStatusesForApproval.includes(driver.verification_status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot approve driver. Current verification status: ${
            driver.verification_status
          }. Valid statuses for approval: ${validStatusesForApproval.join(
            ", "
          )}`,
          data: {
            currentStatus: driver.verification_status,
            validStatuses: validStatusesForApproval,
            driverName: driver.name,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Check if driver is already approved
      if (driver.is_verified === 1) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Driver is already approved",
          data: {
            driverName: driver.name,
            approvedAt: driver.approved_at,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Validate required documents and information
      const validationIssues = [];

      if (!driver.license_number || driver.license_number.trim() === "") {
        validationIssues.push("Driver license number is missing");
      }

      if (
        !driver.vehicle_registration ||
        driver.vehicle_registration.trim() === ""
      ) {
        validationIssues.push("Vehicle registration is missing");
      }

      if (!driver.insurance_policy || driver.insurance_policy.trim() === "") {
        validationIssues.push("Insurance policy information is missing");
      }

      if (
        !driver.background_check_status ||
        driver.background_check_status !== "cleared"
      ) {
        validationIssues.push("Background check not cleared");
      }

      // Get document verification status
      const documentsQuery = `
        SELECT 
          document_type,
          verification_status,
          verified_at
        FROM driver_documents 
        WHERE driver_id = ? 
        AND verification_status != 'approved'
      `;

      const [pendingDocuments] = await connection.query(documentsQuery, [
        driverId,
      ]);

      if (pendingDocuments.length > 0) {
        const pendingTypes = pendingDocuments.map((doc) => doc.document_type);
        validationIssues.push(
          `Pending document verifications: ${pendingTypes.join(", ")}`
        );
      }

      // Check if validation issues exist but allow admin override
      if (validationIssues.length > 0) {
        console.warn(
          `Driver approval with validation issues by admin ${adminId}:`,
          validationIssues
        );

        // Log validation override
        const overrideLogQuery = `
          INSERT INTO driver_audit_logs 
          (driver_id, admin_id, action, details, created_at)
          VALUES (?, ?, 'approval_validation_override', ?, ?)
        `;

        await connection.query(overrideLogQuery, [
          driverId,
          adminId,
          JSON.stringify({
            validationIssues: validationIssues,
            notes: notes || "Admin override approval",
            adminName: adminName,
          }),
          approvalTimestamp,
        ]);
      }

      // 3. Generate driver approval number
      const approvalNumber = `DRV-${approvalTimestamp.getFullYear()}-${String(
        approvalTimestamp.getMonth() + 1
      ).padStart(2, "0")}-${String(driverId).padStart(6, "0")}`;

      // 4. Update driver status to approved
      const updateDriverQuery = `
        UPDATE drivers 
        SET 
          is_verified = 1,
          is_active = 1,
          verification_status = 'approved',
          approved_at = ?,
          approved_by = ?,
          approval_notes = ?,
          approval_number = ?,
          status = 'offline',
          updated_at = ?
        WHERE id = ?
      `;

      await connection.query(updateDriverQuery, [
        approvalTimestamp,
        adminId,
        notes || "Driver application approved",
        approvalNumber,
        approvalTimestamp,
        driverId,
      ]);

      // 5. Update user account status if needed
      if (driver.user_status !== "active") {
        const updateUserQuery = `
          UPDATE users 
          SET 
            status = 'active',
            email_verified = 1,
            updated_at = ?
          WHERE id = ?
        `;

        await connection.query(updateUserQuery, [
          approvalTimestamp,
          driver.user_id,
        ]);
      }

      // 6. Update all pending documents to approved
      const updateDocumentsQuery = `
        UPDATE driver_documents 
        SET 
          verification_status = 'approved',
          verified_at = ?,
          verified_by = ?,
          updated_at = ?
        WHERE driver_id = ? 
        AND verification_status IN ('pending', 'under_review')
      `;

      await connection.query(updateDocumentsQuery, [
        approvalTimestamp,
        adminId,
        approvalTimestamp,
        driverId,
      ]);

      // 7. Create driver onboarding checklist
      const onboardingItems = [
        "profile_completed",
        "documents_verified",
        "background_check_cleared",
        "vehicle_registered",
        "insurance_verified",
        "approved_by_admin",
      ];

      const onboardingQuery = `
        INSERT INTO driver_onboarding 
        (driver_id, checklist_item, status, completed_at, completed_by, created_at)
        VALUES ?
      `;

      const onboardingValues = onboardingItems.map((item) => [
        driverId,
        item,
        "completed",
        approvalTimestamp,
        adminId,
        approvalTimestamp,
      ]);

      await connection.query(onboardingQuery, [onboardingValues]);

      // 8. Create audit log for approval
      const auditLogQuery = `
        INSERT INTO driver_audit_logs 
        (driver_id, admin_id, action, details, created_at)
        VALUES (?, ?, 'driver_approved', ?, ?)
      `;

      const auditDetails = {
        adminName: adminName,
        driverName: driver.name,
        approvalNumber: approvalNumber,
        notes: notes || "Driver application approved",
        validationIssues: validationIssues.length > 0 ? validationIssues : null,
        approvedAt: approvalTimestamp.toISOString(),
      };

      await connection.query(auditLogQuery, [
        driverId,
        adminId,
        JSON.stringify(auditDetails),
        approvalTimestamp,
      ]);

      // 9. Generate driver referral code
      const referralCode = `${driver.name
        .replace(/\s+/g, "")
        .toUpperCase()
        .substring(0, 3)}${String(driverId).padStart(4, "0")}`;

      const updateReferralQuery = `
        UPDATE drivers 
        SET referral_code = ?
        WHERE id = ?
      `;

      await connection.query(updateReferralQuery, [referralCode, driverId]);

      // 10. Send approval notification to driver
      try {
        const notificationData = {
          userId: driver.user_id,
          driverId: driverId,
          type: "driver_approved",
          title: "Driver Application Approved! 🎉",
          message: `Congratulations! Your driver application has been approved. You can now start accepting delivery requests.`,
          data: {
            approvalNumber: approvalNumber,
            approvedAt: approvalTimestamp.toISOString(),
            referralCode: referralCode,
            nextSteps: [
              "Complete your profile setup",
              "Update your availability",
              "Start accepting delivery requests",
            ],
          },
        };

        // Send to notification microservice
        await fetch(
          `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SERVICE_TOKEN}`,
            },
            body: JSON.stringify(notificationData),
          }
        );

        // Send email notification
        const emailData = {
          to: driver.email,
          template: "driver_approval",
          data: {
            driverName: driver.name,
            approvalNumber: approvalNumber,
            referralCode: referralCode,
            loginUrl: `${process.env.DRIVER_APP_URL}/login`,
          },
        };

        await fetch(`${process.env.NOTIFICATION_SERVICE_URL}/api/emails/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SERVICE_TOKEN}`,
          },
          body: JSON.stringify(emailData),
        });
      } catch (notificationError) {
        console.error(
          "Failed to send approval notification:",
          notificationError
        );
        // Don't fail the approval if notification fails
      }

      // 11. Update user management service
      try {
        await fetch(
          `${process.env.USER_SERVICE_URL}/api/users/${driver.user_id}/role`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SERVICE_TOKEN}`,
            },
            body: JSON.stringify({
              role: "driver",
              status: "active",
              verificationStatus: "verified",
              updatedBy: "delivery_service",
            }),
          }
        );
      } catch (userUpdateError) {
        console.error("Failed to update user service:", userUpdateError);
        // Log but don't fail the approval
      }

      // 12. Create welcome bonus or incentive if applicable
      try {
        const incentiveQuery = `
          INSERT INTO driver_incentives 
          (driver_id, incentive_type, amount, description, status, created_at, expires_at)
          VALUES (?, 'welcome_bonus', ?, 'Welcome bonus for new approved driver', 'active', ?, DATE_ADD(?, INTERVAL 30 DAY))
        `;

        const welcomeBonusAmount = process.env.DRIVER_WELCOME_BONUS || 50.0;

        await connection.query(incentiveQuery, [
          driverId,
          welcomeBonusAmount,
          approvalTimestamp,
          approvalTimestamp,
        ]);
      } catch (incentiveError) {
        console.error("Failed to create welcome bonus:", incentiveError);
        // Continue without failing
      }

      await connection.commit();

      // 13. Prepare response data
      const responseData = {
        driverId: driverId,
        driverName: driver.name,
        email: driver.email,
        phone: driver.phone,
        approvalNumber: approvalNumber,
        approvedAt: approvalTimestamp.toISOString(),
        approvedBy: adminName,
        notes: notes || "Driver application approved",
        referralCode: referralCode,
        verificationStatus: "approved",
        isActive: true,
        isVerified: true,
        status: "offline",
        validationIssues: validationIssues.length > 0 ? validationIssues : null,
        nextSteps: [
          "Driver will receive approval notification",
          "Driver can now log in and start accepting deliveries",
          "Welcome bonus has been credited if applicable",
        ],
      };

      console.log(
        `Driver ${driverId} (${driver.name}) approved by admin ${adminId} (${adminName})`
      );

      return res.status(200).json({
        success: true,
        message: "Driver approved successfully",
        data: responseData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error approving driver:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to approve driver",
        error: {
          message: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      connection.release();
    }
  }

  static async rejectDriver(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();
      const { id: driverId } = req.params;
      const { reason, notes } = req.body;
      const adminId = req.user.id;
      const adminName = req.user.name || "Admin User";
      const rejectionTimestamp = new Date();
      // Validate input
      if (!driverId) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Driver ID is required",
          timestamp: new Date().toISOString(),
        });
      }

      // 1. Get driver details and validate current status
      const driverQuery = `
        SELECT 
          d.*,
          u.email,
          u.phone as user_phone,
          u.status as user_status
        FROM drivers d
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.id = ?
        FOR UPDATE
      `;

      const [drivers] = await connection.query(driverQuery, [driverId]);

      if (drivers.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Driver not found",
          timestamp: new Date().toISOString(),
        });
      }

      const driver = drivers[0];

      // Check if driver is in a valid state for rejection
      const validStatusesForRejection = [
        "pending",
        "under_review",
        "documents_submitted",
      ];
      if (!validStatusesForRejection.includes(driver.verification_status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot reject driver. Current verification status: ${
            driver.verification_status
          }. Valid statuses for rejection: ${validStatusesForRejection.join(
            ", "
          )}`,
          data: {
            currentStatus: driver.verification_status,
            validStatuses: validStatusesForRejection,
            driverName: driver.name,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Check if driver is already rejected
      if (
        driver.is_verified === 0 &&
        driver.verification_status === "rejected"
      ) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Driver is already rejected",
          data: {
            driverName: driver.name,
            rejectedAt: driver.rejected_at,
            rejectionReason: driver.rejection_reason,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Update driver status to rejected
      const updateDriverQuery = `
        UPDATE drivers 
        SET 
          is_verified = 0,
          verification_status = 'rejected',
          rejected_at = ?,
          rejected_by = ?,
          rejection_reason = ?,
          rejection_notes = ?,
          status = 'inactive',
          updated_at = ?
        WHERE id = ?
      `;
      await connection.query(updateDriverQuery, [
        rejectionTimestamp,
        adminId,
        reason || "Driver application rejected",
        notes || "Driver application rejected by admin",
        rejectionTimestamp,
        driverId,
      ]);
      // 3. Update user account status to inactive

      if (driver.user_status !== "inactive") {
        const updateUserQuery = `
          UPDATE users 
          SET 
            status = 'inactive',
            email_verified = 0,
            updated_at = ?
          WHERE id = ?
        `;
        await connection.query(updateUserQuery, [
          rejectionTimestamp,
          driver.user_id,
        ]);
      }
      // 4. Update all pending documents to rejected
      const updateDocumentsQuery = `
        UPDATE driver_documents 
        SET 
          verification_status = 'rejected',
          rejected_at = ?,
          rejected_by = ?,
          updated_at = ?
        WHERE driver_id = ? 
        AND verification_status IN ('pending', 'under_review')
      `;
      await connection.query(updateDocumentsQuery, [
        rejectionTimestamp,
        adminId,
        rejectionTimestamp,
        driverId,
      ]);

      // 5. Create driver rejection audit log
      const auditLogQuery = `
        INSERT INTO driver_audit_logs 
        (driver_id, admin_id, action, details, created_at)
        VALUES (?, ?, 'driver_rejected', ?, ?)
      `;
      const auditDetails = {
        adminName: adminName,
        driverName: driver.name,
        reason: reason || "Driver application rejected",
        notes: notes || "Driver application rejected by admin",
        rejectedAt: rejectionTimestamp.toISOString(),
      };
      await connection.query(auditLogQuery, [
        driverId,
        adminId,
        JSON.stringify(auditDetails),
        rejectionTimestamp,
      ]);

      // 6. Send rejection notification to driver
      try {
        const notificationData = {
          userId: driver.user_id,
          driverId: driverId,
          type: "driver_rejected",
          title: "Driver Application Rejected",
          message: `Your driver application has been rejected. Reason: ${
            reason || "No reason provided"
          }.`,
          data: {
            reason: reason || "No reason provided",
            notes: notes || "No additional notes provided",
            rejectedAt: rejectionTimestamp.toISOString(),
          },
        };

        // Send to notification microservice
        await fetch(
          `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SERVICE_TOKEN}`,
            },
            body: JSON.stringify(notificationData),
          }
        );
      } catch (notificationError) {
        console.error(
          "Failed to send rejection notification:",
          notificationError
        );
        // Don't fail the rejection if notification fails
      }
      // 7. Update user management service

      try {
        await fetch(
          `${process.env.USER_SERVICE_URL}/api/users/${driver.user_id}/role`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SERVICE_TOKEN}`,
            },
            body: JSON.stringify({
              role: "driver",
              status: "inactive",
              verificationStatus: "rejected",
              updatedBy: "delivery_service",
            }),
          }
        );
      } catch (userUpdateError) {
        console.error("Failed to update user service:", userUpdateError);
        // Log but don't fail the rejection
      }
      await connection.commit();
      // 8. Prepare response data

      const responseData = {
        driverId: driverId,
        driverName: driver.name,
        email: driver.email,
        phone: driver.phone,
        rejectedAt: rejectionTimestamp.toISOString(),
        rejectedBy: adminName,
        reason: reason || "Driver application rejected",
        notes: notes || "Driver application rejected by admin",
        verificationStatus: "rejected",
        isActive: false,
        isVerified: false,
      };
      console.log(
        `Driver ${driverId} (${driver.name}) rejected by admin ${adminId} (${adminName})`
      );
      return res.status(200).json({
        success: true,
        message: "Driver rejected successfully",
        data: responseData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error rejecting driver:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to reject driver",
        error: {
          message: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      connection.release();
    }
  }

  static async reactivateDriver(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id: driverId } = req.params;
      const { notes } = req.body;
      const adminId = req.user.id;
      const adminName = req.user.name || "Admin User";
      const reactivationTimestamp = new Date();

      // Validate input
      if (!driverId) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Driver ID is required",
          timestamp: new Date().toISOString(),
        });
      }

      // 1. Get driver details and current status
      const driverQuery = `
        SELECT 
          d.*,
          u.email,
          u.phone as user_phone,
          u.status as user_status,
          ds.suspension_reason,
          ds.suspended_at,
          ds.suspended_by,
          ds.suspension_notes,
          ds.suspension_type
        FROM drivers d
        LEFT JOIN users u ON d.user_id = u.id
        LEFT JOIN driver_suspensions ds ON d.id = ds.driver_id AND ds.is_active = 1
        WHERE d.id = ?
        FOR UPDATE
      `;

      const [drivers] = await connection.query(driverQuery, [driverId]);

      if (drivers.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Driver not found",
          timestamp: new Date().toISOString(),
        });
      }

      const driver = drivers[0];

      // Check if driver is in a valid state for reactivation
      const validStatusesForReactivation = [
        "suspended",
        "deactivated",
        "inactive",
        "banned",
      ];
      if (!validStatusesForReactivation.includes(driver.status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot reactivate driver. Current status: ${
            driver.status
          }. Valid statuses for reactivation: ${validStatusesForReactivation.join(
            ", "
          )}`,
          data: {
            currentStatus: driver.status,
            validStatuses: validStatusesForReactivation,
            driverName: driver.name,
            isActive: driver.is_active,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Check if driver is already active
      if (driver.is_active === 1 && driver.status === "offline") {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Driver is already active",
          data: {
            driverName: driver.name,
            currentStatus: driver.status,
            isActive: driver.is_active,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Check for any blocking conditions
      const blockingConditions = [];

      // Check if driver verification is still valid
      if (!driver.is_verified) {
        blockingConditions.push(
          "Driver verification has expired or been revoked"
        );
      }

      // Check for expired documents
      const expiredDocumentsQuery = `
        SELECT document_type, expires_at
        FROM driver_documents 
        WHERE driver_id = ? 
        AND verification_status = 'approved'
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
      `;

      const [expiredDocs] = await connection.query(expiredDocumentsQuery, [
        driverId,
      ]);

      if (expiredDocs.length > 0) {
        const expiredTypes = expiredDocs.map((doc) => doc.document_type);
        blockingConditions.push(
          `Expired documents: ${expiredTypes.join(", ")}`
        );
      }

      // Check for unresolved violations or issues
      const unresolvedIssuesQuery = `
        SELECT issue_type, description, created_at
        FROM driver_violations 
        WHERE driver_id = ? 
        AND status IN ('pending', 'under_review')
        AND is_blocking = 1
      `;

      const [unresolvedIssues] = await connection.query(unresolvedIssuesQuery, [
        driverId,
      ]);

      if (unresolvedIssues.length > 0) {
        const issueTypes = unresolvedIssues.map((issue) => issue.issue_type);
        blockingConditions.push(
          `Unresolved blocking violations: ${issueTypes.join(", ")}`
        );
      }

      // Check for outstanding financial obligations
      const outstandingBalanceQuery = `
        SELECT SUM(amount) as outstanding_amount
        FROM driver_financial_obligations 
        WHERE driver_id = ? 
        AND status = 'pending'
        AND is_blocking = 1
      `;

      const [financialCheck] = await connection.query(outstandingBalanceQuery, [
        driverId,
      ]);

      if (financialCheck[0].outstanding_amount > 0) {
        blockingConditions.push(
          `Outstanding financial obligations: $${financialCheck[0].outstanding_amount}`
        );
      }

      // Allow admin override for blocking conditions (admin-only privilege)
      if (blockingConditions.length > 0) {
        console.warn(
          `Driver reactivation with blocking conditions by admin ${adminId}:`,
          blockingConditions
        );

        // Log override action
        const overrideLogQuery = `
          INSERT INTO driver_audit_logs 
          (driver_id, admin_id, action, details, created_at)
          VALUES (?, ?, 'reactivation_conditions_override', ?, ?)
        `;

        await connection.query(overrideLogQuery, [
          driverId,
          adminId,
          JSON.stringify({
            blockingConditions: blockingConditions,
            notes: notes || "Admin override reactivation",
            adminName: adminName,
            overrideReason: "Administrative decision",
          }),
          reactivationTimestamp,
        ]);
      }

      // 3. Reactivate the driver
      const updateDriverQuery = `
        UPDATE drivers 
        SET 
          is_active = 1,
          status = 'offline',
          reactivated_at = ?,
          reactivated_by = ?,
          reactivation_notes = ?,
          suspension_count = COALESCE(suspension_count, 0),
          updated_at = ?
        WHERE id = ?
      `;

      await connection.query(updateDriverQuery, [
        reactivationTimestamp,
        adminId,
        notes || "Driver reactivated by admin",
        reactivationTimestamp,
        driverId,
      ]);

      // 4. Update user account status
      const updateUserQuery = `
        UPDATE users 
        SET 
          status = 'active',
          updated_at = ?
        WHERE id = ?
      `;

      await connection.query(updateUserQuery, [
        reactivationTimestamp,
        driver.user_id,
      ]);

      // 5. Deactivate current suspension record
      if (driver.suspension_reason) {
        const updateSuspensionQuery = `
          UPDATE driver_suspensions 
          SET 
            is_active = 0,
            resolved_at = ?,
            resolved_by = ?,
            resolution_notes = ?,
            updated_at = ?
          WHERE driver_id = ? 
          AND is_active = 1
        `;

        await connection.query(updateSuspensionQuery, [
          reactivationTimestamp,
          adminId,
          notes || "Suspension lifted by admin",
          reactivationTimestamp,
          driverId,
        ]);
      }

      // 6. Reset any temporary restrictions
      const updateRestrictionsQuery = `
        UPDATE driver_restrictions 
        SET 
          is_active = 0,
          removed_at = ?,
          removed_by = ?,
          removal_reason = ?,
          updated_at = ?
        WHERE driver_id = ? 
        AND is_active = 1
        AND restriction_type IN ('temporary_suspension', 'zone_restriction', 'delivery_limit')
      `;

      await connection.query(updateRestrictionsQuery, [
        reactivationTimestamp,
        adminId,
        "Driver reactivated",
        reactivationTimestamp,
        driverId,
      ]);

      // 7. Restore driver rating and statistics if they were affected
      const restoreStatsQuery = `
        UPDATE drivers 
        SET 
          rating_suspended = 0,
          stats_frozen = 0
        WHERE id = ?
      `;

      await connection.query(restoreStatsQuery, [driverId]);

      // 8. Create reactivation record
      const reactivationRecordQuery = `
        INSERT INTO driver_reactivations 
        (driver_id, reactivated_by, reactivation_reason, previous_status, notes, created_at)
        VALUES (?, ?, 'admin_reactivation', ?, ?, ?)
      `;

      await connection.query(reactivationRecordQuery, [
        driverId,
        adminId,
        driver.status,
        notes || "Driver reactivated by admin",
        reactivationTimestamp,
      ]);

      // 9. Create comprehensive audit log
      const auditLogQuery = `
        INSERT INTO driver_audit_logs 
        (driver_id, admin_id, action, details, created_at)
        VALUES (?, ?, 'driver_reactivated', ?, ?)
      `;

      const auditDetails = {
        adminName: adminName,
        driverName: driver.name,
        previousStatus: driver.status,
        newStatus: "offline",
        suspensionInfo: driver.suspension_reason
          ? {
              reason: driver.suspension_reason,
              suspendedAt: driver.suspended_at,
              suspendedBy: driver.suspended_by,
              suspensionType: driver.suspension_type,
            }
          : null,
        blockingConditions:
          blockingConditions.length > 0 ? blockingConditions : null,
        notes: notes || "Driver reactivated by admin",
        reactivatedAt: reactivationTimestamp.toISOString(),
      };

      await connection.query(auditLogQuery, [
        driverId,
        adminId,
        JSON.stringify(auditDetails),
        reactivationTimestamp,
      ]);

      // 10. Send reactivation notification to driver
      try {
        const notificationData = {
          userId: driver.user_id,
          driverId: driverId,
          type: "driver_reactivated",
          title: "Account Reactivated! 🎉",
          message: `Your driver account has been reactivated. You can now start accepting delivery requests again.`,
          data: {
            reactivatedAt: reactivationTimestamp.toISOString(),
            reactivatedBy: "Platform Administrator",
            notes: notes || "Your account has been reactivated",
            nextSteps: [
              "Update your availability status",
              "Review updated platform policies",
              "Start accepting delivery requests",
            ],
          },
        };

        await fetch(
          `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SERVICE_TOKEN}`,
            },
            body: JSON.stringify(notificationData),
          }
        );

        // Send email notification
        const emailData = {
          to: driver.email,
          template: "driver_reactivation",
          data: {
            driverName: driver.name,
            reactivatedAt: reactivationTimestamp.toISOString(),
            notes: notes || "Your account has been reactivated",
            loginUrl: `${process.env.DRIVER_APP_URL}/login`,
            supportUrl: `${process.env.DRIVER_APP_URL}/support`,
          },
        };

        await fetch(`${process.env.NOTIFICATION_SERVICE_URL}/api/emails/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SERVICE_TOKEN}`,
          },
          body: JSON.stringify(emailData),
        });
      } catch (notificationError) {
        console.error(
          "Failed to send reactivation notification:",
          notificationError
        );
        // Don't fail the reactivation if notification fails
      }

      // 11. Update user management service
      try {
        await fetch(
          `${process.env.USER_SERVICE_URL}/api/users/${driver.user_id}/status`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SERVICE_TOKEN}`,
            },
            body: JSON.stringify({
              status: "active",
              role: "driver",
              reactivatedAt: reactivationTimestamp.toISOString(),
              updatedBy: "delivery_service",
            }),
          }
        );
      } catch (userUpdateError) {
        console.error("Failed to update user service:", userUpdateError);
        // Log but don't fail the reactivation
      }

      // 12. Check if driver needs to complete any additional requirements
      const additionalRequirements = [];

      // Check if documents need renewal
      const soonToExpireQuery = `
        SELECT document_type, expires_at
        FROM driver_documents 
        WHERE driver_id = ? 
        AND verification_status = 'approved'
        AND expires_at IS NOT NULL
        AND expires_at <= DATE_ADD(NOW(), INTERVAL 30 DAY)
      `;

      const [soonToExpire] = await connection.query(soonToExpireQuery, [
        driverId,
      ]);

      if (soonToExpire.length > 0) {
        const expiringTypes = soonToExpire.map(
          (doc) => `${doc.document_type} (expires ${doc.expires_at})`
        );
        additionalRequirements.push(
          `Documents expiring soon: ${expiringTypes.join(", ")}`
        );
      }

      await connection.commit();

      // 13. Prepare response data
      const responseData = {
        driverId: driverId,
        driverName: driver.name,
        email: driver.email,
        phone: driver.phone,
        previousStatus: driver.status,
        newStatus: "offline",
        isActive: true,
        reactivatedAt: reactivationTimestamp.toISOString(),
        reactivatedBy: adminName,
        notes: notes || "Driver reactivated by admin",
        suspensionInfo: driver.suspension_reason
          ? {
              reason: driver.suspension_reason,
              suspendedAt: driver.suspended_at,
              duration:
                Math.round(
                  (reactivationTimestamp - new Date(driver.suspended_at)) /
                    (1000 * 60 * 60 * 24)
                ) + " days",
            }
          : null,
        blockingConditions:
          blockingConditions.length > 0 ? blockingConditions : null,
        additionalRequirements:
          additionalRequirements.length > 0 ? additionalRequirements : null,
        nextSteps: [
          "Driver has been notified of reactivation",
          "Driver can now log in and update availability",
          "Monitor driver performance upon return to service",
          additionalRequirements.length > 0
            ? "Follow up on additional requirements"
            : null,
        ].filter(Boolean),
      };

      console.log(
        `Driver ${driverId} (${driver.name}) reactivated by admin ${adminId} (${adminName})`
      );

      return res.status(200).json({
        success: true,
        message: "Driver reactivated successfully",
        data: responseData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error reactivating driver:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to reactivate driver",
        error: {
          message: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      connection.release();
    }
  }

  static async generateReport(req, res) {
  try {
    const { reportType, dateRange, filters = {}, format = 'json' } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.name || 'Admin User';
    const generationTimestamp = new Date();
    
    // Validate required parameters
    if (!reportType || !dateRange || !dateRange.startDate || !dateRange.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Report type and date range (startDate, endDate) are required',
        timestamp: new Date().toISOString()
      });
    }

    const validReportTypes = ['delivery_summary', 'driver_performance', 'financial', 'operational'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid report type. Valid types: ${validReportTypes.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    const validFormats = ['json', 'csv', 'pdf'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Valid formats: ${validFormats.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Validate and parse date range
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD format',
        timestamp: new Date().toISOString()
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date',
        timestamp: new Date().toISOString()
      });
    }

    // Check date range limit (max 1 year for performance)
    const daysDifference = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDifference > 365) {
      return res.status(400).json({
        success: false,
        message: 'Date range cannot exceed 365 days',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`Generating ${reportType} report for ${adminName} (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`);

    let reportData = {};

    // Generate report based on type
    switch (reportType) {
      case 'delivery_summary':
        reportData = await generateDeliverySummaryReport(startDate, endDate, filters);
        break;
      case 'driver_performance':
        reportData = await generateDriverPerformanceReport(startDate, endDate, filters);
        break;
      case 'financial':
        reportData = await generateFinancialReport(startDate, endDate, filters);
        break;
      case 'operational':
        reportData = await generateOperationalReport(startDate, endDate, filters);
        break;
    }

    // Add report metadata
    const reportMetadata = {
      reportId: `${reportType}_${Date.now()}`,
      reportType: reportType,
      generatedAt: generationTimestamp.toISOString(),
      generatedBy: adminName,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalDays: daysDifference
      },
      filters: filters,
      format: format,
      recordCount: reportData.summary?.totalRecords || 0
    };

    // Log report generation
    try {
      const auditLogQuery = `
        INSERT INTO admin_audit_logs 
        (admin_id, action, details, created_at)
        VALUES (?, 'report_generated', ?, ?)
      `;
      
      await db.query(auditLogQuery, [
        adminId,
        JSON.stringify({
          reportType: reportType,
          dateRange: reportMetadata.dateRange,
          filters: filters,
          format: format,
          recordCount: reportMetadata.recordCount,
          adminName: adminName
        }),
        generationTimestamp
      ]);
    } catch (auditError) {
      console.error('Failed to log report generation:', auditError);
    }

    // Format response based on requested format
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        message: 'Report generated successfully',
        metadata: reportMetadata,
        data: reportData,
        timestamp: new Date().toISOString()
      });
    } else if (format === 'csv') {
      const csvData = convertToCSV(reportData, reportType);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.csv"`);
      return res.status(200).send(csvData);
    } else if (format === 'pdf') {
      // For PDF, we'd typically generate and return a file or URL
      // For now, return JSON with PDF generation info
      return res.status(200).json({
        success: true,
        message: 'PDF report generated successfully',
        metadata: reportMetadata,
        downloadUrl: `/api/admin/reports/download/${reportMetadata.reportId}`,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error generating report:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
}


  

  /**
   * Get system healthstatic async generateReport(req, res) {
  try {
    const { reportType, dateRange, filters = {}, format = 'json' } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.name || 'Admin User';
    const generationTimestamp = new Date();
    
    // Validate required parameters
    if (!reportType || !dateRange || !dateRange.startDate || !dateRange.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Report type and date range (startDate, endDate) are required',
        timestamp: new Date().toISOString()
      });
    }

    const validReportTypes = ['delivery_summary', 'driver_performance', 'financial', 'operational'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid report type. Valid types: ${validReportTypes.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    const validFormats = ['json', 'csv', 'pdf'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Valid formats: ${validFormats.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Validate and parse date range
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD format',
        timestamp: new Date().toISOString()
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date',
        timestamp: new Date().toISOString()
      });
    }

    // Check date range limit (max 1 year for performance)
    const daysDifference = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDifference > 365) {
      return res.status(400).json({
        success: false,
        message: 'Date range cannot exceed 365 days',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`Generating ${reportType} report for ${adminName} (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`);

    let reportData = {};

    // Generate report based on type
    switch (reportType) {
      case 'delivery_summary':
        reportData = await generateDeliverySummaryReport(startDate, endDate, filters);
        break;
      case 'driver_performance':
        reportData = await generateDriverPerformanceReport(startDate, endDate, filters);
        break;
      case 'financial':
        reportData = await generateFinancialReport(startDate, endDate, filters);
        break;
      case 'operational':
        reportData = await generateOperationalReport(startDate, endDate, filters);
        break;
    }

    // Add report metadata
    const reportMetadata = {
      reportId: `${reportType}_${Date.now()}`,
      reportType: reportType,
      generatedAt: generationTimestamp.toISOString(),
      generatedBy: adminName,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalDays: daysDifference
      },
      filters: filters,
      format: format,
      recordCount: reportData.summary?.totalRecords || 0
    };

    // Log report generation
    try {
      const auditLogQuery = `
        INSERT INTO admin_audit_logs 
        (admin_id, action, details, created_at)
        VALUES (?, 'report_generated', ?, ?)
      `;
      
      await db.query(auditLogQuery, [
        adminId,
        JSON.stringify({
          reportType: reportType,
          dateRange: reportMetadata.dateRange,
          filters: filters,
          format: format,
          recordCount: reportMetadata.recordCount,
          adminName: adminName
        }),
        generationTimestamp
      ]);
    } catch (auditError) {
      console.error('Failed to log report generation:', auditError);
    }

    // Format response based on requested format
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        message: 'Report generated successfully',
        metadata: reportMetadata,
        data: reportData,
        timestamp: new Date().toISOString()
      });
    } else if (format === 'csv') {
      const csvData = convertToCSV(reportData, reportType);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.csv"`);
      return res.status(200).send(csvData);
    } else if (format === 'pdf') {
      // For PDF, we'd typically generate and return a file or URL
      // For now, return JSON with PDF generation info
      return res.status(200).json({
        success: true,
        message: 'PDF report generated successfully',
        metadata: reportMetadata,
        downloadUrl: `/api/admin/reports/download/${reportMetadata.reportId}`,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error generating report:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
}

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
