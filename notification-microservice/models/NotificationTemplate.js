const database = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class NotificationTemplate {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS notification_templates (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        type ENUM('order', 'delivery', 'payment', 'referral', 'promotion', 'system', 'custom') NOT NULL,
        title_template VARCHAR(255) NOT NULL,
        message_template TEXT NOT NULL,
        default_channels JSON,
        default_priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        variables JSON, -- Expected variables for this template
        metadata JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_active (is_active)
      )
    `;
    await database.query(sql);
  }

  static async create(templateData) {
    const id = uuidv4();

    const sql = `
      INSERT INTO notification_templates (
        id, name, type, title_template, message_template,
        default_channels, default_priority, variables, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      templateData.name,
      templateData.type,
      templateData.title_template,
      templateData.message_template,
      JSON.stringify(templateData.default_channels || ["in_app", "push"]),
      templateData.default_priority || "medium",
      JSON.stringify(templateData.variables || []),
      JSON.stringify(templateData.metadata || {}),
    ];

    await database.query(sql, params);
    return this.findById(id);
  }

  static async findById(id) {
    const sql = "SELECT * FROM notification_templates WHERE id = ?";
    const results = await database.query(sql, [id]);
    const template = results[0];
    if (template) {
      template.default_channels = JSON.parse(template.default_channels || "[]");
      template.variables = JSON.parse(template.variables || "[]");
      template.metadata = JSON.parse(template.metadata || "{}");
    }
    return template || null;
  }

  static async findByName(name) {
    const sql =
      "SELECT * FROM notification_templates WHERE name = ? AND is_active = TRUE";
    const results = await database.query(sql, [name]);
    const template = results[0];
    if (template) {
      template.default_channels = JSON.parse(template.default_channels || "[]");
      template.variables = JSON.parse(template.variables || "[]");
      template.metadata = JSON.parse(template.metadata || "{}");
    }
    return template || null;
  }

  static async findByType(type) {
    const sql =
      "SELECT * FROM notification_templates WHERE type = ? AND is_active = TRUE ORDER BY name";
    const results = await database.query(sql, [type]);
    return results.map((template) => {
      template.default_channels = JSON.parse(template.default_channels || "[]");
      template.variables = JSON.parse(template.variables || "[]");
      template.metadata = JSON.parse(template.metadata || "{}");
      return template;
    });
  }

  static async renderTemplate(templateId, variables = {}) {
    const template = await this.findById(templateId);
    if (!template) return null;

    let title = template.title_template;
    let message = template.message_template;

    // Replace variables in template
    Object.keys(variables).forEach((key) => {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, "g"), variables[key]);
      message = message.replace(new RegExp(placeholder, "g"), variables[key]);
    });

    return {
      title,
      message,
      type: template.type,
      channels: template.default_channels,
      priority: template.default_priority,
      template_id: templateId,
    };
  }
}

module.exports = NotificationTemplate;
