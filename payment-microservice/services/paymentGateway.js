const crypto = require("crypto");
const logger = require("../utils/logger");

class PaymentGatewaySimulator {
  constructor() {
    this.successRate = parseInt(process.env.PAYMENT_SUCCESS_RATE) || 85;
    this.processingDelay =
      parseInt(process.env.PAYMENT_PROCESSING_DELAY) || 2000;
    this.supportedMethods = [
      "credit_card",
      "debit_card",
      "paypal",
      "apple_pay",
      "google_pay",
    ];
  }

  // Simulate payment processing
  async processPayment(paymentData) {
    logger.info(`Processing payment: ${paymentData.payment_id}`);

    // Simulate processing delay
    await this.delay(this.processingDelay);

    const transactionId = this.generateTransactionId();
    const reference = this.generateReference();

    // Simulate different payment scenarios
    const scenario = this.determinePaymentScenario(paymentData);

    const result = {
      transaction_id: transactionId,
      reference: reference,
      raw_response: {
        gateway: "FoodDelivery Simulator",
        timestamp: new Date().toISOString(),
        processing_time_ms: this.processingDelay,
        scenario: scenario.type,
      },
    };

    switch (scenario.type) {
      case "success":
        result.status = "completed";
        result.raw_response.message = "Payment processed successfully";
        break;

      case "insufficient_funds":
        result.status = "failed";
        result.failure_reason = "Insufficient funds";
        result.raw_response.error_code = "INSUFFICIENT_FUNDS";
        break;

      case "invalid_card":
        result.status = "failed";
        result.failure_reason = "Invalid card details";
        result.raw_response.error_code = "INVALID_CARD";
        break;

      case "expired_card":
        result.status = "failed";
        result.failure_reason = "Card has expired";
        result.raw_response.error_code = "EXPIRED_CARD";
        break;

      case "network_error":
        result.status = "failed";
        result.failure_reason = "Network timeout";
        result.raw_response.error_code = "NETWORK_TIMEOUT";
        break;

      case "fraud_detected":
        result.status = "failed";
        result.failure_reason = "Transaction flagged for fraud";
        result.raw_response.error_code = "FRAUD_DETECTED";
        break;

      default:
        result.status = "failed";
        result.failure_reason = "Unknown error";
        result.raw_response.error_code = "UNKNOWN_ERROR";
    }

    logger.info(
      `Payment ${result.status}: ${paymentData.payment_id} - ${scenario.type}`
    );
    return result;
  }

  // Simulate refund processing
  async processRefund(refundData) {
    logger.info(
      `Processing refund for transaction: ${refundData.original_transaction_id}`
    );

    await this.delay(1000); // Shorter delay for refunds

    const refundId = this.generateTransactionId();
    const success = Math.random() < 0.95; // 95% success rate for refunds

    const result = {
      success: success,
      refund_id: refundId,
      timestamp: new Date().toISOString(),
      processing_time_ms: 1000,
    };

    if (!success) {
      result.error = "Refund processing failed";
      result.error_code = "REFUND_FAILED";
    }

    return result;
  }

  // Simulate saving payment method
  async savePaymentMethod(methodData) {
    logger.info(
      `Saving payment method for customer: ${methodData.customer_id}`
    );

    await this.delay(500);

    // Simulate validation
    if (methodData.type === "credit_card" || methodData.type === "debit_card") {
      if (!methodData.card_details || !methodData.card_details.number) {
        return {
          success: false,
          error: "Card number is required",
        };
      }

      // Simulate card validation
      const cardNumber = methodData.card_details.number.replace(/\s/g, "");
      if (cardNumber.length < 13 || cardNumber.length > 19) {
        return {
          success: false,
          error: "Invalid card number",
        };
      }
    }

    const token = this.generatePaymentToken();

    return {
      success: true,
      token: token,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };
  }

  // Determine payment scenario based on various factors
  determinePaymentScenario(paymentData) {
    const amount = parseFloat(paymentData.amount);

    // Specific test cases based on amount
    if (amount === 13.13) return { type: "insufficient_funds" };
    if (amount === 14.14) return { type: "invalid_card" };
    if (amount === 15.15) return { type: "expired_card" };
    if (amount === 16.16) return { type: "network_error" };
    if (amount === 17.17) return { type: "fraud_detected" };

    // High amount transactions have higher failure rate
    if (amount > 500) {
      const successRate = this.successRate - 20;
      return Math.random() * 100 < successRate
        ? { type: "success" }
        : { type: "insufficient_funds" };
    }

    // Card type specific scenarios
    if (paymentData.card_details) {
      const cardNumber = paymentData.card_details.number;
      if (cardNumber && cardNumber.startsWith("4000000000000002")) {
        return { type: "invalid_card" };
      }
      if (cardNumber && cardNumber.startsWith("4000000000000069")) {
        return { type: "expired_card" };
      }
    }

    // Random success/failure based on configured rate
    return Math.random() * 100 < this.successRate
      ? { type: "success" }
      : { type: this.getRandomFailureType() };
  }

  getRandomFailureType() {
    const failureTypes = [
      "insufficient_funds",
      "invalid_card",
      "network_error",
      "fraud_detected",
    ];
    return failureTypes[Math.floor(Math.random() * failureTypes.length)];
  }

  generateTransactionId() {
    return "txn_" + crypto.randomBytes(16).toString("hex");
  }

  generateReference() {
    return "ref_" + crypto.randomBytes(8).toString("hex").toUpperCase();
  }

  generatePaymentToken() {
    return "pm_" + crypto.randomBytes(24).toString("hex");
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get gateway status (for monitoring)
  getStatus() {
    return {
      status: "active",
      success_rate: this.successRate,
      processing_delay: this.processingDelay,
      supported_methods: this.supportedMethods,
      uptime: process.uptime(),
    };
  }
}

module.exports = new PaymentGatewaySimulator();
