
class MessageTemplateService {
  static templates = {
    order: {
      confirmed: (orderNumber, restaurantName) => 
        `🍕 Order Confirmed! Your order #${orderNumber} from ${restaurantName} has been confirmed. We'll notify you when it's ready!`,
      
      preparing: (orderNumber, estimatedTime) => 
        `👨‍🍳 Your order #${orderNumber} is being prepared. Estimated time: ${estimatedTime} minutes.`,
      
      ready: (orderNumber, restaurantName) => 
        `✅ Order Ready! Your order #${orderNumber} from ${restaurantName} is ready for pickup/delivery!`,
      
      cancelled: (orderNumber, reason) => 
        `❌ Order #${orderNumber} has been cancelled. Reason: ${reason}. You will receive a full refund.`,

      delayed: (orderNumber, newEstimatedTime, reason) => 
        `⏰ Order Update: Your order #${orderNumber} is delayed. New estimated time: ${newEstimatedTime}. Reason: ${reason}`
    },

    delivery: {
      assigned: (orderNumber, driverName, eta) => 
        `🚗 Driver Assigned! ${driverName} is on the way with your order #${orderNumber}. ETA: ${eta} minutes.`,
      
      pickup: (orderNumber, driverName) => 
        `📦 Order Picked Up! ${driverName} has picked up your order #${orderNumber} and is heading your way.`,
      
      nearDelivery: (orderNumber, eta) => 
        `🏠 Almost There! Your order #${orderNumber} will arrive in ${eta} minutes. Please be ready!`,
      
      delivered: (orderNumber) => 
        `🎉 Order Delivered! Your order #${orderNumber} has been delivered. Enjoy your meal!`,
      
      delayed: (orderNumber, newEta, reason) => 
        `⏰ Delivery Update: Your order #${orderNumber} is delayed. New ETA: ${newEta}. Reason: ${reason}`,

      failed: (orderNumber, reason) => 
        `❌ Delivery Failed: Unable to deliver order #${orderNumber}. Reason: ${reason}. Please contact support.`
    },

    payment: {
      success: (orderNumber, amount) => 
        `💳 Payment Confirmed! Your payment of $${amount} for order #${orderNumber} has been processed successfully.`,
      
      failed: (orderNumber, reason) => 
        `❌ Payment Failed: Your payment for order #${orderNumber} failed. Reason: ${reason}. Please update your payment method.`,
      
      refund: (orderNumber, amount) => 
        `💰 Refund Processed: You've received a refund of $${amount} for order #${orderNumber}. It may take 3-5 business days to appear.`,

      partial_refund: (orderNumber, amount, reason) => 
        `💰 Partial Refund: You've received a partial refund of $${amount} for order #${orderNumber}. Reason: ${reason}`
    },

    system: {
      welcome: (userName) => 
        `🎉 Welcome ${userName}! Thanks for joining our food delivery platform. Get 20% off your first order with code WELCOME20!`,
      
      maintenance: (startTime, duration) => 
        `🔧 Scheduled Maintenance: Our service will be down for ${duration} starting at ${startTime}. We apologize for any inconvenience.`,

      promo: (promoCode, discount, expiryDate) => 
        `🎁 Special Offer! Use code ${promoCode} for ${discount}% off your next order. Valid until ${expiryDate}.`,

      account_update: (updateType) => 
        `🔐 Account Security: Your ${updateType} has been updated successfully. If this wasn't you, please contact support immediately.`
    },

    driver: {
      new_delivery: (orderNumber, pickupAddress, deliveryAddress, earnings) => 
        `🚗 New Delivery Request! Order #${orderNumber}. Pickup: ${pickupAddress}. Delivery: ${deliveryAddress}. Earnings: $${earnings}`,
      
      pickup_reminder: (orderNumber, restaurantName) => 
        `📍 Pickup Reminder: Please collect order #${orderNumber} from ${restaurantName}.`,
      
      delivery_confirmed: (orderNumber, earnings) => 
        `✅ Delivery Complete! Order #${orderNumber} delivered successfully. You earned $${earnings}.`
    },

    restaurant: {
      new_order: (orderNumber, customerName, items, total) => 
        `🛎️ New Order! Order #${orderNumber} from ${customerName}. Items: ${items}. Total: $${total}`,
      
      order_cancelled: (orderNumber, reason, refundAmount) => 
        `❌ Order Cancelled: Order #${orderNumber} cancelled. Reason: ${reason}. Refund: $${refundAmount}`,
      
      driver_arrived: (orderNumber, driverName) => 
        `🚗 Driver Arrived: ${driverName} is here to collect order #${orderNumber}.`
    }
  };

  static generateMessage(template, data) {
    const [category, type] = template.split('.');
    
    if (!this.templates[category] || !this.templates[category][type]) {
      throw new Error(`Template ${template} not found`);
    }
    
    return this.templates[category][type](...data);
  }

  static getAvailableTemplates() {
    const templates = [];
    Object.keys(this.templates).forEach(category => {
      Object.keys(this.templates[category]).forEach(type => {
        templates.push(`${category}.${type}`);
      });
    });
    return templates;
  }

  static validateTemplateData(template, data) {
    // Basic validation - could be expanded with specific rules per template
    if (!Array.isArray(data)) {
      throw new Error('Template data must be an array');
    }
    
    try {
      this.generateMessage(template, data);
      return true;
    } catch (error) {
      throw new Error(`Template validation failed: ${error.message}`);
    }
  }
}

module.exports = MessageTemplateService;
