const db = require("./db");

const Order = {
  create: async ({ user_id, item_name, quantity, status }) => {
    const [result] = await db.execute(
      "INSERT INTO orders (user_id, item_name, quantity, status) VALUES (?, ?, ?, ?)",
      [user_id, item_name, quantity, status]
    );
    return result;
  },

  getAll: async () => {
    const [rows] = await db.execute("SELECT * FROM orders");
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.execute("SELECT * FROM orders WHERE id = ?", [id]);
    return rows[0];
  },
};

module.exports = Order;
