
// notification-service/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notifications')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Twilio Setup
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Models
const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userType: { 
    type: String, 
    enum: ['customer', 'restaurant', 'driver'], 
    required: true 
  },
  phone: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['order', 'delivery', 'payment', 'system'], 
    required: true 
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  twilioSid: String,
  data: { type: Object, default: {} },
  sentAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

const userPreferencesSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  smsEnabled: { type: Boolean, default: true },
  orderNotifications: { type: Boolean, default: true },
  deliveryNotifications: { type: Boolean, default: true },
  paymentNotifications: { type: Boolean, default: true },
  systemNotifications: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const UserPreferences = mongoose.model('UserPreferences', userPreferencesSchema);

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Notification Service
class NotificationService {
  static async sendSMS(phone, message, data = {}) {
    try {
      const result = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      
      console.log(`✅ SMS sent to ${phone}: ${result.sid}`);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error(`❌ SMS failed to ${phone}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  static async create(data) {
    try {
      // Get user preferences
      const preferences = await UserPreferences.findOne({ userId: data.userId });
      
      if (!preferences) {
        throw new Error('User preferences not found');
      }

      // Check if user wants this type of notification
      const typeKey = `${data.type}Notifications`;
      if (!preferences.smsEnabled || !preferences[typeKey]) {
        console.log(`📵 SMS disabled for user ${data.userId}, type ${data.type}`);
        return { success: false, reason: 'disabled' };
      }

      // Create notification record
      const notification = new Notification({
        ...data,
        phone: preferences.phone
      });

      // Send SMS
      const smsResult = await this.sendSMS(preferences.phone, data.message, data.data);
      
      // Update notification with result
      notification.status = smsResult.success ? 'sent' : 'failed';
      notification.twilioSid = smsResult.sid;
      notification.sentAt = smsResult.success ? new Date() : null;
      
      await notification.save();

      return {
        success: smsResult.success,
        notification,
        smsResult
      };

    } catch (error) {
      console.error('Notification creation failed:', error);
      throw error;
    }
  }

  static async getUserNotifications(userId, limit = 20) {
    return await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  static async getNotificationStatus(twilioSid) {
    try {
      const message = await twilioClient.messages(twilioSid).fetch();
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Pre-built message templates
  static templates = {
    order: {
      confirmed: (orderNumber, restaurantName) => 
        `🍕 Order Confirmed! Your order #${orderNumber} from ${restaurantName} has been confirmed. We'll notify you when it's ready!`,
      
      preparing: (orderNumber, estimatedTime) => 
        `👨‍🍳 Your order #${orderNumber} is being prepared. Estimated time: ${estimatedTime} minutes.`,
      
      ready: (orderNumber, restaurantName) => 
        `✅ Order Ready! Your order #${orderNumber} from ${restaurantName} is ready for pickup/delivery!`,
      
      cancelled: (orderNumber, reason) => 
        `❌ Order #${orderNumber} has been cancelled. Reason: ${reason}. You will receive a full refund.`
    },

    delivery: {
      assigned: (orderNumber, driverName, eta) => 
        `🚗 Driver Assigned! ${driverName} is on the way with your order #${orderNumber}. ETA: ${eta} minutes.`,
      
      pickup: (orderNumber, driverName) => 
        `📦 Order Picked Up! ${driverName} has picked up your order #${orderNumber} and is heading your way.`,
      
      delivered: (orderNumber) => 
        `🎉 Order Delivered! Your order #${orderNumber} has been delivered. Enjoy your meal!`,
      
      delayed: (orderNumber, newEta, reason) => 
        `⏰ Delivery Update: Your order #${orderNumber} is delayed. New ETA: ${newEta}. Reason: ${reason}`
    },

    payment: {
      success: (orderNumber, amount) => 
        `💳 Payment Confirmed! Your payment of $${amount} for order #${orderNumber} has been processed successfully.`,
      
      failed: (orderNumber, reason) => 
        `❌ Payment Failed: Your payment for order #${orderNumber} failed. Reason: ${reason}. Please update your payment method.`,
      
      refund: (orderNumber, amount) => 
        `💰 Refund Processed: You've received a refund of $${amount} for order #${orderNumber}. It may take 3-5 business days to appear.`
    },

    system: {
      welcome: (userName) => 
        `🎉 Welcome ${userName}! Thanks for joining our food delivery platform. Get 20% off your first order with code WELCOME20!`,
      
      maintenance: (startTime, duration) => 
        `🔧 Scheduled Maintenance: Our service will be down for ${duration} starting at ${startTime}. We apologize for any inconvenience.`
    }
  };

  static async sendTemplatedMessage(userId, template, templateData) {
    const [category, type] = template.split('.');
    
    if (!this.templates[category] || !this.templates[category][type]) {
      throw new Error(`Template ${template} not found`);
    }
    
    const message = this.templates[category][type](...templateData);
    
    return await this.create({
      userId,
      userType: 'customer', // Default, can be overridden
      message,
      type: category,
      data: { template, templateData }
    });
  }
}

// API Routes

// Send notification
app.post('/api/notifications', async (req, res) => {
  try {
    const result = await NotificationService.create(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send templated notification
app.post('/api/notifications/templated', async (req, res) => {
  try {
    const { userId, template, data } = req.body;
    const result = await NotificationService.sendTemplatedMessage(userId, template, data);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user notifications
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const notifications = await NotificationService.getUserNotifications(req.params.userId);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get notification status
app.get('/api/notifications/status/:twilioSid', async (req, res) => {
  try {
    const status = await NotificationService.getNotificationStatus(req.params.twilioSid);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User preferences routes
app.get('/api/preferences/:userId', async (req, res) => {
  try {
    const preferences = await UserPreferences.findOne({ userId: req.params.userId });
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/preferences', async (req, res) => {
  try {
    const preferences = await UserPreferences.findOneAndUpdate(
      { userId: req.body.userId },
      req.body,
      { upsert: true, new: true }
    );
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk notifications (for marketing/announcements)
app.post('/api/notifications/bulk', async (req, res) => {
  try {
    const { userIds, message, type = 'system' } = req.body;
    const results = [];

    for (const userId of userIds) {
      try {
        const result = await NotificationService.create({
          userId,
          userType: 'customer',
          message,
          type,
          data: { bulk: true }
        });
        results.push({ userId, success: result.success });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    res.json({ results, total: userIds.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook for Twilio status updates
app.post('/api/webhooks/twilio', (req, res) => {
  const { MessageSid, MessageStatus, ErrorCode } = req.body;
  
  console.log(`📱 Twilio webhook: ${MessageSid} -> ${MessageStatus}`);
  
  // Update notification status in database
  Notification.findOneAndUpdate(
    { twilioSid: MessageSid },
    { 
      status: MessageStatus === 'delivered' ? 'delivered' : 
              MessageStatus === 'failed' ? 'failed' : 'sent'
    }
  ).catch(err => console.error('Webhook update failed:', err));
  
  res.sendStatus(200);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'notification-service'
  });
});

// Test endpoint
app.post('/api/test', async (req, res) => {
  try {
    const { phone, message } = req.body;
    const result = await NotificationService.sendSMS(phone, message || 'Test message from food delivery app! 🍕');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`🚀 Notification service running on port ${PORT}`);
  console.log(`📱 Twilio ${process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'NOT configured'}`);
});





// ORDER SERVICE INTEGRATION
class OrderService {
  static async notifyOrderConfirmed(userId, orderData) {
    return await fetch('http://notification-service:3006/api/notifications/templated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        template: 'order.confirmed',
        data: [orderData.orderNumber, orderData.restaurantName]
      })
    });
  }

  static async notifyOrderReady(userId, orderData) {
    return await fetch('http://notification-service:3006/api/notifications/templated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        template: 'order.ready',
        data: [orderData.orderNumber, orderData.restaurantName]
      })
    });
  }
}

// DELIVERY SERVICE INTEGRATION
class DeliveryService {
  static async notifyDriverAssigned(userId, deliveryData) {
    return await fetch('http://notification-service:3006/api/notifications/templated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        template: 'delivery.assigned',
        data: [deliveryData.orderNumber, deliveryData.driverName, deliveryData.eta]
      })
    });
  }

  static async notifyDelivered(userId, orderNumber) {
    return await fetch('http://notification-service:3006/api/notifications/templated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        template: 'delivery.delivered',
        data: [orderNumber]
      })
    });
  }
}

// PAYMENT SERVICE INTEGRATION
class PaymentService {
  static async notifyPaymentSuccess(userId, paymentData) {
    return await fetch('http://notification-service:3006/api/notifications/templated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        template: 'payment.success',
        data: [paymentData.orderNumber, paymentData.amount]
      })
    });
  }

  static async notifyRefund(userId, refundData) {
    return await fetch('http://notification-service:3006/api/notifications/templated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        template: 'payment.refund',
        data: [refundData.orderNumber, refundData.amount]
      })
    });
  }
}

module.exports = { OrderService, DeliveryService, PaymentService };

// notification-service/test-client.js
// Simple test client to verify the service works

const axios = require('axios');

const BASE_URL = 'http://localhost:3006/api';

async function testNotificationService() {
  try {
    console.log('🧪 Testing Notification Service...\n');

    // 1. Create user preferences
    console.log('1. Creating user preferences...');
    const prefsResponse = await axios.post(`${BASE_URL}/preferences`, {
      userId: 'test-user-123',
      phone: '+1234567890', // Replace with your phone number
      smsEnabled: true,
      orderNotifications: true,
      deliveryNotifications: true,
      paymentNotifications: true
    });
    console.log('✅ User preferences created\n');

    // 2. Send a simple notification
    console.log('2. Sending simple notification...');
    const simpleNotification = await axios.post(`${BASE_URL}/notifications`, {
      userId: 'test-user-123',
      userType: 'customer',
      message: 'Hello! This is a test notification from your food delivery app 🍕',
      type: 'system'
    });
    console.log('✅ Simple notification sent\n');

    // 3. Send templated notifications
    console.log('3. Sending templated notifications...');
    
    // Order confirmed
    await axios.post(`${BASE_URL}/notifications/templated`, {
      userId: 'test-user-123',
      template: 'order.confirmed',
      data: ['ORD-123', 'Pizza Palace']
    });
    
    // Driver assigned
    await axios.post(`${BASE_URL}/notifications/templated`, {
      userId: 'test-user-123',
      template: 'delivery.assigned',
      data: ['ORD-123', 'John Driver', '15']
    });
    
    // Payment success
    await axios.post(`${BASE_URL}/notifications/templated`, {
      userId: 'test-user-123',
      template: 'payment.success',
      data: ['ORD-123', '24.99']
    });
    
    console.log('✅ Templated notifications sent\n');

    // 4. Get user notifications
    console.log('4. Retrieving user notifications...');
    const notifications = await axios.get(`${BASE_URL}/notifications/test-user-123`);
    console.log(`✅ Retrieved ${notifications.data.notifications.length} notifications\n`);

    console.log('🎉 All tests completed successfully!');
    console.log('📱 Check your phone for SMS messages');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testNotificationService();
}

module.exports = { testNotificationService };

