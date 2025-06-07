const Payment = require("../models/Payment");
const PaymentMethod = require("../models/PaymentMethod");
const logger = require("../utils/logger");
const {
  validatePayment,
  validatePaymentMethod,
} = require("../validators/paymentValidator");
const paymentGateway = require("../services/paymentGateway");
const externalServices = require("../services/externalServices");

class PaymentController {
  // Process payment for an order
  static async processPayment(req, res) {
    try {
      const { error, value } = validatePayment(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const paymentData = {
        ...value,
        customer_id: req.user.id,
      };

      // Check if payment already exists for this order
      const existingPayment = await Payment.findByOrder(paymentData.order_id);
      if (existingPayment) {
        return res.status(409).json({
          success: false,
          message: "Payment already exists for this order",
          data: existingPayment,
        });
      }

      // Verify order exists and belongs to customer
      const order = await externalServices.getOrder(paymentData.order_id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (order.customer_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Validate amount matches order total
      if (parseFloat(paymentData.amount) !== parseFloat(order.total_amount)) {
        return res.status(400).json({
          success: false,
          message: "Payment amount does not match order total",
        });
      }

      // Calculate processing fee (2.9% + $0.30)
      const processingFee =
        Math.round((paymentData.amount * 0.029 + 0.3) * 100) / 100;
      paymentData.processing_fee = processingFee;

      // Create payment record
      const payment = await Payment.create(paymentData);

      // Update status to processing
      await Payment.updateStatus(payment.id, "processing");

      // Process payment through gateway
      const gatewayResult = await paymentGateway.processPayment({
        payment_id: payment.id,
        amount: paymentData.amount,
        currency: paymentData.currency || "USD",
        payment_method: paymentData.payment_method,
        card_details: paymentData.card_details,
        billing_address: paymentData.billing_address,
      });

      // Update payment with gateway response
      const finalPayment = await Payment.updateStatus(
        payment.id,
        gatewayResult.status,
        {
          gateway_transaction_id: gatewayResult.transaction_id,
          gateway_reference: gatewayResult.reference,
          gateway_response: gatewayResult.raw_response,
          failure_reason: gatewayResult.failure_reason,
          processed_at:
            gatewayResult.status === "completed" ? new Date() : null,
        }
      );

      // Notify order service of payment status
      await externalServices.updateOrderPaymentStatus(
        paymentData.order_id,
        gatewayResult.status === "completed" ? "paid" : "failed",
        paymentData.payment_method
      );

      // Send notification to customer
      await externalServices.sendNotification(req.user.id, {
        type: "payment_status",
        payment_id: payment.id,
        status: gatewayResult.status,
        amount: paymentData.amount,
      });

      const statusCode = gatewayResult.status === "completed" ? 200 : 402;
      const message =
        gatewayResult.status === "completed"
          ? "Payment processed successfully"
          : "Payment failed";

      logger.info(
        `Payment ${gatewayResult.status}: ${payment.id} for order: ${paymentData.order_id}`
      );

      res.status(statusCode).json({
        success: gatewayResult.status === "completed",
        message,
        data: {
          ...finalPayment,
          gateway_response: undefined, // Don't expose raw gateway response
        },
      });
    } catch (error) {
      logger.error("Process payment error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get payment details
  static async getPayment(req, res) {
    try {
      const { id } = req.params;
      const payment = await Payment.findById(id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      // Check authorization
      if (
        payment.customer_id !== req.user.id &&
        req.user.role !== "admin" &&
        req.user.role !== "sales"
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Remove sensitive data for non-admin users
      if (req.user.role !== "admin") {
        delete payment.gateway_response;
      }

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      logger.error("Get payment error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get payment by order
  static async getPaymentByOrder(req, res) {
    try {
      const { orderId } = req.params;
      const payment = await Payment.findByOrder(orderId);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found for this order",
        });
      }

      // Check authorization
      if (
        payment.customer_id !== req.user.id &&
        req.user.role !== "admin" &&
        req.user.role !== "sales"
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Remove sensitive data for non-admin users
      if (req.user.role !== "admin") {
        delete payment.gateway_response;
      }

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      logger.error("Get payment by order error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Process refund
  static async processRefund(req, res) {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;

      const payment = await Payment.findById(id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      // Check authorization - only admin/sales can process refunds
      if (req.user.role !== "admin" && req.user.role !== "sales") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Validate refund amount
      const maxRefundable = payment.amount - payment.refund_amount;
      if (amount > maxRefundable) {
        return res.status(400).json({
          success: false,
          message: `Refund amount cannot exceed ${maxRefundable}`,
        });
      }

      // Process refund through gateway
      const refundResult = await paymentGateway.processRefund({
        original_transaction_id: payment.gateway_transaction_id,
        amount: amount,
        reason: reason,
      });

      if (refundResult.success) {
        // Update payment record
        await Payment.addRefund(id, amount, reason);

        // Notify customer
        await externalServices.sendNotification(payment.customer_id, {
          type: "refund_processed",
          payment_id: id,
          amount: amount,
          reason: reason,
        });

        logger.info(`Refund processed: ${amount} for payment: ${id}`);
      }

      res.json({
        success: refundResult.success,
        message: refundResult.success
          ? "Refund processed successfully"
          : "Refund failed",
        data: {
          refund_id: refundResult.refund_id,
          amount: amount,
          reason: reason,
        },
      });
    } catch (error) {
      logger.error("Process refund error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get payment history
  static async getPaymentHistory(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let customerId = req.user.id;

      // Admin/sales can view any customer's history
      if (
        (req.user.role === "admin" || req.user.role === "sales") &&
        req.query.customer_id
      ) {
        customerId = req.query.customer_id;
      }

      const payments = await Payment.findByCustomer(
        customerId,
        parseInt(limit),
        offset
      );

      // Remove sensitive data for non-admin users
      if (req.user.role !== "admin") {
        payments.forEach((payment) => {
          delete payment.gateway_response;
        });
      }

      res.json({
        success: true,
        data: payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: payments.length,
        },
      });
    } catch (error) {
      logger.error("Get payment history error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get payment statistics
  static async getPaymentStats(req, res) {
    try {
      // Only admin/sales can view stats
      if (req.user.role !== "admin" && req.user.role !== "sales") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const { start_date, end_date, customer_id } = req.query;
      const stats = await Payment.getPaymentStats(
        start_date,
        end_date,
        customer_id
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Get payment stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get revenue analytics
  static async getRevenueAnalytics(req, res) {
    try {
      // Only admin/sales can view analytics
      if (req.user.role !== "admin" && req.user.role !== "sales") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const { period = "day", limit = 30 } = req.query;
      const analytics = await Payment.getRevenueByPeriod(
        period,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error("Get revenue analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Payment Methods Management
  static async addPaymentMethod(req, res) {
    try {
      const { error, value } = validatePaymentMethod(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const methodData = {
        ...value,
        customer_id: req.user.id,
      };

      // Simulate saving payment method to gateway
      const gatewayResult = await paymentGateway.savePaymentMethod(methodData);

      if (!gatewayResult.success) {
        return res.status(400).json({
          success: false,
          message: "Failed to save payment method",
          error: gatewayResult.error,
        });
      }

      methodData.gateway_token = gatewayResult.token;
      const paymentMethod = await PaymentMethod.create(methodData);

      logger.info(
        `Payment method added: ${paymentMethod.id} for customer: ${req.user.id}`
      );

      res.status(201).json({
        success: true,
        message: "Payment method added successfully",
        data: paymentMethod,
      });
    } catch (error) {
      logger.error("Add payment method error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getPaymentMethods(req, res) {
    try {
      const methods = await PaymentMethod.findByCustomer(req.user.id);

      res.json({
        success: true,
        data: methods,
      });
    } catch (error) {
      logger.error("Get payment methods error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async setDefaultPaymentMethod(req, res) {
    try {
      const { id } = req.params;

      const method = await PaymentMethod.findById(id);
      if (!method || method.customer_id !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: "Payment method not found",
        });
      }

      const updatedMethod = await PaymentMethod.setDefault(id, req.user.id);

      res.json({
        success: true,
        message: "Default payment method updated",
        data: updatedMethod,
      });
    } catch (error) {
      logger.error("Set default payment method error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async deletePaymentMethod(req, res) {
    try {
      const { id } = req.params;

      const method = await PaymentMethod.findById(id);
      if (!method || method.customer_id !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: "Payment method not found",
        });
      }

      await PaymentMethod.deactivate(id, req.user.id);

      res.json({
        success: true,
        message: "Payment method deleted successfully",
      });
    } catch (error) {
      logger.error("Delete payment method error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = PaymentController;
