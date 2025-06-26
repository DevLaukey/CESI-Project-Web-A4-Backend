
const NotificationService = require('../services/NotificationService');
const { NOTIFICATION_STATUS } = require('../utils/constants');

class WebhookController {
  async handleTwilioWebhook(req, res) {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
      
      console.log(`📱 Twilio webhook: ${MessageSid} -> ${MessageStatus}`);
      
      // Map Twilio status to our status
      let status;
      switch (MessageStatus) {
        case 'delivered':
          status = NOTIFICATION_STATUS.DELIVERED;
          break;
        case 'failed':
        case 'undelivered':
          status = NOTIFICATION_STATUS.FAILED;
          break;
        case 'sent':
        case 'queued':
        case 'accepted':
          status = NOTIFICATION_STATUS.SENT;
          break;
        default:
          status = MessageStatus;
      }

      // Update notification status
      await NotificationService.updateNotificationStatus(
        MessageSid, 
        status, 
        { 
          errorCode: ErrorCode,
          errorMessage: ErrorMessage 
        }
      );
      
      res.sendStatus(200);
    } catch (error) {
      console.error('Webhook processing failed:', error);
      res.status(500).json({ 
        error: 'Webhook processing failed', 
        message: error.message 
      });
    }
  }

  async handleDeliveryStatusWebhook(req, res) {
    try {
      // Handle delivery status updates from other services
      const { orderId, status, driverId, customerId } = req.body;
      
      // Logic to send appropriate notifications based on delivery status
      switch (status) {
        case 'driver_assigned':
          // Notify customer about driver assignment
          break;
        case 'picked_up':
          // Notify customer about pickup
          break;
        case 'delivered':
          // Notify customer about delivery completion
          break;
        default:
          console.log(`Unknown delivery status: ${status}`);
      }
      
      res.sendStatus(200);
    } catch (error) {
      console.error('Delivery webhook processing failed:', error);
      res.status(500).json({ 
        error: 'Delivery webhook processing failed', 
        message: error.message 
      });
    }
  }
}

module.exports = new WebhookController();