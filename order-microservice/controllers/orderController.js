const Order = require("../models/orderModel");

exports.createOrder = async (req, res) => {
  const { user_id, item_name, quantity } = req.body;

  if (
    typeof user_id !== "number" ||
    typeof item_name !== "string" ||
    typeof quantity !== "number"
  ) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const newOrder = {
      user_id,
      item_name,
      quantity,
      status: "pending",
    };
    const result = await Order.create(newOrder);
    res
      .status(201)
      .json({ message: "Order created", orderId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.getAll();
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

exports.getOrderById = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  try {
    const order = await Order.getById(id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};
