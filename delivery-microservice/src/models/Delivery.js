const database = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class Delivery {
  static async createTable() {
    const sql = `
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
        qr_code_pickup TEXT,
        qr_code_delivery TEXT,
        customer_rating INT,
        customer_feedback TEXT,
        driver_notes TEXT,
        tracking_number VARCHAR(20) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES drivers(id),
        INDEX idx_order (order_id),
        INDEX idx_driver (driver_id),
        INDEX idx_status (status),
        INDEX idx_tracking (tracking_number),
        INDEX idx_created_at (created_at)
      )
    `;
    await database.query(sql);
  }

  static async create(deliveryData) {
    const id = uuidv4();
    const trackingNumber = this.generateTrackingNumber();
    const qrCodePickup = this.generateQRCode();
    const qrCodeDelivery = this.generateQRCode();

    const sql = `
      INSERT INTO deliveries (
        id, order_id, restaurant_id, customer_id, pickup_address,
        pickup_lat, pickup_lng, delivery_address, delivery_lat, delivery_lng,
        estimated_distance, delivery_fee, delivery_instructions, 
        estimated_delivery_time, tracking_number, qr_code_pickup, qr_code_delivery
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
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
    ];

    await database.query(sql, params);
    return this.findById(id);
  }

  static async findById(id) {
    const sql = "SELECT * FROM deliveries WHERE id = ?";
    const results = await database.query(sql, [id]);
    return results[0] || null;
  }

  static async findByOrder(orderId) {
    const sql = "SELECT * FROM deliveries WHERE order_id = ?";
    const results = await database.query(sql, [orderId]);
    return results[0] || null;
  }

  static async findByTrackingNumber(trackingNumber) {
    const sql = "SELECT * FROM deliveries WHERE tracking_number = ?";
    const results = await database.query(sql, [trackingNumber]);
    return results[0] || null;
  }

  static async findByDriver(driverId, limit = 50, offset = 0) {
    const sql = `
      SELECT * FROM deliveries 
      WHERE driver_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    return await database.query(sql, [driverId, limit, offset]);
  }

  static async findPendingDeliveries(limit = 50) {
    const sql = `
      SELECT * FROM deliveries 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT ?
    `;
    return await database.query(sql, [limit]);
  }

  static async assignDriver(id, driverId) {
    const sql = `
      UPDATE deliveries 
      SET driver_id = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND status = 'pending'
    `;
    const result = await database.query(sql, [driverId, id]);
    if (result.affectedRows > 0) {
      return this.findById(id);
    }
    return null;
  }

  static async updateStatus(id, status, additionalData = {}) {
    let sql =
      "UPDATE deliveries SET status = ?, updated_at = CURRENT_TIMESTAMP";
    let params = [status];

    if (status === "picked_up" && !additionalData.pickup_time) {
      sql += ", pickup_time = CURRENT_TIMESTAMP";
    } else if (additionalData.pickup_time) {
      sql += ", pickup_time = ?";
      params.push(additionalData.pickup_time);
    }

    if (status === "delivered" && !additionalData.delivery_time) {
      sql += ", delivery_time = CURRENT_TIMESTAMP";
    } else if (additionalData.delivery_time) {
      sql += ", delivery_time = ?";
      params.push(additionalData.delivery_time);
    }

    if (additionalData.actual_distance) {
      sql += ", actual_distance = ?";
      params.push(additionalData.actual_distance);
    }

    if (additionalData.driver_notes) {
      sql += ", driver_notes = ?";
      params.push(additionalData.driver_notes);
    }

    // Calculate delivery time if delivered
    if (status === "delivered") {
      sql +=
        ", delivery_time_minutes = TIMESTAMPDIFF(MINUTE, pickup_time, delivery_time)";
    }

    sql += " WHERE id = ?";
    params.push(id);

    await database.query(sql, params);
    return this.findById(id);
  }

  static async addRating(id, rating, feedback = null) {
    const sql = `
      UPDATE deliveries 
      SET customer_rating = ?, customer_feedback = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    await database.query(sql, [rating, feedback, id]);
    return this.findById(id);
  }

  static async getDeliveryStats(
    driverId = null,
    startDate = null,
    endDate = null
  ) {
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
    let params = [];

    if (driverId) {
      sql += " AND driver_id = ?";
      params.push(driverId);
    }

    if (startDate) {
      sql += " AND created_at >= ?";
      params.push(startDate);
    }

    if (endDate) {
      sql += " AND created_at <= ?";
      params.push(endDate);
    }

    const results = await database.query(sql, params);
    return results[0];
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

  static async validateQRCode(deliveryId, qrCode, type) {
    const field = type === "pickup" ? "qr_code_pickup" : "qr_code_delivery";
    const sql = `SELECT id FROM deliveries WHERE id = ? AND ${field} = ?`;
    const results = await database.query(sql, [deliveryId, qrCode]);
    return results.length > 0;
  }
}

module.exports = Delivery;
