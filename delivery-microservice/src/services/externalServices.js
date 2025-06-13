const axios = require("axios");
const logger = require("../utils/logger");

/**
 * External Services Module
 * Handles communication with other microservices in the platform
 */
class ExternalServices {
  constructor() {
    this.serviceUrls = {
      userManagement:
        process.env.USER_MANAGEMENT_SERVICE_URL || "http://user-service:3001",
      restaurant:
        process.env.RESTAURANT_SERVICE_URL || "http://restaurant-service:3002",
      order: process.env.ORDER_SERVICE_URL || "http://order-service:3003",
      payment: process.env.PAYMENT_SERVICE_URL || "http://payment-service:3004",
      notification:
        process.env.NOTIFICATION_SERVICE_URL ||
        "http://notification-service:3006",
      referral:
        process.env.REFERRAL_SERVICE_URL || "http://referral-service:3007",
    };

    this.serviceToken = process.env.SERVICE_AUTH_TOKEN || "service-auth-token";
    this.timeout = parseInt(process.env.SERVICE_TIMEOUT) || 10000; // 10 seconds
  }

  /**
   * Make authenticated request to another service
   */
  async makeServiceRequest(method, url, data = null, retries = 3) {
    const config = {
      method,
      url,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Service ${this.serviceToken}`,
        "X-Service-Name": "delivery-service",
      },
    };

    if (data) {
      config.data = data;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios(config);
        return response.data;
      } catch (error) {
        logger.error(
          `Service request failed (attempt ${attempt}/${retries}):`,
          {
            url,
            method,
            error: error.message,
            status: error.response?.status,
          }
        );

        if (attempt === retries) {
          throw new Error(
            `Service request failed after ${retries} attempts: ${error.message}`
          );
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // ================================================================
  // USER MANAGEMENT SERVICE
  // ================================================================

  async getUser(userId) {
    try {
      const response = await this.makeServiceRequest(
        "GET",
        `${this.serviceUrls.userManagement}/users/${userId}`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get user ${userId}:`, error);
      return null;
    }
  }

  async validateUser(userId, roles = []) {
    try {
      const response = await this.makeServiceRequest(
        "POST",
        `${this.serviceUrls.userManagement}/users/validate`,
        { user_id: userId, required_roles: roles }
      );
      return response.success;
    } catch (error) {
      logger.error(`Failed to validate user ${userId}:`, error);
      return false;
    }
  }

  // ================================================================
  // RESTAURANT SERVICE
  // ================================================================

  async getRestaurant(restaurantId) {
    try {
      const response = await this.makeServiceRequest(
        "GET",
        `${this.serviceUrls.restaurant}/restaurants/${restaurantId}`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get restaurant ${restaurantId}:`, error);
      return null;
    }
  }

  async notifyRestaurant(restaurantId, notification) {
    try {
      await this.makeServiceRequest(
        "POST",
        `${this.serviceUrls.restaurant}/restaurants/${restaurantId}/notifications`,
        notification
      );
      return true;
    } catch (error) {
      logger.error(`Failed to notify restaurant ${restaurantId}:`, error);
      return false;
    }
  }

  async updateRestaurantDeliveryStatus(restaurantId, deliveryId, status) {
    try {
      await this.makeServiceRequest(
        "PATCH",
        `${this.serviceUrls.restaurant}/restaurants/${restaurantId}/deliveries/${deliveryId}`,
        { status }
      );
      return true;
    } catch (error) {
      logger.error(`Failed to update restaurant delivery status:`, error);
      return false;
    }
  }

  // ================================================================
  // ORDER SERVICE
  // ================================================================

  async getOrder(orderId) {
    try {
      const response = await this.makeServiceRequest(
        "GET",
        `${this.serviceUrls.order}/orders/${orderId}`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get order ${orderId}:`, error);
      return null;
    }
  }

  async updateOrderDeliveryStatus(orderId, deliveryStatus, deliveryInfo = {}) {
    try {
      await this.makeServiceRequest(
        "PATCH",
        `${this.serviceUrls.order}/orders/${orderId}/delivery-status`,
        {
          delivery_status: deliveryStatus,
          delivery_info: deliveryInfo,
        }
      );
      return true;
    } catch (error) {
      logger.error(`Failed to update order delivery status:`, error);
      return false;
    }
  }

  async getOrderCustomer(orderId) {
    try {
      const response = await this.makeServiceRequest(
        "GET",
        `${this.serviceUrls.order}/orders/${orderId}/customer`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get order customer:`, error);
      return null;
    }
  }

  // ================================================================
  // PAYMENT SERVICE
  // ================================================================

  async processDeliveryFee(orderId, deliveryFee, driverId) {
    try {
      const response = await this.makeServiceRequest(
        "POST",
        `${this.serviceUrls.payment}/payments/delivery-fee`,
        {
          order_id: orderId,
          delivery_fee: deliveryFee,
          driver_id: driverId,
        }
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to process delivery fee:`, error);
      return null;
    }
  }

  async refundDeliveryFee(orderId, reason) {
    try {
      const response = await this.makeServiceRequest(
        "POST",
        `${this.serviceUrls.payment}/payments/delivery-fee/refund`,
        {
          order_id: orderId,
          reason,
        }
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to refund delivery fee:`, error);
      return null;
    }
  }

  async getPaymentStatus(orderId) {
    try {
      const response = await this.makeServiceRequest(
        "GET",
        `${this.serviceUrls.payment}/payments/order/${orderId}/status`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get payment status:`, error);
      return null;
    }
  }

  // ================================================================
  // NOTIFICATION SERVICE
  // ================================================================

  async sendNotification(userId, notification) {
    try {
      await this.makeServiceRequest(
        "POST",
        `${this.serviceUrls.notification}/notifications/send`,
        {
          user_id: userId,
          ...notification,
        }
      );
      return true;
    } catch (error) {
      logger.error(`Failed to send notification to user ${userId}:`, error);
      return false;
    }
  }

  async sendBulkNotification(userIds, notification) {
    try {
      await this.makeServiceRequest(
        "POST",
        `${this.serviceUrls.notification}/notifications/bulk-send`,
        {
          user_ids: userIds,
          ...notification,
        }
      );
      return true;
    } catch (error) {
      logger.error(`Failed to send bulk notification:`, error);
      return false;
    }
  }

  async sendSMSNotification(phoneNumber, message) {
    try {
      await this.makeServiceRequest(
        "POST",
        `${this.serviceUrls.notification}/notifications/sms`,
        {
          phone_number: phoneNumber,
          message,
        }
      );
      return true;
    } catch (error) {
      logger.error(`Failed to send SMS notification:`, error);
      return false;
    }
  }

  async sendEmailNotification(email, subject, content) {
    try {
      await this.makeServiceRequest(
        "POST",
        `${this.serviceUrls.notification}/notifications/email`,
        {
          email,
          subject,
          content,
        }
      );
      return true;
    } catch (error) {
      logger.error(`Failed to send email notification:`, error);
      return false;
    }
  }

  // ================================================================
  // REFERRAL SERVICE
  // ================================================================

  async trackDeliveryForReferral(driverId, deliveryFee) {
    try {
      await this.makeServiceRequest(
        "POST",
        `${this.serviceUrls.referral}/referrals/track-delivery`,
        {
          driver_id: driverId,
          delivery_fee: deliveryFee,
        }
      );
      return true;
    } catch (error) {
      logger.error(`Failed to track delivery for referral:`, error);
      return false;
    }
  }

  async checkDriverReferralBonus(driverId) {
    try {
      const response = await this.makeServiceRequest(
        "GET",
        `${this.serviceUrls.referral}/referrals/driver/${driverId}/bonus`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to check driver referral bonus:`, error);
      return null;
    }
  }

  // ================================================================
  // HEALTH CHECKS
  // ================================================================

  async checkServiceHealth(serviceName) {
    try {
      const serviceUrl = this.serviceUrls[serviceName];
      if (!serviceUrl) {
        throw new Error(`Unknown service: ${serviceName}`);
      }

      const response = await this.makeServiceRequest(
        "GET",
        `${serviceUrl}/health`,
        null,
        1 // Only 1 retry for health checks
      );

      return {
        service: serviceName,
        status: "healthy",
        response_time: Date.now(),
        ...response,
      };
    } catch (error) {
      return {
        service: serviceName,
        status: "unhealthy",
        error: error.message,
        response_time: Date.now(),
      };
    }
  }

  async checkAllServicesHealth() {
    const healthChecks = Object.keys(this.serviceUrls).map((service) =>
      this.checkServiceHealth(service)
    );

    const results = await Promise.allSettled(healthChecks);

    return results.map((result, index) => {
      const serviceName = Object.keys(this.serviceUrls)[index];
      return result.status === "fulfilled"
        ? result.value
        : {
            service: serviceName,
            status: "error",
            error: result.reason?.message || "Unknown error",
          };
    });
  }

  // ================================================================
  // UTILITY METHODS
  // ================================================================

  /**
   * Circuit breaker pattern implementation
   */
  createCircuitBreaker(
    serviceName,
    failureThreshold = 5,
    resetTimeout = 60000
  ) {
    return {
      failures: 0,
      lastFailureTime: null,
      state: "CLOSED", // CLOSED, OPEN, HALF_OPEN

      async call(requestFn) {
        if (this.state === "OPEN") {
          if (Date.now() - this.lastFailureTime > resetTimeout) {
            this.state = "HALF_OPEN";
          } else {
            throw new Error(`Circuit breaker OPEN for ${serviceName}`);
          }
        }

        try {
          const result = await requestFn();

          if (this.state === "HALF_OPEN") {
            this.state = "CLOSED";
            this.failures = 0;
          }

          return result;
        } catch (error) {
          this.failures++;
          this.lastFailureTime = Date.now();

          if (this.failures >= failureThreshold) {
            this.state = "OPEN";
            logger.error(`Circuit breaker OPEN for ${serviceName}`);
          }

          throw error;
        }
      },
    };
  }

  /**
   * Get service URLs for debugging
   */
  getServiceUrls() {
    return this.serviceUrls;
  }

  /**
   * Update service URL dynamically
   */
  updateServiceUrl(serviceName, url) {
    if (this.serviceUrls.hasOwnProperty(serviceName)) {
      this.serviceUrls[serviceName] = url;
      logger.info(`Updated ${serviceName} service URL to: ${url}`);
    } else {
      logger.error(`Unknown service name: ${serviceName}`);
    }
  }
}

// Create and export singleton instance
const externalServices = new ExternalServices();

module.exports = externalServices;
