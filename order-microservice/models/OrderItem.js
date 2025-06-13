const database = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class OrderItem {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        menu_item_id VARCHAR(36) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(8,2) NOT NULL,
        total_price DECIMAL(8,2) NOT NULL,
        customizations JSON,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        INDEX idx_order (order_id)
      )
    `;
    await database.query(sql);
  }

  static async create(itemData) {
    const id = uuidv4();
    const sql = `
      INSERT INTO order_items (
        id, order_id, menu_item_id, quantity, unit_price, 
        total_price, customizations, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      itemData.order_id,
      itemData.menu_item_id,
      itemData.quantity,
      itemData.unit_price,
      itemData.total_price,
      JSON.stringify(itemData.customizations || {}),
      itemData.notes || null,
    ];

    await database.query(sql, params);
    return this.findById(id);
  }

  static async findById(id) {
    const sql = "SELECT * FROM order_items WHERE id = ?";
    const results = await database.query(sql, [id]);
    const item = results[0];
    if (item && item.customizations) {
      item.customizations = JSON.parse(item.customizations);
    }
    return item || null;
  }

  static async findByOrder(orderId) {
    const sql =
      "SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at";
    const results = await database.query(sql, [orderId]);
    return results.map((item) => {
      if (item.customizations) {
        item.customizations = JSON.parse(item.customizations);
      }
      return item;
    });
  }

  static async createBulk(orderItems) {
    if (!orderItems.length) return [];

    const queries = orderItems.map((item) => ({
      sql: `
        INSERT INTO order_items (
          id, order_id, menu_item_id, quantity, unit_price, 
          total_price, customizations, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        uuidv4(),
        item.order_id,
        item.menu_item_id,
        item.quantity,
        item.unit_price,
        item.total_price,
        JSON.stringify(item.customizations || {}),
        item.notes || null,
      ],
    }));

    await database.transaction(queries);
    return this.findByOrder(orderItems[0].order_id);
  }

  static async deleteByOrder(orderId) {
    const sql = "DELETE FROM order_items WHERE order_id = ?";
    const result = await database.query(sql, [orderId]);
    return result.affectedRows;
  }
}

module.exports = OrderItem;
