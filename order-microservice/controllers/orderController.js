const Order = require("../models/orderModel");
const emitter = require("../utils/eventEmitter");

exports.createOrder = async (req, res) => {
  const { user_id, restaurant_id, payment_id, delivery_address, items } =
    req.body;

  if (
    !user_id ||
    !restaurant_id ||
    !payment_id ||
    !delivery_address ||
    !items
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { insertId } = await Order.create({
      user_id,
      restaurant_id,
      payment_id,
      delivery_address,
      items,
    });
    res.status(201).json({ orderId: insertId });

    emitter.emit("OrderCreated", { orderId: insertId, user_id, restaurant_id });
  } catch (err) {
    console.error(err);
    if (err.message.includes("already exists")) {
      return res.status(409).json({ error: err.message });
    }
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

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = [
    "pending",
    "confirmed",
    "preparing",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    await Order.updateStatus(id, status);
    res.json({ message: "Status updated" });

    emitter.emit("OrderStatusUpdated", { id, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
};
