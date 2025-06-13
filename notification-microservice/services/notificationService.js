const Notification = require('../models/Notification');
const NotificationTemplate = require('../models/NotificationTemplate');
const Device = require('../models/Device');
const pushService = require('./pushService');
const smsService = require('./smsService');
const logger = require('../utils/logger');
const externalServices = require('./externalServices');

class NotificationService {
  // Main method to send notification through all channels
  static async sendNotification(notification) {
    const results = {};

    try {
      logger.info(`Processing notification ${notification.id} for user ${notification.user_id} via channels: ${notification.channels.join(', ')}`);

      // Send through each specified channel
      for (const channel of notification.channels) {
        try {
          switch (channel) {
            case 'push':
              results.push = await this.sendPushNotification(notification);
              break;
            case 'sms':
              results.sms = await this.sendSMSNotification(notification);
              break;
            case 'in_app':
              results.in_app = { 
                status: 'sent', 
                message: 'In-app notification stored',
                timestamp: new Date().toISOString()
              };
              break;
            case 'socket':
              results.socket = { 
                status: 'pending', 
                message: 'Will be sent via WebSocket',
                timestamp: new Date().toISOString()
              };
              break;
            default:
              logger.warn(`Unknown notification channel: ${channel}`);
              continue;
          }

          // Update delivery status
          await Notification.updateDeliveryStatus(
            notification.id, 
            channel, 
            results[channel]?.status || 'sent',
            results[channel]?.error || null
          );

        } catch (channelError) {
          logger.error(`Failed to send ${channel} notification:`, channelError);
          results[channel] = { 
            status: 'failed', 
            error: channelError.message,
            timestamp: new Date().toISOString()
          };

          await Notification.updateDeliveryStatus(
            notification.id, 
            channel, 
            'failed', 
            channelError.message
          );
        }
      }

      return results;

    } catch (error) {
      logger.error('Send notification error:', error);
      throw error;
    }
  }

  // Send push notification
  static async sendPushNotification(notification) {
    try {
      const devices = await Device.findByUser(notification.user_id, true);
      
      if (devices.length === 0) {
        return { 
          status: 'skipped', 
          message: 'No active devices found',
          devices_targeted: 0
        };
      }

      const pushPayload = {
        title: notification.title,
        message: notification.message,
        data: {
          notification_id: notification.id,
          type: notification.type,
          action_url: notification.action_url,
          ...notification.data
        },
        priority: notification.priority,
        sound: notification.sound,
        badge: notification.badge_count,
        action_url: notification.action_url,
        image_url: notification.image_url
      };

      const results = [];
      let successCount = 0;

      for (const device of devices) {
        try {
          const result = await pushService.sendToDevice(
            device.device_token, 
            pushPayload, 
            device.device_type
          );
          
          results.push({ 
            device_id: device.id, 
            device_type: device.device_type,
            ...result 
          });

          if (result.status === 'sent') {
            successCount++;
            // Update device last seen
            await Device.updateLastSeen(device.device_token);
          }

        } catch (deviceError) {
          logger.error(`Push notification failed for device ${device.id}:`, deviceError);
          results.push({ 
            device_id: device.id, 
            device_type: device.device_type,
            status: 'failed', 
            error: deviceError.message 
          });

          // Deactivate invalid tokens
          if (this.isInvalidTokenError(deviceError)) {
            await Device.deactivateByToken(device.device_token);
            logger.info(`Deactivated invalid device token: ${device.id}`);
          }
        }
      }

      return {
        status: successCount > 0 ? 'sent' : 'failed',
        devices_targeted: devices.length,
        successful_deliveries: successCount,
                failed_deliveries: devices.length - successCount,
                results: results
            };
    }
    catch (error) {
      logger.error('Push notification error:', error);
      throw error;
        }
    }
// Send SMS notification
    
    static async sendSMSNotification(notification) {

        try {
            const result = await smsService.sendSMS({
                to: notification.user_id,
                message: notification.message,
                data: notification.data
            });

            return {
                status: result.status,
                message: result.message,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            logger.error('SMS notification error:', error);
            throw error;
        }
    }
// Check if error indicates an invalid token
    static isInvalidTokenError(error) {
        return error.message.includes('invalid token');
    }
// Get notification template by ID
    static async getTemplateById(templateId) {
        try {
            const template = await NotificationTemplate.findById(templateId);
            if (!template) {
                throw new Error(`Template not found: ${templateId}`);
            }
            return template;
        }
        catch (error) {
            logger.error(`Error fetching template ${templateId}:`, error);
            throw error;
        }
    }
// Get notification template by name
    static async getTemplateByName(name) {
        try {
            const template = await NotificationTemplate.findByName(name);
            if (!template) {
                throw new Error(`Template not found: ${name}`);
            }
            return template;
        } catch (error) {
            logger.error(`Error fetching template by name ${name}:`, error);
            throw error;
        }
    }
// Get notification template by type
    static async getTemplatesByType(type) {
        try {
            const templates = await NotificationTemplate.findByType(type);
            return templates;
        } catch (error) {
            logger.error(`Error fetching templates by type ${type}:`, error);
            throw error;
        }
    }
// Render notification template with variables
    static async renderTemplate(templateId, variables = {}) {
        try {
            const template = await this.getTemplateById(templateId);
            return NotificationTemplate.renderTemplate(template.id, variables);
        } catch (error) {
            logger.error(`Error rendering template ${templateId}:`, error);
            throw error;
        }
    }
// Create a new notification
    static async createNotification(notificationData) {
        try {
            const notification = await Notification.create(notificationData);
            return notification;
        } catch (error) {
            logger.error('Error creating notification:', error);
            throw error;
        }
    }
// Update notification delivery status
    static async updateDeliveryStatus(notificationId, channel, status, error = null) {
        try {
            await Notification.updateDeliveryStatus(notificationId, channel, status, error);
            return { status: 'success', message: 'Delivery status updated' };
        } catch (error) {
            logger.error(`Error updating delivery status for notification ${notificationId}:`, error);
            throw error;
        }
    }
}
module.exports = NotificationService;