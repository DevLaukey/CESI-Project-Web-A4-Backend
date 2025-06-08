const database = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class Device {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS devices (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        device_token VARCHAR(500) NOT NULL,
        device_type ENUM('ios', 'android', 'web') NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        app_version VARCHAR(50),
        os_version VARCHAR(50),
        device_name VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_device (user_id, device_id),
        INDEX idx_user (user_id),
        INDEX idx_token (device_token(255)),
        INDEX idx_active (is_active),
        INDEX idx_last_seen (last_seen)
      )
    `;
    await database.query(sql);
  }

  static async create(deviceData) {
    const id = uuidv4();

    // First try to update existing device
    const existingDevice = await this.findByUserAndDeviceId(
      deviceData.user_id,
      deviceData.device_id
    );
    if (existingDevice) {
      return await this.update(existingDevice.id, deviceData);
    }

    const sql = `
      INSERT INTO devices (
        id, user_id, device_token, device_type, device_id,
        app_version, os_version, device_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      deviceData.user_id,
      deviceData.device_token,
      deviceData.device_type,
      deviceData.device_id,
      deviceData.app_version || null,
      deviceData.os_version || null,
      deviceData.device_name || null,
    ];

    await database.query(sql, params);
    return this.findById(id);
  }

  static async findById(id) {
    const sql = "SELECT * FROM devices WHERE id = ?";
    const results = await database.query(sql, [id]);
    return results[0] || null;
  }

  static async findByUserAndDeviceId(userId, deviceId) {
    const sql = "SELECT * FROM devices WHERE user_id = ? AND device_id = ?";
    const results = await database.query(sql, [userId, deviceId]);
    return results[0] || null;
  }

  static async findByUser(userId, activeOnly = true) {
    let sql = "SELECT * FROM devices WHERE user_id = ?";
    const params = [userId];

    if (activeOnly) {
      sql += " AND is_active = TRUE";
    }

    sql += " ORDER BY last_seen DESC";

    return await database.query(sql, params);
  }

  static async update(id, updateData) {
    const sql = `
      UPDATE devices 
      SET device_token = ?, app_version = ?, os_version = ?, 
          device_name = ?, is_active = TRUE, last_seen = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      updateData.device_token,
      updateData.app_version || null,
      updateData.os_version || null,
      updateData.device_name || null,
      id,
    ];

    await database.query(sql, params);
    return this.findById(id);
  }

  static async updateLastSeen(deviceToken) {
    const sql = `
      UPDATE devices 
      SET last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE device_token = ?
    `;
    await database.query(sql, [deviceToken]);
  }

  static async deactivate(id) {
    const sql = `
      UPDATE devices 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    const result = await database.query(sql, [id]);
    return result.affectedRows > 0;
  }

  static async deactivateByToken(deviceToken) {
    const sql = `
      UPDATE devices 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
      WHERE device_token = ?
    `;
    const result = await database.query(sql, [deviceToken]);
    return result.affectedRows > 0;
  }

  static async cleanupInactiveDevices(days = 90) {
    const sql = `
      UPDATE devices 
      SET is_active = FALSE 
      WHERE last_seen < DATE_SUB(NOW(), INTERVAL ? DAY)
        AND is_active = TRUE
    `;
    const result = await database.query(sql, [days]);
    return result.affectedRows;
  }
}

module.exports = Device;
