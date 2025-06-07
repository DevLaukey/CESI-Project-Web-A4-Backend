const database = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class Payment {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL UNIQUE,
        customer_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_method ENUM('credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay') NOT NULL,
        payment_status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
        gateway_transaction_id VARCHAR(100),
        gateway_reference VARCHAR(100),
        card_last_four VARCHAR(4),
        card_brand VARCHAR(20),
        processing_fee DECIMAL(8,2) DEFAULT 0.00,
        refund_amount DECIMAL(10,2) DEFAULT 0.00,
        failure_reason TEXT,
        gateway_response JSON,
        metadata JSON,
        processed_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order (order_id),
        INDEX idx_customer (customer_id),
        INDEX idx_status (payment_status),
        INDEX idx_gateway_transaction (gateway_transaction_id),
        INDEX idx_created_at (created_at)
      )
    `;
    await database.query(sql);
  }

  static async create(paymentData) {
    const id = uuidv4();
    const sql = `
      INSERT INTO payments (
        id, order_id, customer_id, amount, currency, payment_method,
        card_last_four, card_brand, processing_fee, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      paymentData.order_id,
      paymentData.customer_id,
      paymentData.amount,
      paymentData.currency || "USD",
      paymentData.payment_method,
      paymentData.card_last_four || null,
      paymentData.card_brand || null,
      paymentData.processing_fee || 0,
      JSON.stringify(paymentData.metadata || {}),
    ];

    await database.query(sql, params);
    return this.findById(id);
  }

  static async findById(id) {
    const sql = "SELECT * FROM payments WHERE id = ?";
    const results = await database.query(sql, [id]);
    const payment = results[0];
    if (payment) {
      payment.gateway_response = payment.gateway_response
        ? JSON.parse(payment.gateway_response)
        : null;
      payment.metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
    }
    return payment || null;
  }

  static async findByOrder(orderId) {
    const sql = "SELECT * FROM payments WHERE order_id = ?";
    const results = await database.query(sql, [orderId]);
    const payment = results[0];
    if (payment) {
      payment.gateway_response = payment.gateway_response
        ? JSON.parse(payment.gateway_response)
        : null;
      payment.metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
    }
    return payment || null;
  }

  static async findByCustomer(customerId, limit = 50, offset = 0) {
    const sql = `
      SELECT * FROM payments 
      WHERE customer_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const results = await database.query(sql, [customerId, limit, offset]);
    return results.map((payment) => {
      payment.gateway_response = payment.gateway_response
        ? JSON.parse(payment.gateway_response)
        : null;
      payment.metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
      return payment;
    });
  }

  static async updateStatus(id, status, additionalData = {}) {
    let sql =
      "UPDATE payments SET payment_status = ?, updated_at = CURRENT_TIMESTAMP";
    let params = [status];

    if (additionalData.gateway_transaction_id) {
      sql += ", gateway_transaction_id = ?";
      params.push(additionalData.gateway_transaction_id);
    }

    if (additionalData.gateway_reference) {
      sql += ", gateway_reference = ?";
      params.push(additionalData.gateway_reference);
    }

    if (additionalData.gateway_response) {
      sql += ", gateway_response = ?";
      params.push(JSON.stringify(additionalData.gateway_response));
    }

    if (additionalData.failure_reason) {
      sql += ", failure_reason = ?";
      params.push(additionalData.failure_reason);
    }

    if (additionalData.processed_at) {
      sql += ", processed_at = ?";
      params.push(additionalData.processed_at);
    }

    if (status === "completed" && !additionalData.processed_at) {
      sql += ", processed_at = CURRENT_TIMESTAMP";
    }

    sql += " WHERE id = ?";
    params.push(id);

    await database.query(sql, params);
    return this.findById(id);
  }

  static async addRefund(id, refundAmount, reason = null) {
    const sql = `
      UPDATE payments 
      SET refund_amount = refund_amount + ?, 
          payment_status = CASE 
            WHEN refund_amount + ? >= amount THEN 'refunded'
            ELSE payment_status 
          END,
          failure_reason = COALESCE(failure_reason, ?),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await database.query(sql, [refundAmount, refundAmount, reason, id]);
    return this.findById(id);
  }

  static async getPaymentStats(
    startDate = null,
    endDate = null,
    customerId = null
  ) {
    let sql = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_amount,
        SUM(processing_fee) as total_fees,
        SUM(refund_amount) as total_refunds,
        COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_payments,
        COUNT(CASE WHEN payment_status = 'refunded' THEN 1 END) as refunded_payments,
        AVG(amount) as average_transaction_amount
      FROM payments 
      WHERE 1=1
    `;
    let params = [];

    if (customerId) {
      sql += " AND customer_id = ?";
      params.push(customerId);
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

  static async getRevenueByPeriod(period = "day", limit = 30) {
    const dateFormat =
      period === "day"
        ? "%Y-%m-%d"
        : period === "week"
        ? "%Y-%u"
        : period === "month"
        ? "%Y-%m"
        : "%Y";

    const sql = `
      SELECT 
        DATE_FORMAT(created_at, ?) as period,
        COUNT(*) as transaction_count,
        SUM(amount) as total_revenue,
        SUM(processing_fee) as total_fees,
        COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as successful_count
      FROM payments 
      WHERE payment_status = 'completed'
      GROUP BY DATE_FORMAT(created_at, ?)
      ORDER BY period DESC
      LIMIT ?
    `;

    return await database.query(sql, [dateFormat, dateFormat, limit]);
  }
}

module.exports = Payment;
