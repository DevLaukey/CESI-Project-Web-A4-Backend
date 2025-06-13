const database = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");

class PaymentMethod {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS payment_methods (
        id VARCHAR(36) PRIMARY KEY,
        customer_id VARCHAR(36) NOT NULL,
        type ENUM('credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay') NOT NULL,
        card_last_four VARCHAR(4),
        card_brand VARCHAR(20),
        card_exp_month INT,
        card_exp_year INT,
        card_holder_name VARCHAR(100),
        billing_address JSON,
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        gateway_token_hash VARCHAR(255), -- Encrypted token from gateway
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_customer (customer_id),
        INDEX idx_default (customer_id, is_default)
      )
    `;
    await database.query(sql);
  }

  static async create(methodData) {
    const id = uuidv4();

    // If this is set as default, unset others
    if (methodData.is_default) {
      await this.unsetDefaultForCustomer(methodData.customer_id);
    }

    // Hash the gateway token for security
    const gatewayTokenHash = methodData.gateway_token
      ? await bcrypt.hash(methodData.gateway_token, 10)
      : null;

    const sql = `
      INSERT INTO payment_methods (
        id, customer_id, type, card_last_four, card_brand,
        card_exp_month, card_exp_year, card_holder_name,
        billing_address, is_default, gateway_token_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      methodData.customer_id,
      methodData.type,
      methodData.card_last_four || null,
      methodData.card_brand || null,
      methodData.card_exp_month || null,
      methodData.card_exp_year || null,
      methodData.card_holder_name || null,
      JSON.stringify(methodData.billing_address || {}),
      methodData.is_default || false,
      gatewayTokenHash,
    ];

    await database.query(sql, params);
    return this.findById(id);
  }

  static async findById(id) {
    const sql =
      "SELECT * FROM payment_methods WHERE id = ? AND is_active = TRUE";
    const results = await database.query(sql, [id]);
    const method = results[0];
    if (method && method.billing_address) {
      method.billing_address = JSON.parse(method.billing_address);
      delete method.gateway_token_hash; // Never expose this
    }
    return method || null;
  }

  static async findByCustomer(customerId) {
    const sql = `
      SELECT * FROM payment_methods 
      WHERE customer_id = ? AND is_active = TRUE 
      ORDER BY is_default DESC, created_at DESC
    `;
    const results = await database.query(sql, [customerId]);
    return results.map((method) => {
      if (method.billing_address) {
        method.billing_address = JSON.parse(method.billing_address);
      }
      delete method.gateway_token_hash; // Never expose this
      return method;
    });
  }

  static async getDefault(customerId) {
    const sql = `
      SELECT * FROM payment_methods 
      WHERE customer_id = ? AND is_default = TRUE AND is_active = TRUE
    `;
    const results = await database.query(sql, [customerId]);
    const method = results[0];
    if (method && method.billing_address) {
      method.billing_address = JSON.parse(method.billing_address);
      delete method.gateway_token_hash;
    }
    return method || null;
  }

  static async setDefault(id, customerId) {
    // First unset all defaults for this customer
    await this.unsetDefaultForCustomer(customerId);

    // Set this one as default
    const sql = `
      UPDATE payment_methods 
      SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND customer_id = ?
    `;
    await database.query(sql, [id, customerId]);
    return this.findById(id);
  }

  static async unsetDefaultForCustomer(customerId) {
    const sql = `
      UPDATE payment_methods 
      SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP 
      WHERE customer_id = ?
    `;
    await database.query(sql, [customerId]);
  }

  static async deactivate(id, customerId) {
    const sql = `
      UPDATE payment_methods 
      SET is_active = FALSE, is_default = FALSE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND customer_id = ?
    `;
    const result = await database.query(sql, [id, customerId]);
    return result.affectedRows > 0;
  }
}

module.exports = PaymentMethod;
