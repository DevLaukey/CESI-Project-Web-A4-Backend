const axios = require("axios");
const logger = require("../utils/logger");

class ExternalServices {
  constructor() {
    this.orderServiceUrl = process.env.ORDER_SERVICE_URL;
    this.userServiceUrl = process.env.USER_SERVICE_URL;
    this.notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL;
    this.apiKey = process.env.SERVICE_API_KEY;
  }

  async makeRequest(url, method = "GET", data = null) {
    try {
      const config = {
        method,
        url,
        headers: {
          "Content-Type": "application/json",
          "X-Service-Key": this.apiKey,
        },
        timeout: 10000,
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      logger.error(`External service request failed: ${url}`, error.message);
      throw error;
    }
  }

  async getOrder(orderId) {
    try {
      const response = await this.makeRequest(
        `${this.orderServiceUrl}/api/orders/${orderId}`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get order ${orderId}:`, error.message);
      return null;
    }
  }

  async updateOrderPaymentStatus(orderId, paymentStatus, paymentMethod = null) {
    try {
      await this.makeRequest(
        `${this.orderServiceUrl}/api/orders/${orderId}/payment-status`,
        "PATCH",
        { payment_status: paymentStatus, payment_method: paymentMethod }
      );
    } catch (error) {
      logger.error(`Failed to update order payment status:`, error.message);
    }
  }

  async sendNotification(userId, notificationData) {
    try {
      await this.makeRequest(
        `${this.notificationServiceUrl}/api/notifications`,
        "POST",
        { user_id: userId, ...notificationData }
      );
    } catch (error) {
      logger.error("Failed to send notification:", error.message);
    }
  }
}

module.exports = new ExternalServices();
