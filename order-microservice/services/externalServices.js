const axios = require("axios");
const logger = require("../utils/logger");

class ExternalServices {
  constructor() {
    this.userServiceUrl = process.env.USER_SERVICE_URL;
    this.restaurantServiceUrl = process.env.RESTAURANT_SERVICE_URL;
    this.paymentServiceUrl = process.env.PAYMENT_SERVICE_URL;
    this.deliveryServiceUrl = process.env.DELIVERY_SERVICE_URL;
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

  async getRestaurant(restaurantId) {
    try {
      const response = await this.makeRequest(
        `${this.restaurantServiceUrl}/api/restaurants/${restaurantId}`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get restaurant ${restaurantId}:`, error.message);
      return null;
    }
  }

  async getMenuItem(menuItemId) {
    try {
      const response = await this.makeRequest(
        `${this.restaurantServiceUrl}/api/menu-items/${menuItemId}`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get menu item ${menuItemId}:`, error.message);
      return null;
    }
  }

  async processPayment(paymentData) {
    try {
      const response = await this.makeRequest(
        `${this.paymentServiceUrl}/api/payments`,
        "POST",
        paymentData
      );
      return response.data;
    } catch (error) {
      logger.error("Payment processing failed:", error.message);
      throw error;
    }
  }

  async processRefund(orderId, amount) {
    try {
      const response = await this.makeRequest(
        `${this.paymentServiceUrl}/api/refunds`,
        "POST",
        { order_id: orderId, amount }
      );
      return response.data;
    } catch (error) {
      logger.error("Refund processing failed:", error.message);
      throw error;
    }
  }

  async assignDelivery(orderData) {
    try {
      const response = await this.makeRequest(
        `${this.deliveryServiceUrl}/api/deliveries/assign`,
        "POST",
        orderData
      );
      return response.data;
    } catch (error) {
      logger.error("Delivery assignment failed:", error.message);
      throw error;
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

  async notifyRestaurant(restaurantId, notificationData) {
    try {
      await this.makeRequest(
        `${this.notificationServiceUrl}/api/notifications/restaurant`,
        "POST",
        { restaurant_id: restaurantId, ...notificationData }
      );
    } catch (error) {
      logger.error("Failed to notify restaurant:", error.message);
    }
  }
}

module.exports = new ExternalServices();
