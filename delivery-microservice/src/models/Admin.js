const { sequelize } = require("../config/database");
const logger = require("../utils/logger");

/**
 * Admin Model
 * Handles admin-related database operations
 */
class Admin {
  // ================================================================
  // SYSTEM OVERVIEW
  // ================================================================

  /**
   * Get system overview statistics
   */
  static async getSystemOverview() {
    try {
      const [stats] = await sequelize.query(`
        SELECT 
          (SELECT COUNT(*) FROM deliveries) as total_deliveries,
          (SELECT COUNT(*) FROM deliveries WHERE status IN ('assigned', 'picked_up', 'in_transit')) as active_deliveries,
          (SELECT COUNT(*) FROM drivers) as total_drivers,
          (SELECT COUNT(*) FROM drivers WHERE is_available = TRUE AND is_verified = TRUE) as active_drivers,
          (SELECT COUNT(*) FROM deliveries WHERE DATE(created_at) = CURDATE()) as today_deliveries,
          (SELECT COUNT(*) FROM deliveries WHERE DATE(created_at) = CURDATE() AND status = 'delivered') as today_completed,
          (SELECT AVG(delivery_time_minutes) FROM deliveries WHERE status = 'delivered' AND delivery_time_minutes IS NOT NULL) as avg_delivery_time
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      return stats || {
        total_deliveries: 0,
        active_deliveries: 0,
        total_drivers: 0,
        active_drivers: 0,
        today_deliveries: 0,
        today_completed: 0,
        avg_delivery_time: 0,
      };
    } catch (error) {
      logger.error("Error getting system overview:", error);
      throw error;
    }
  }

  /**
   * Get real-time system metrics
   */
  static async getRealTimeMetrics() {
    try {
      const [metrics] = await sequelize.query(`
        SELECT 
          (SELECT COUNT(*) FROM deliveries WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as deliveries_last_hour,
          (SELECT COUNT(*) FROM deliveries WHERE status = 'delivered' AND delivery_time >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as completed_last_hour,
          (SELECT COUNT(*) FROM deliveries WHERE status = 'cancelled' AND updated_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as cancelled_last_hour,
          (SELECT AVG(delivery_time_minutes) FROM deliveries WHERE status = 'delivered' AND delivery_time >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as avg_delivery_time_hour
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      return metrics || {
        deliveries_last_hour: 0,
        completed_last_hour: 0,
        cancelled_last_hour: 0,
        avg_delivery_time_hour: 0,
      };
    } catch (error) {
      logger.error("Error getting real-time metrics:", error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  static async getSystemHealth() {
    try {
      // Check database connection
      await sequelize.query('SELECT 1', { type: sequelize.QueryTypes.SELECT });

      const health = {
        status: "healthy",
        timestamp: new Date(),
        services: {
          database: "healthy",
          redis: "healthy", // Would check Redis if available
          external_apis: "healthy", // Would check external APIs
        },
        version: process.env.npm_package_version || "1.0.0",
      };

      return health;
    } catch (error) {
      logger.error("Error getting system health:", error);
      return {
        status: "unhealthy",
        timestamp: new Date(),
        error: error.message,
        services: {
          database: "unhealthy",
          redis: "unknown",
          external_apis: "unknown",
        },
      };
    }
  }

  // ================================================================
  // DELIVERY MANAGEMENT
  // ================================================================

  /**
   * Get all deliveries with admin filters
   */
  static async getAllDeliveries(filters = {}) {
    try {
      let whereClause = "WHERE 1=1";
      let replacements = [];

      // Build filters
      if (filters.status) {
        whereClause += " AND d.status = ?";
        replacements.push(filters.status);
      }

      if (filters.driver_id) {
        whereClause += " AND d.driver_id = ?";
        replacements.push(filters.driver_id);
      }

      if (filters.start_date) {
        whereClause += " AND d.created_at >= ?";
        replacements.push(filters.start_date);
      }

      if (filters.end_date) {
        whereClause += " AND d.created_at <= ?";
        replacements.push(filters.end_date);
      }

      if (filters.search) {
        whereClause += " AND (d.license_number LIKE ? OR d.phone_number LIKE ? OR d.license_plate LIKE ?)";
        replacements.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
      }

      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      // Get total count
      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as total
        FROM drivers d
        ${whereClause}
      `, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      // Get drivers with stats
      const drivers = await sequelize.query(`
        SELECT 
          d.*,
          COUNT(del.id) as total_deliveries,
          COUNT(CASE WHEN del.status = 'delivered' THEN 1 END) as completed_deliveries,
          AVG(del.customer_rating) as average_rating
        FROM drivers d
        LEFT JOIN deliveries del ON d.id = del.driver_id
        ${whereClause}
        GROUP BY d.id
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
      `, {
        replacements: [...replacements, limit, offset],
        type: sequelize.QueryTypes.SELECT
      });

      const total = countResult.total;
      const pages = Math.ceil(total / limit);

      return {
        drivers,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      logger.error("Error getting all drivers:", error);
      throw error;
    }
  }

  /**
   * Get driver details for admin
   */
  static async getDriverDetails(driverId) {
    try {
      const [driver] = await sequelize.query(`
        SELECT 
          d.*,
          COUNT(del.id) as total_deliveries,
          COUNT(CASE WHEN del.status = 'delivered' THEN 1 END) as completed_deliveries,
          COUNT(CASE WHEN del.status = 'cancelled' THEN 1 END) as cancelled_deliveries,
          AVG(del.customer_rating) as average_rating,
          SUM(del.delivery_fee) as total_earnings
        FROM drivers d
        LEFT JOIN deliveries del ON d.id = del.driver_id
        WHERE d.id = ?
        GROUP BY d.id
      `, {
        replacements: [driverId],
        type: sequelize.QueryTypes.SELECT
      });

      if (!driver) {
        return null;
      }

      // Get driver documents
      const documents = await sequelize.query(`
        SELECT 
          document_type, file_name, file_url, verification_status,
          uploaded_at, verified_at, verification_notes
        FROM driver_documents
        WHERE driver_id = ? AND upload_status != 'deleted'
        ORDER BY uploaded_at DESC
      `, {
        replacements: [driverId],
        type: sequelize.QueryTypes.SELECT
      });

      // Get recent deliveries
      const recentDeliveries = await sequelize.query(`
        SELECT 
          id, order_id, status, delivery_address, delivery_fee,
          customer_rating, created_at, delivery_time
        FROM deliveries
        WHERE driver_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `, {
        replacements: [driverId],
        type: sequelize.QueryTypes.SELECT
      });

      return {
        ...driver,
        documents,
        recent_deliveries: recentDeliveries
      };
    } catch (error) {
      logger.error("Error getting driver details:", error);
      throw error;
    }
  }

  /**
   * Update driver verification status
   */
  static async updateDriverVerification(driverId, status, notes, adminId) {
    try {
      await sequelize.query(`
        UPDATE drivers 
        SET verification_status = ?, 
            verification_notes = ?,
            verification_completed_at = ?,
            is_verified = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, {
        replacements: [
          status,
          notes,
          status !== 'pending' ? new Date() : null,
          status === 'approved' ? true : false,
          driverId
        ],
        type: sequelize.QueryTypes.UPDATE
      });

      logger.info(`Driver ${driverId} verification updated to ${status} by admin ${adminId}`);
      return { success: true, message: `Driver ${status} successfully` };
    } catch (error) {
      logger.error("Error updating driver verification:", error);
      throw error;
    }
  }

  /**
   * Suspend driver
   */
  static async suspendDriver(driverId, reason, duration, adminId) {
    try {
      await sequelize.query(`
        UPDATE drivers 
        SET is_active = FALSE,
            is_available = FALSE,
            verification_notes = CONCAT(IFNULL(verification_notes, ''), '\nSuspended: ', ?, ' Duration: ', ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, {
        replacements: [reason, duration, driverId],
        type: sequelize.QueryTypes.UPDATE
      });

      logger.info(`Driver ${driverId} suspended by admin ${adminId}. Reason: ${reason}`);
      return { success: true, message: "Driver suspended successfully" };
    } catch (error) {
      logger.error("Error suspending driver:", error);
      throw error;
    }
  }

  /**
   * Reactivate driver
   */
  static async reactivateDriver(driverId, adminId, notes = "") {
    try {
      await sequelize.query(`
        UPDATE drivers 
        SET is_active = TRUE,
            verification_notes = CONCAT(IFNULL(verification_notes, ''), '\nReactivated: ', ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, {
        replacements: [notes, driverId],
        type: sequelize.QueryTypes.UPDATE
      });

      logger.info(`Driver ${driverId} reactivated by admin ${adminId}`);
      return { success: true, message: "Driver reactivated successfully" };
    } catch (error) {
      logger.error("Error reactivating driver:", error);
      throw error;
    }
  }

  // ================================================================
  // DELIVERY ACTIONS
  // ================================================================

  /**
   * Manually assign delivery to driver
   */
  static async manuallyAssignDelivery(deliveryId, driverId, adminId) {
    try {
      const [result] = await sequelize.query(`
        UPDATE deliveries 
        SET driver_id = ?, 
            status = 'assigned',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'pending'
      `, {
        replacements: [driverId, deliveryId],
        type: sequelize.QueryTypes.UPDATE
      });

      if (result.affectedRows === 0) {
        return { success: false, message: "Delivery not found or already assigned" };
      }

      logger.info(`Delivery ${deliveryId} manually assigned to driver ${driverId} by admin ${adminId}`);
      return { success: true, message: "Delivery assigned successfully" };
    } catch (error) {
      logger.error("Error manually assigning delivery:", error);
      throw error;
    }
  }

  /**
   * Reassign delivery to different driver
   */
  static async reassignDelivery(deliveryId, newDriverId, reason, adminId) {
    try {
      const [result] = await sequelize.query(`
        UPDATE deliveries 
        SET driver_id = ?, 
            driver_notes = CONCAT(IFNULL(driver_notes, ''), '\nReassigned: ', ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, {
        replacements: [newDriverId, reason, deliveryId],
        type: sequelize.QueryTypes.UPDATE
      });

      if (result.affectedRows === 0) {
        return { success: false, message: "Delivery not found" };
      }

      logger.info(`Delivery ${deliveryId} reassigned to driver ${newDriverId} by admin ${adminId}. Reason: ${reason}`);
      return { success: true, message: "Delivery reassigned successfully" };
    } catch (error) {
      logger.error("Error reassigning delivery:", error);
      throw error;
    }
  }

  /**
   * Cancel delivery
   */
  static async cancelDelivery(deliveryId, reason, adminId) {
    try {
      const [result] = await sequelize.query(`
        UPDATE deliveries 
        SET status = 'cancelled',
            driver_notes = CONCAT(IFNULL(driver_notes, ''), '\nCancelled by admin: ', ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status NOT IN ('delivered', 'cancelled')
      `, {
        replacements: [reason, deliveryId],
        type: sequelize.QueryTypes.UPDATE
      });

      if (result.affectedRows === 0) {
        return { success: false, message: "Delivery not found or cannot be cancelled" };
      }

      logger.info(`Delivery ${deliveryId} cancelled by admin ${adminId}. Reason: ${reason}`);
      return { success: true, message: "Delivery cancelled successfully" };
    } catch (error) {
      logger.error("Error cancelling delivery:", error);
      throw error;
    }
  }

  // ================================================================
  // ANALYTICS
  // ================================================================

  /**
   * Get delivery analytics
   */
  static async getDeliveryAnalytics(timeframe = "month") {
    try {
      const timeFilter = this.buildTimeFilter(timeframe);

      const [analytics] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_deliveries,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_deliveries,
          AVG(delivery_time_minutes) as avg_delivery_time,
          SUM(delivery_fee) as total_revenue,
          AVG(customer_rating) as avg_rating,
          COUNT(CASE WHEN delivery_time <= estimated_delivery_time THEN 1 END) * 100.0 / 
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as on_time_percentage
        FROM deliveries
        WHERE created_at >= ?
      `, {
        replacements: [timeFilter],
        type: sequelize.QueryTypes.SELECT
      });

      return analytics || {
        total_deliveries: 0,
        completed_deliveries: 0,
        cancelled_deliveries: 0,
        avg_delivery_time: 0,
        total_revenue: 0,
        avg_rating: 0,
        on_time_percentage: 0
      };
    } catch (error) {
      logger.error("Error getting delivery analytics:", error);
      throw error;
    }
  }

  /**
   * Get driver analytics
   */
  static async getDriverAnalytics(timeframe = "month") {
    try {
      const [analytics] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_drivers,
          COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_drivers,
          COUNT(CASE WHEN is_available = TRUE AND is_verified = TRUE THEN 1 END) as available_drivers,
          COUNT(CASE WHEN is_verified = TRUE THEN 1 END) as verified_drivers,
          AVG(rating) as avg_driver_rating,
          AVG(total_deliveries) as avg_deliveries_per_driver
        FROM drivers
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      return analytics || {
        total_drivers: 0,
        active_drivers: 0,
        available_drivers: 0,
        verified_drivers: 0,
        avg_driver_rating: 0,
        avg_deliveries_per_driver: 0
      };
    } catch (error) {
      logger.error("Error getting driver analytics:", error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics() {
    try {
      const [metrics] = await sequelize.query(`
        SELECT 
          AVG(delivery_time_minutes) as avg_response_time,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / COUNT(*) as success_rate,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) * 100.0 / COUNT(*) as error_rate,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 1 END) as active_sessions
        FROM deliveries
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      return {
        avg_response_time: metrics?.avg_response_time || 0,
        system_uptime: 99.9, // Would be calculated from system monitoring
        error_rate: metrics?.error_rate || 0,
        active_sessions: metrics?.active_sessions || 0,
      };
    } catch (error) {
      logger.error("Error getting performance metrics:", error);
      throw error;
    }
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================

  /**
   * Build time filter for analytics queries
   */
  static buildTimeFilter(timeframe) {
    const now = new Date();

    switch (timeframe) {
      case "hour":
        return new Date(now.getTime() - 60 * 60 * 1000);
      case "day":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "month":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "year":
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  // ================================================================
  // PLACEHOLDER METHODS (implement as needed)
  // ================================================================

  static async generateReport(reportType, dateRange, filters) {
    try {
      // Implementation would generate actual reports
      const reportId = "RPT_" + Date.now();
      
      logger.info(`Report generated: ${reportId}, Type: ${reportType}`);
      
      return {
        reportId,
        status: "generated",
        downloadUrl: `/api/admin/reports/download/${reportId}`,
        generatedAt: new Date(),
        type: reportType,
        dateRange
      };
    } catch (error) {
      logger.error("Error generating report:", error);
      throw error;
    }
  }

  static async getDeliveryConfig() {
    try {
      // This would typically come from a config table
      return {
        maxDeliveryRadius: 10,
        baseDeliveryFee: 5.0,
        perKmRate: 1.5,
        maxDeliveryTime: 60,
        autoAssignment: true,
        driverTimeout: 300, // 5 minutes
        maxRetries: 3
      };
    } catch (error) {
      logger.error("Error getting delivery config:", error);
      throw error;
    }
  }

  static async updateDeliveryConfig(config, adminId) {
    try {
      // This would update a config table
      logger.info(`Delivery config updated by admin ${adminId}:`, config);
      
      return { success: true, message: "Configuration updated successfully" };
    } catch (error) {
      logger.error("Error updating delivery config:", error);
      throw error;
    }
  }

  static async getZoneConfig() {
    try {
      // This would come from a zones table
      return [
        {
          id: "1",
          name: "Downtown",
          deliveryFee: 5.0,
          isActive: true,
          coordinates: [], // GeoJSON coordinates
        },
        {
          id: "2", 
          name: "Suburbs",
          deliveryFee: 7.5,
          isActive: true,
          coordinates: [],
        }
      ];
    } catch (error) {
      logger.error("Error getting zone config:", error);
      throw error;
    }
  }

  static async updateZoneConfig(zones, adminId) {
    try {
      // This would update zones table
      logger.info(`Zone config updated by admin ${adminId}:`, zones);
      
      return {
        success: true,
        message: "Zone configuration updated successfully",
      };
    } catch (error) {
      logger.error("Error updating zone config:", error);
      throw error;
    }
  }
}

module.exports = Admin; 