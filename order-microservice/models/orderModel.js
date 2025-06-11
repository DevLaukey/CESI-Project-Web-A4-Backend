const db = require("../config/db");

class Order {
  static async create({
    user_id,
    restaurant_id,
    payment_id,
    delivery_address,
    items,
  }) {
    const [existing] = await db.execute(
      "SELECT id FROM orders WHERE payment_id = ?",
      [payment_id]
    );
    if (existing.length > 0)
      throw new Error("Order already exists for this payment");

    const [result] = await db.execute(
      `INSERT INTO orders (user_id, restaurant_id, payment_id, delivery_address, items, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [
        user_id,
        restaurant_id,
        payment_id,
        delivery_address,
        JSON.stringify(items),
      ]
    );

    return { insertId: result.insertId };
  }

  static async getAll() {
    const [rows] = await db.execute("SELECT * FROM orders");
    return rows.map((row) => ({ ...row, items: JSON.parse(row.items) }));
  }

  static async getById(id) {
    const [rows] = await db.execute("SELECT * FROM orders WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return { ...rows[0], items: JSON.parse(rows[0].items) };
  }

  static async updateStatus(id, status) {
    await db.execute("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
  }
}

module.exports = Order;
