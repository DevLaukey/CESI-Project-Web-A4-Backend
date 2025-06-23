const { sequelize } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

class Delivery {
  static async createTable() {
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS deliveries (
          id VARCHAR(36) PRIMARY KEY,
          order_id VARCHAR(36) NOT NULL UNIQUE,
          driver_id VARCHAR(36),
          restaurant_id VARCHAR(36) NOT NULL,
          customer_id VARCHAR(36) NOT NULL,
          status ENUM('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending',
          pickup_address TEXT NOT NULL,
          pickup_lat DECIMAL(10, 8),
          pickup_lng DECIMAL(11, 8),
          delivery_address TEXT NOT NULL,
          delivery_lat DECIMAL(10, 8),
          delivery_lng DECIMAL(11, 8),
          estimated_distance DECIMAL(8, 2),
          actual_distance DECIMAL(8, 2),
          delivery_fee DECIMAL(8, 2) NOT NULL,
          delivery_instructions TEXT,
          pickup_time DATETIME,
          delivery_time DATETIME,
          estimated_delivery_time DATETIME,
          delivery_time_minutes INT,
          last_tracked_at TIMESTAMP,
          last_known_lat DECIMAL(10, 8),
          last_known_lng DECIMAL(11, 8),
          qr_code_pickup TEXT,
          qr_code_delivery TEXT,
          customer_rating INT,
          customer_feedback TEXT,
          driver_notes TEXT,
          tracking_number VARCHAR(20) UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_order (order_id),
          INDEX idx_driver (driver_id),
          INDEX idx_status (status),
          INDEX idx_tracking (tracking_number),
          INDEX idx_created_at (created_at),
          INDEX idx_restaurant (restaurant_id),
          INDEX idx_customer (customer_id)
        )
      `);

      console.log("✅ Deliveries table created successfully!");
    } catch (error) {
      console.error("❌ Error creating deliveries table:", error);
      throw error;
    }
  }

  static async create(deliveryData) {
    try {
      const id = uuidv4();
      const trackingNumber = this.generateTrackingNumber();
      const qrCodePickup = this.generateQRCode();
      const qrCodeDelivery = this.generateQRCode();

      await sequelize.query(
        `
        INSERT INTO deliveries (
          id, order_id, restaurant_id, customer_id, pickup_address,
          pickup_lat, pickup_lng, delivery_address, delivery_lat, delivery_lng,
          estimated_distance, delivery_fee, delivery_instructions, 
          estimated_delivery_time, tracking_number, qr_code_pickup, qr_code_delivery
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        {
          replacements: [
            id,
            deliveryData.order_id,
            deliveryData.restaurant_id,
            deliveryData.customer_id,
            deliveryData.pickup_address,
            deliveryData.pickup_lat || null,
            deliveryData.pickup_lng || null,
            deliveryData.delivery_address,
            deliveryData.delivery_lat || null,
            deliveryData.delivery_lng || null,
            deliveryData.estimated_distance || null,
            deliveryData.delivery_fee,
            deliveryData.delivery_instructions || null,
            deliveryData.estimated_delivery_time || null,
            trackingNumber,
            qrCodePickup,
            qrCodeDelivery,
          ],
          type: sequelize.QueryTypes.INSERT,
        }
      );

      return this.findById(id);
    } catch (error) {
      logger.error("Error creating delivery:", error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [results] = await sequelize.query(
        "SELECT * FROM deliveries WHERE id = ?",
        {
          replacements: [id],
          type: sequelize.QueryTypes.SELECT,
        }
      );

      return results || null;
    } catch (error) {
      logger.error("Error finding delivery by ID:", error);
      throw error;
    }
  }

  static async findByOrder(orderId) {
    try {
      const [results] = await sequelize.query(
        "SELECT * FROM deliveries WHERE order_id = ?",
        {
          replacements: [orderId],
          type: sequelize.QueryTypes.SELECT,
        }
      );

      return results || null;
    } catch (error) {
      logger.error("Error finding delivery by order ID:", error);
      throw error;
    }
  }

  static async findByTrackingNumber(trackingNumber) {
    try {
      const [results] = await sequelize.query(
        "SELECT * FROM deliveries WHERE tracking_number = ?",
        {
          replacements: [trackingNumber],
          type: sequelize.QueryTypes.SELECT,
        }
      );

      return results || null;
    } catch (error) {
      logger.error("Error finding delivery by tracking number:", error);
      throw error;
    }
  }

  static async findByDriverId(driverId) {
    try {
      return await sequelize.query(
        `
        SELECT * FROM deliveries 
        WHERE driver_id = ? 
        ORDER BY created_at DESC
      `,
        {
          replacements: [driverId],
          type: sequelize.QueryTypes.SELECT,
        }
      );
    } catch (error) {
      logger.error("Error finding deliveries by driver ID:", error);
      throw error;
    }
  }

  static async findCurrentByDriverId(driverId) {
    try {
      const [results] = await sequelize.query(
        `
        SELECT * FROM deliveries 
        WHERE driver_id = ? AND status IN ('assigned', 'picked_up', 'in_transit')
        ORDER BY created_at DESC 
        LIMIT 1
      `,
        {
          replacements: [driverId],
          type: sequelize.QueryTypes.SELECT,
        }
      );

      return results || null;
    } catch (error) {
      logger.error("Error finding current delivery by driver ID:", error);
      throw error;
    }
  }

  static async findAvailableByDriverId(driverId) {
    try {
      return await sequelize.query(
        `
        SELECT * FROM deliveries 
        WHERE status = 'pending' 
        ORDER BY created_at ASC 
        LIMIT 20
      `,
        {
          type: sequelize.QueryTypes.SELECT,
        }
      );
    } catch (error) {
      logger.error("Error finding available deliveries:", error);
      throw error;
    }
  }

  static async findByDriver(driverId, limit = 50, offset = 0, status = null) {
    try {
      let sql = `
        SELECT * FROM deliveries 
        WHERE driver_id = ?
      `;
      let replacements = [driverId];

      if (status) {
        sql += " AND status = ?";
        replacements.push(status);
      }

      sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
      replacements.push(limit, offset);

      return await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      logger.error("Error finding deliveries by driver:", error);
      throw error;
    }
  }

  static async findPendingDeliveries(limit = 50) {
    try {
      return await sequelize.query(
        `
        SELECT * FROM deliveries 
        WHERE status = 'pending' 
        ORDER BY created_at ASC 
        LIMIT ?
      `,
        {
          replacements: [limit],
          type: sequelize.QueryTypes.SELECT,
        }
      );
    } catch (error) {
      logger.error("Error finding pending deliveries:", error);
      throw error;
    }
  }

  static async assignDriver(id, driverId) {
    try {
      const [result] = await sequelize.query(
        `
        UPDATE deliveries 
        SET driver_id = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND status = 'pending'
      `,
        {
          replacements: [driverId, id],
          type: sequelize.QueryTypes.UPDATE,
        }
      );

      if (result.affectedRows > 0) {
        return this.findById(id);
      }
      return null;
    } catch (error) {
      logger.error("Error assigning driver to delivery:", error);
      throw error;
    }
  }

  static async updateStatus(id, status, additionalData = {}) {
    try {
      let sql =
        "UPDATE deliveries SET status = ?, updated_at = CURRENT_TIMESTAMP";
      let replacements = [status];

      if (status === "picked_up" && !additionalData.pickup_time) {
        sql += ", pickup_time = CURRENT_TIMESTAMP";
      } else if (additionalData.pickup_time) {
        sql += ", pickup_time = ?";
        replacements.push(additionalData.pickup_time);
      }

      if (status === "delivered" && !additionalData.delivery_time) {
        sql += ", delivery_time = CURRENT_TIMESTAMP";
      } else if (additionalData.delivery_time) {
        sql += ", delivery_time = ?";
        replacements.push(additionalData.delivery_time);
      }

      if (additionalData.actual_distance) {
        sql += ", actual_distance = ?";
        replacements.push(additionalData.actual_distance);
      }

      if (additionalData.driver_notes) {
        sql += ", driver_notes = ?";
        replacements.push(additionalData.driver_notes);
      }

      // Calculate delivery time if delivered
      if (status === "delivered") {
        sql +=
          ", delivery_time_minutes = TIMESTAMPDIFF(MINUTE, pickup_time, delivery_time)";
      }

      sql += " WHERE id = ?";
      replacements.push(id);

      await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.UPDATE,
      });

      return this.findById(id);
    } catch (error) {
      logger.error("Error updating delivery status:", error);
      throw error;
    }
  }

  static async addRating(id, rating, feedback = null) {
    try {
      await sequelize.query(
        `
        UPDATE deliveries 
        SET customer_rating = ?, customer_feedback = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `,
        {
          replacements: [rating, feedback, id],
          type: sequelize.QueryTypes.UPDATE,
        }
      );

      return this.findById(id);
    } catch (error) {
      logger.error("Error adding delivery rating:", error);
      throw error;
    }
  }

  static async getDeliveryStats(
    driverId = null,
    startDate = null,
    endDate = null
  ) {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_deliveries,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_deliveries,
          AVG(delivery_time_minutes) as avg_delivery_time,
          AVG(customer_rating) as avg_rating,
          SUM(delivery_fee) as total_delivery_fees
        FROM deliveries 
        WHERE 1=1
      `;
      let replacements = [];

      if (driverId) {
        sql += " AND driver_id = ?";
        replacements.push(driverId);
      }

      if (startDate) {
        sql += " AND created_at >= ?";
        replacements.push(startDate);
      }

      if (endDate) {
        sql += " AND created_at <= ?";
        replacements.push(endDate);
      }

      const [results] = await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      return results;
    } catch (error) {
      logger.error("Error getting delivery stats:", error);
      throw error;
    }
  }

  static async getOptimizedRoute(deliveryIds, driverId) {
    try {
      // This would typically integrate with a routing service
      // For now, return a basic route structure
      const deliveries = await sequelize.query(
        `
        SELECT id, pickup_lat, pickup_lng, delivery_lat, delivery_lng, delivery_address
        FROM deliveries 
        WHERE id IN (${deliveryIds.map(() => "?").join(",")})
        ORDER BY created_at ASC
      `,
        {
          replacements: deliveryIds,
          type: sequelize.QueryTypes.SELECT,
        }
      );

      return {
        route: deliveries,
        total_distance: 0, // Would be calculated by routing service
        estimated_duration: deliveries.length * 30, // 30 minutes per delivery estimate
        waypoints: deliveries.map((d) => ({
          lat: d.pickup_lat,
          lng: d.pickup_lng,
          address: d.delivery_address,
        })),
      };
    } catch (error) {
      logger.error("Error getting optimized route:", error);
      throw error;
    }
  }

  static async validateQRCode(deliveryId, qrCode, type) {
    try {
      const field = type === "pickup" ? "qr_code_pickup" : "qr_code_delivery";
      const results = await sequelize.query(
        `
        SELECT id FROM deliveries WHERE id = ? AND ${field} = ?
      `,
        {
          replacements: [deliveryId, qrCode],
          type: sequelize.QueryTypes.SELECT,
        }
      );

      return results.length > 0;
    } catch (error) {
      logger.error("Error validating QR code:", error);
      throw error;
    }
  }

  static generateTrackingNumber() {
    return (
      "TRK" +
      Date.now().toString().slice(-8) +
      Math.random().toString(36).substring(2, 5).toUpperCase()
    );
  }

  static generateQRCode() {
    return "QR" + Math.random().toString(36).substring(2, 15).toUpperCase();
  }
}

module.exports = Delivery;
