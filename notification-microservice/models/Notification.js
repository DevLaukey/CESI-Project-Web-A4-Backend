const database = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class Notification {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        user_type ENUM('customer', 'driver', 'restaurant', 'admin') NOT NULL,
        type ENUM('order', 'delivery', 'payment', 'referral', 'promotion', 'system', 'custom') NOT NULL,
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSON,
        channels JSON, -- Which channels to send to (push, sms, in_app, socket)
        delivery_status JSON, -- Status for each channel
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        scheduled_for TIMESTAMP NULL,
        expires_at TIMESTAMP NULL,
        template_id VARCHAR(36),
        group_key VARCHAR(100), -- For grouping related notifications
        action_url VARCHAR(500),
        image_url VARCHAR(500),
        sound VARCHAR(50) DEFAULT 'default',
        badge_count INT DEFAULT 1,
        retry_count INT DEFAULT 0,
        max_retries INT DEFAULT 3,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_type (type),
        INDEX idx_priority (priority),
        INDEX idx_status (is_read),
        INDEX idx_scheduled (scheduled_for),
        INDEX idx_expires (expires_at),
        INDEX idx_group (group_key),
        INDEX idx_created_at (created_at)
      )
    `;
    await database.query(sql);
  }

  static async create(notificationData) {
    const id = uuidv4();

    const sql = `
      INSERT INTO notifications (
        id, user_id, user_type, type, priority, title, message,
        data, channels, delivery_status, scheduled_for, expires_at,
        template_id, group_key, action_url, image_url, sound, badge_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      notificationData.user_id,
      notificationData.user_type,
      notificationData.type,
      notificationData.priority || "medium",
      notificationData.title,
      notificationData.message,
      JSON.stringify(notificationData.data || {}),
      JSON.stringify(notificationData.channels || ["in_app", "push"]),
      JSON.stringify(notificationData.delivery_status || {}),
      notificationData.scheduled_for || null,
      notificationData.expires_at || null,
      notificationData.template_id || null,
      notificationData.group_key || null,
      notificationData.action_url || null,
      notificationData.image_url || null,
      notificationData.sound || "default",
      notificationData.badge_count || 1,
    ];

    await database.query(sql, params);
    return this.findById(id);
  }

  static async findById(id) {
    const sql = "SELECT * FROM notifications WHERE id = ?";
    const results = await database.query(sql, [id]);
    const notification = results[0];
    if (notification) {
      notification.data = JSON.parse(notification.data || "{}");
      notification.channels = JSON.parse(notification.channels || "[]");
      notification.delivery_status = JSON.parse(
        notification.delivery_status || "{}"
      );
    }
    return notification || null;
  }

  static async findByUser(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      type = null,
      is_read = null,
      priority = null,
      include_expired = false,
    } = options;

    let sql = "SELECT * FROM notifications WHERE user_id = ?";
    const params = [userId];

    if (type) {
      sql += " AND type = ?";
      params.push(type);
    }

    if (is_read !== null) {
      sql += " AND is_read = ?";
      params.push(is_read);
    }

    if (priority) {
      sql += " AND priority = ?";
      params.push(priority);
    }

    if (!include_expired) {
      sql += " AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)";
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const results = await database.query(sql, params);
    return results.map((notification) => {
      notification.data = JSON.parse(notification.data || "{}");
      notification.channels = JSON.parse(notification.channels || "[]");
      notification.delivery_status = JSON.parse(
        notification.delivery_status || "{}"
      );
      return notification;
    });
  }

  static async markAsRead(id, userId = null) {
    let sql =
      "UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ?";
    const params = [id];

    if (userId) {
      sql += " AND user_id = ?";
      params.push(userId);
    }

    const result = await database.query(sql, params);
    return result.affectedRows > 0;
  }

  static async markAllAsRead(userId, type = null) {
    let sql =
      "UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = FALSE";
    const params = [userId];

    if (type) {
      sql += " AND type = ?";
      params.push(type);
    }

    const result = await database.query(sql, params);
    return result.affectedRows;
  }

  static async updateDeliveryStatus(id, channel, status, error = null) {
    const notification = await this.findById(id);
    if (!notification) return false;

    const deliveryStatus = notification.delivery_status || {};
    deliveryStatus[channel] = {
      status: status, // 'pending', 'sent', 'delivered', 'failed'
      timestamp: new Date().toISOString(),
      error: error,
    };

    const sql = `
      UPDATE notifications 
      SET delivery_status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    await database.query(sql, [JSON.stringify(deliveryStatus), id]);
    return true;
  }

  static async incrementRetry(id) {
    const sql = `
      UPDATE notifications 
      SET retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    const result = await database.query(sql, [id]);
    return result.affectedRows > 0;
  }

  static async getScheduledNotifications() {
    const sql = `
      SELECT * FROM notifications 
      WHERE scheduled_for IS NOT NULL 
        AND scheduled_for <= CURRENT_TIMESTAMP 
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        AND JSON_EXTRACT(delivery_status, '$.scheduled') IS NULL
      ORDER BY scheduled_for ASC
      LIMIT 100
    `;

    const results = await database.query(sql);
    return results.map((notification) => {
      notification.data = JSON.parse(notification.data || "{}");
      notification.channels = JSON.parse(notification.channels || "[]");
      notification.delivery_status = JSON.parse(
        notification.delivery_status || "{}"
      );
      return notification;
    });
  }

  static async getFailedNotifications() {
    const sql = `
      SELECT * FROM notifications 
      WHERE retry_count < max_retries
        AND JSON_EXTRACT(delivery_status, '$') LIKE '%"failed"%'
        AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY created_at ASC
      LIMIT 100
    `;

    const results = await database.query(sql);
    return results.map((notification) => {
      notification.data = JSON.parse(notification.data || "{}");
      notification.channels = JSON.parse(notification.channels || "[]");
      notification.delivery_status = JSON.parse(
        notification.delivery_status || "{}"
      );
      return notification;
    });
  }

  static async getUnreadCount(userId, type = null) {
    let sql =
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE";
    const params = [userId];

    if (type) {
      sql += " AND type = ?";
      params.push(type);
    }

    sql += " AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)";

    const results = await database.query(sql, params);
    return results[0].count;
  }

  static async deleteOldNotifications(days = 30) {
    const sql = `
      DELETE FROM notifications 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        AND is_read = TRUE
    `;
    const result = await database.query(sql, [days]);
    return result.affectedRows;
  }

  static async getNotificationStats(startDate = null, endDate = null) {
    let sql = `
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN is_read = TRUE THEN 1 END) as read_notifications,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_notifications,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_notifications,
        AVG(CASE WHEN is_read = TRUE THEN TIMESTAMPDIFF(MINUTE, created_at, read_at) END) as avg_read_time_minutes
      FROM notifications 
      WHERE 1=1
    `;
    let params = [];

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
}

module.exports = Notification;
