const database = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class Order {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(36) PRIMARY KEY,
        customer_id VARCHAR(36) NOT NULL,
        restaurant_id VARCHAR(36) NOT NULL,
        status ENUM('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled') DEFAULT 'pending',
        total_amount DECIMAL(10,2) NOT NULL,
        delivery_address TEXT NOT NULL,
        delivery_instructions TEXT,
        payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
        payment_method VARCHAR(50),
        delivery_fee DECIMAL(8,2) DEFAULT 0.00,
        tax_amount DECIMAL(8,2) DEFAULT 0.00,
        discount_amount DECIMAL(8,2) DEFAULT 0.00,
        estimated_delivery_time DATETIME,
        actual_delivery_time DATETIME,
        driver_id VARCHAR(36),
        special_instructions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_customer (customer_id),
        INDEX idx_restaurant (restaurant_id),
        INDEX idx_driver (driver_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `;
    await database.query(sql);
  }

  static async create(orderData) {
    const id = uuidv4();
    const sql = `
      INSERT INTO orders (
        id, customer_id, restaurant_id, total_amount, delivery_address,
        delivery_instructions, delivery_fee, tax_amount, discount_amount,
        estimated_delivery_time, special_instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      orderData.customer_id,
      orderData.restaurant_id,
      orderData.total_amount,
      orderData.delivery_address,
      orderData.delivery_instructions || null,
      orderData.delivery_fee || 0,
      orderData.tax_amount || 0,
      orderData.discount_amount || 0,
      orderData.estimated_delivery_time || null,
      orderData.special_instructions || null,
    ];

    await database.query(sql, params);
    return this.findById(id);
  }

  static async findById(id) {
    const sql = "SELECT * FROM orders WHERE id = ?";
    const results = await database.query(sql, [id]);
    return results[0] || null;
  }

  static async findByCustomer(customerId, limit = 50, offset = 0) {
    const sql = `
      SELECT * FROM orders 
      WHERE customer_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    return await database.query(sql, [customerId, limit, offset]);
  }

  static async findByRestaurant(restaurantId, limit = 50, offset = 0) {
    const sql = `
      SELECT * FROM orders 
      WHERE restaurant_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    return await database.query(sql, [restaurantId, limit, offset]);
  }

  static async findByDriver(driverId, limit = 50, offset = 0) {
    const sql = `
      SELECT * FROM orders 
      WHERE driver_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    return await database.query(sql, [driverId, limit, offset]);
  }

  static async updateStatus(id, status, additionalData = {}) {
    let sql = "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP";
    let params = [status];

    if (additionalData.driver_id) {
      sql += ", driver_id = ?";
      params.push(additionalData.driver_id);
    }

    if (additionalData.actual_delivery_time) {
      sql += ", actual_delivery_time = ?";
      params.push(additionalData.actual_delivery_time);
    }

    sql += " WHERE id = ?";
    params.push(id);

    await database.query(sql, params);
    return this.findById(id);
  }

  static async updatePaymentStatus(id, paymentStatus, paymentMethod = null) {
    const sql = `
      UPDATE orders 
      SET payment_status = ?, payment_method = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    await database.query(sql, [paymentStatus, paymentMethod, id]);
    return this.findById(id);
  }

  static async getOrderStats(
    restaurantId = null,
    startDate = null,
    endDate = null
  ) {
    let sql = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
      FROM orders 
      WHERE 1=1
    `;
    let params = [];

    if (restaurantId) {
      sql += " AND restaurant_id = ?";
      params.push(restaurantId);
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

  static async delete(id) {
    const sql = "DELETE FROM orders WHERE id = ?";
    const result = await database.query(sql, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Order;
