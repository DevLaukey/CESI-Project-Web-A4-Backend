const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const logger = require("../utils/logger");
const {
  validateOrder,
  validateOrderUpdate,
} = require("../validators/orderValidator");
const externalServices = require("../services/externalServices");

class OrderController {
  // Create new order
  static async createOrder(req, res) {
    try {
      // Validate request data
      const { error, value } = validateOrder(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const { items, ...orderData } = value;
      orderData.customer_id = req.user.id;

      // Verify restaurant exists
      const restaurant = await externalServices.getRestaurant(
        orderData.restaurant_id
      );
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found",
        });
      }

      // Verify menu items and calculate totals
      let subtotal = 0;
      const verifiedItems = [];

      for (const item of items) {
        const menuItem = await externalServices.getMenuItem(item.menu_item_id);
        if (!menuItem) {
          return res.status(404).json({
            success: false,
            message: `Menu item ${item.menu_item_id} not found`,
          });
        }

        const itemTotal = menuItem.price * item.quantity;
        subtotal += itemTotal;

        verifiedItems.push({
          ...item,
          unit_price: menuItem.price,
          total_price: itemTotal,
        });
      }

      // Calculate final totals
      const taxAmount = subtotal * 0.1; // 10% tax
      const deliveryFee = 5.99; // Fixed delivery fee
      const totalAmount =
        subtotal + taxAmount + deliveryFee - (orderData.discount_amount || 0);

      orderData.tax_amount = taxAmount;
      orderData.delivery_fee = deliveryFee;
      orderData.total_amount = totalAmount;

      // Create order
      const order = await Order.create(orderData);

      // Create order items
      const orderItems = verifiedItems.map((item) => ({
        ...item,
        order_id: order.id,
      }));

      await OrderItem.createBulk(orderItems);

      // Get complete order with items
      const completeOrder = await this.getCompleteOrder(order.id);

      // Notify restaurant
      await externalServices.notifyRestaurant(order.restaurant_id, {
        type: "new_order",
        order_id: order.id,
        message: "New order received",
      });

      logger.info(
        `Order created: ${order.id} by customer: ${order.customer_id}`
      );

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: completeOrder,
      });
    } catch (error) {
      logger.error("Create order error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get order by ID
  static async getOrder(req, res) {
    try {
      const { id } = req.params;
      const order = await this.getCompleteOrder(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Check authorization
      if (!this.canAccessOrder(req.user, order)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      logger.error("Get order error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update order status
  static async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = validateOrderUpdate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Check authorization
      if (!this.canUpdateOrder(req.user, order, value.status)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Update order
      const additionalData = {};
      if (value.status === "delivered") {
        additionalData.actual_delivery_time = new Date();
      }
      if (value.driver_id) {
        additionalData.driver_id = value.driver_id;
      }

      const updatedOrder = await Order.updateStatus(
        id,
        value.status,
        additionalData
      );

      // Send notifications
      await this.sendStatusNotification(updatedOrder);

      res.json({
        success: true,
        message: "Order status updated successfully",
        data: updatedOrder,
      });
    } catch (error) {
      logger.error("Update order status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get order history
  static async getOrderHistory(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let orders;
      if (req.user.role === "customer") {
        orders = await Order.findByCustomer(
          req.user.id,
          parseInt(limit),
          offset
        );
      } else if (req.user.role === "restaurant") {
        orders = await Order.findByRestaurant(
          req.user.restaurant_id,
          parseInt(limit),
          offset
        );
      } else if (req.user.role === "driver") {
        orders = await Order.findByDriver(req.user.id, parseInt(limit), offset);
      } else {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      res.json({
        success: true,
        data: orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: orders.length,
        },
      });
    } catch (error) {
      logger.error("Get order history error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get order statistics
  static async getOrderStats(req, res) {
    try {
      const { restaurant_id, start_date, end_date } = req.query;

      // Check authorization for restaurant stats
      if (
        restaurant_id &&
        req.user.role === "restaurant" &&
        req.user.restaurant_id !== restaurant_id
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const stats = await Order.getOrderStats(
        restaurant_id,
        start_date,
        end_date
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Get order stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Cancel order
  static async cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Check if order can be cancelled
      if (!["pending", "confirmed"].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: "Order cannot be cancelled at this stage",
        });
      }

      // Check authorization
      if (!this.canCancelOrder(req.user, order)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Cancel order
      const updatedOrder = await Order.updateStatus(id, "cancelled");

      // Process refund if payment was made
      if (order.payment_status === "paid") {
        await externalServices.processRefund(order.id, order.total_amount);
        await Order.updatePaymentStatus(id, "refunded");
      }

      // Send notifications
      await this.sendCancellationNotification(updatedOrder, reason);

      res.json({
        success: true,
        message: "Order cancelled successfully",
        data: updatedOrder,
      });
    } catch (error) {
      logger.error("Cancel order error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Helper method to get complete order with items
  static async getCompleteOrder(orderId) {
    const order = await Order.findById(orderId);
    if (!order) return null;

    const items = await OrderItem.findByOrder(orderId);
    return {
      ...order,
      items,
    };
  }

  // Authorization helpers
  static canAccessOrder(user, order) {
    if (user.role === "admin" || user.role === "sales") return true;
    if (user.role === "customer") return user.id === order.customer_id;
    if (user.role === "restaurant")
      return user.restaurant_id === order.restaurant_id;
    if (user.role === "driver") return user.id === order.driver_id;
    return false;
  }

  static canUpdateOrder(user, order, newStatus) {
    if (user.role === "admin") return true;
    if (user.role === "restaurant") {
      return (
        user.restaurant_id === order.restaurant_id &&
        ["confirmed", "preparing", "ready"].includes(newStatus)
      );
    }
    if (user.role === "driver") {
      return ["picked_up", "delivered"].includes(newStatus);
    }
    return false;
  }

  static canCancelOrder(user, order) {
    if (user.role === "admin") return true;
    if (user.role === "customer") return user.id === order.customer_id;
    if (user.role === "restaurant")
      return user.restaurant_id === order.restaurant_id;
    return false;
  }

  // Notification helpers
  static async sendStatusNotification(order) {
    try {
      // Notify customer
      await externalServices.sendNotification(order.customer_id, {
        type: "order_status_update",
        order_id: order.id,
        status: order.status,
        message: `Your order is now ${order.status}`,
      });

      // Notify driver if assigned
      if (order.driver_id && ["ready", "picked_up"].includes(order.status)) {
        await externalServices.sendNotification(order.driver_id, {
          type: "delivery_update",
          order_id: order.id,
          status: order.status,
        });
      }
    } catch (error) {
      logger.error("Failed to send status notification:", error);
    }
  }

  static async sendCancellationNotification(order, reason) {
    try {
      // Notify customer
      await externalServices.sendNotification(order.customer_id, {
        type: "order_cancelled",
        order_id: order.id,
        reason: reason,
      });

      // Notify restaurant
      await externalServices.notifyRestaurant(order.restaurant_id, {
        type: "order_cancelled",
        order_id: order.id,
        reason: reason,
      });
    } catch (error) {
      logger.error("Failed to send cancellation notification:", error);
    }
  }
}

module.exports = OrderController;
