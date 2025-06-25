// orderController.js
const Order = require("../models/Order");

exports.createOrder = async (req, res) => {
  const { restaurant_id, payment_id, delivery_address, items } = req.body;
  const uuid = req.user.uuid;

  if (!restaurant_id || !delivery_address || !items) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items must be a non-empty array" });
  }

  // Validate each item has item_id, quantity (number), price (number):
  const missingPrice = items.some(
    (item) =>
      !item.item_id ||
      typeof item.quantity !== "number" ||
      typeof item.price !== "number"
  );
  if (missingPrice) {
    return res
      .status(400)
      .json({ error: "Each item must include item_id, quantity, and price" });
  }

  try {
    // Only check uniqueness if payment_id provided and non-empty:
    if (payment_id) {
      const existing = await Order.findOne({ where: { payment_id } });
      if (existing) {
        return res
          .status(409)
          .json({ error: "Order already exists for this payment" });
      }
    }
    // Create order. If payment_id is omitted or null, it will be null in DB.
    const newOrder = await Order.create({
      uuid,
      restaurant_id,
      payment_id: payment_id || null,
      delivery_address,
      items,
      // status defaults to "pending" per model
    });

    res.status(201).json({ orderId: newOrder.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.findAll();
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
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

exports.getMyOrders = async (req, res) => {
  const uuid = req.user.uuid;

  try {
    const orders = await Order.findAll({ where: { uuid } });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your orders" });
  }
};

exports.getOrdersByRestaurantId = async (req, res) => {
  const restaurantId = req.params.restaurantId;
  // assuming restaurant_id is string in model; if numeric, parseInt:
  // const restaurantIdNum = parseInt(req.params.restaurantId);
  // if (isNaN(restaurantIdNum)) return res.status(400).json({ error: "Invalid restaurant ID" });
  try {
    const orders = await Order.findAll({
      where: { restaurant_id: restaurantId },
    });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch restaurant orders" });
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
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = status;
    await order.save();

    res.json({ message: "Status updated", orderId: id, newStatus: status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
};

/**
 * New: update payment_id + status when payment completes.
 * PATCH /orders/:id/payment
 * Body: { payment_id: string, status: "confirmed" or "cancelled" }
 */
exports.updatePayment = async (req, res) => {
  const { id } = req.params;
  const { payment_id, status } = req.body;
  if (!payment_id) {
    return res.status(400).json({ error: "payment_id is required" });
  }
  // Only allow setting status to confirmed or cancelled here:
  const allowed = ["confirmed", "cancelled"];
  if (!allowed.includes(status)) {
    return res
      .status(400)
      .json({ error: `Invalid status; must be one of: ${allowed.join(", ")}` });
  }

  try {
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // If this order already has a non-null payment_id and status beyond pending,
    // you may decide whether to allow re-update. For simplicity, disallow if already confirmed/cancelled:
    if (order.payment_id) {
      // If same payment_id and already same status, just return OK:
      if (order.payment_id === payment_id && order.status === status) {
        return res.json({
          message: "No change; same payment/status",
          orderId: id,
        });
      }
      // Otherwise, if different payment_id or status, you may block or allow based on business rules.
      // Here: disallow if already confirmed or cancelled:
      if (
        [
          "confirmed",
          "cancelled",
          "preparing",
          "out_for_delivery",
          "delivered",
        ].includes(order.status)
      ) {
        return res
          .status(409)
          .json({ error: "Order already processed with a payment" });
      }
    }

    // Check uniqueness of payment_id across orders:
    const existing = await Order.findOne({ where: { payment_id } });
    if (existing && existing.id !== order.id) {
      return res
        .status(409)
        .json({ error: "This payment_id is already used by another order" });
    }

    // Update:
    order.payment_id = payment_id;
    order.status = status;
    await order.save();

    res.json({
      message: "Payment and status updated",
      orderId: id,
      payment_id,
      newStatus: status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update payment/status" });
  }
};
