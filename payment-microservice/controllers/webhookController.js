const Payment = require("../models/Payment");
const logger = require("../utils/logger");
const externalServices = require("../services/externalServices");

class WebhookController {
  // Handle payment gateway webhooks (simulated)
  static async handlePaymentWebhook(req, res) {
    try {
      const {
        event_type,
        payment_id,
        transaction_id,
        status,
        amount,
        failure_reason,
      } = req.body;

      logger.info(`Webhook received: ${event_type} for payment: ${payment_id}`);

      const payment = await Payment.findById(payment_id);
      if (!payment) {
        logger.error(`Payment not found for webhook: ${payment_id}`);
        return res.status(404).json({ message: "Payment not found" });
      }

      switch (event_type) {
        case "payment.completed":
          await this.handlePaymentCompleted(payment, transaction_id);
          break;

        case "payment.failed":
          await this.handlePaymentFailed(payment, failure_reason);
          break;

        case "payment.refunded":
          await this.handlePaymentRefunded(payment, amount);
          break;

        default:
          logger.warn(`Unknown webhook event: ${event_type}`);
      }

      res.status(200).json({ message: "Webhook processed" });
    } catch (error) {
      logger.error("Webhook processing error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  }

  static async handlePaymentCompleted(payment, transactionId) {
    await Payment.updateStatus(payment.id, "completed", {
      gateway_transaction_id: transactionId,
      processed_at: new Date(),
    });

    // Notify order service
    await externalServices.updateOrderPaymentStatus(
      payment.order_id,
      "paid",
      payment.payment_method
    );

    // Notify customer
    await externalServices.sendNotification(payment.customer_id, {
      type: "payment_completed",
      payment_id: payment.id,
      amount: payment.amount,
    });
  }

  static async handlePaymentFailed(payment, failureReason) {
    await Payment.updateStatus(payment.id, "failed", {
      failure_reason: failureReason,
    });

    // Notify order service
    await externalServices.updateOrderPaymentStatus(payment.order_id, "failed");

    // Notify customer
    await externalServices.sendNotification(payment.customer_id, {
      type: "payment_failed",
      payment_id: payment.id,
      reason: failureReason,
    });
  }

  static async handlePaymentRefunded(payment, refundAmount) {
    await Payment.addRefund(
      payment.id,
      refundAmount,
      "Gateway initiated refund"
    );

    // Notify customer
    await externalServices.sendNotification(payment.customer_id, {
      type: "refund_processed",
      payment_id: payment.id,
      amount: refundAmount,
    });
  }
}

module.exports = WebhookController;
