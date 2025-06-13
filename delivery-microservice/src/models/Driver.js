const database = require("../config/database");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

class Driver {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS drivers (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL UNIQUE,
        license_number VARCHAR(50) NOT NULL UNIQUE,
        vehicle_type ENUM('bike', 'scooter', 'car', 'truck') NOT NULL,
        vehicle_make VARCHAR(50),
        vehicle_model VARCHAR(50),
        vehicle_year INT,
        vehicle_color VARCHAR(30),
        license_plate VARCHAR(20) NOT NULL,
        insurance_number VARCHAR(100),
        phone_number VARCHAR(20) NOT NULL,
        is_available BOOLEAN DEFAULT FALSE,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        current_lat DECIMAL(10, 8),
        current_lng DECIMAL(11, 8),
        last_location_update TIMESTAMP,
        rating DECIMAL(3,2) DEFAULT 5.00,
        total_deliveries INT DEFAULT 0,
        total_earnings DECIMAL(10,2) DEFAULT 0.00,
        referral_code VARCHAR(20) UNIQUE,
        referred_by VARCHAR(36),
        background_check_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        documents JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_available (is_available, is_verified, is_active),
        INDEX idx_location (current_lat, current_lng),
        INDEX idx_referral (referral_code),
        INDEX idx_referred_by (referred_by)
      )
    `;
    await database.query(sql);
  }

  static async create(driverData) {
    const id = uuidv4();
    const referralCode = this.generateReferralCode();

    const sql = `
      INSERT INTO drivers (
        id, user_id, license_number, vehicle_type, vehicle_make,
        vehicle_model, vehicle_year, vehicle_color, license_plate,
        insurance_number, phone_number, referral_code, referred_by, documents
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      driverData.user_id,
      driverData.license_number,
      driverData.vehicle_type,
      driverData.vehicle_make || null,
      driverData.vehicle_model || null,
      driverData.vehicle_year || null,
      driverData.vehicle_color || null,
      driverData.license_plate,
      driverData.insurance_number || null,
      driverData.phone_number,
      referralCode,
      driverData.referred_by || null,
      JSON.stringify(driverData.documents || {}),
    ];

    await database.query(sql, params);
    return this.findById(id);
  }

  static async findById(id) {
    const sql = "SELECT * FROM drivers WHERE id = ?";
    const results = await database.query(sql, [id]);
    const driver = results[0];
    if (driver && driver.documents) {
      driver.documents = JSON.parse(driver.documents);
    }
    return driver || null;
  }

  static async findByUserId(userId) {
    const sql = "SELECT * FROM drivers WHERE user_id = ?";
    const results = await database.query(sql, [userId]);
    const driver = results[0];
    if (driver && driver.documents) {
      driver.documents = JSON.parse(driver.documents);
    }
    return driver || null;
  }

  static async findAvailableDrivers(lat, lng, maxDistance = 10) {
    const sql = `
      SELECT *, 
        (6371 * acos(cos(radians(?)) * cos(radians(current_lat)) * 
        cos(radians(current_lng) - radians(?)) + sin(radians(?)) * 
        sin(radians(current_lat)))) AS distance
      FROM drivers 
      WHERE is_available = TRUE 
        AND is_verified = TRUE 
        AND is_active = TRUE
        AND current_lat IS NOT NULL 
        AND current_lng IS NOT NULL
      HAVING distance <= ?
      ORDER BY distance ASC
      LIMIT 20
    `;
    return await database.query(sql, [lat, lng, lat, maxDistance]);
  }

  static async updateLocation(id, lat, lng) {
    const sql = `
      UPDATE drivers 
      SET current_lat = ?, current_lng = ?, last_location_update = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await database.query(sql, [lat, lng, id]);
    return this.findById(id);
  }

  static async updateAvailability(id, isAvailable) {
    const sql = `
      UPDATE drivers 
      SET is_available = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    await database.query(sql, [isAvailable, id]);
    return this.findById(id);
  }

  static async updateRating(id, newRating) {
    const sql = `
      UPDATE drivers 
      SET rating = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    await database.query(sql, [newRating, id]);
    return this.findById(id);
  }

  static async incrementDeliveries(id, earnings = 0) {
    const sql = `
      UPDATE drivers 
      SET total_deliveries = total_deliveries + 1,
          total_earnings = total_earnings + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await database.query(sql, [earnings, id]);
    return this.findById(id);
  }

  static async getDriverStats(driverId, startDate = null, endDate = null) {
    let sql = `
      SELECT 
        COUNT(*) as total_deliveries,
        SUM(delivery_fee) as total_earnings,
        AVG(delivery_time_minutes) as avg_delivery_time,
        AVG(customer_rating) as avg_rating
      FROM deliveries 
      WHERE driver_id = ? AND status = 'delivered'
    `;
    let params = [driverId];

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

  static generateReferralCode() {
    return "DRV" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  static async findByReferralCode(referralCode) {
    const sql = "SELECT * FROM drivers WHERE referral_code = ?";
    const results = await database.query(sql, [referralCode]);
    return results[0] || null;
  }
}

module.exports = Driver;
