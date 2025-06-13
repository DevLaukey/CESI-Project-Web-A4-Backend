const Notification = require('../models/Notification');
const NotificationTemplate = require('../models/NotificationTemplate');
const logger = require('../utils/logger');
const { validateNotification, validateBulkNotification } = require('../validators/notificationValidator');
const notificationService = require('../services/notificationService');

class NotificationController {
  // Send notification (internal service calls)
  static async sendNotification(req, res) {
    try {
      const { error, value } = validateNotification(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Check if using template
      let notificationData = value;
      if (value.template_name) {
        const template = await NotificationTemplate.findByName(value.template_name);
        if (!template) {
          return res.status(404).json({
            success: false,
            message: 'Template not found'
          });
        }

        const rendered = await NotificationTemplate.renderTemplate(template.id, value.variables || {});
        if (rendered) {
          notificationData = { 
            ...value, 
            ...rendered,
            template_id: template.id
          };
          delete notificationData.template_name;
          delete notificationData.variables;
        }
      }

      // Create notification record
      const notification = await Notification.create(notificationData);

      // Send through various channels
      const results = await notificationService.sendNotification(notification);

      // Real-time notification via WebSocket
      const socketManager = req.app.get('socketManager');
      if (socketManager) {
        const realTimeData = {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          data: notification.data,
          action_url: notification.action_url,
          image_url: notification.image_url,
          created_at: notification.created_at
        };

        const sent = socketManager.sendToUser(notification.user_id, 'notification', realTimeData);
        if (sent) {
          await Notification.updateDeliveryStatus(notification.id, 'socket', 'sent');
        }
      }

      logger.info(`Notification sent: ${notification.id} to user: ${notification.user_id}`);

      res.status(201).json({
        success: true,
        message: 'Notification sent successfully',
        data: {
          notification_id: notification.id,
          delivery_results: results
        }
      });

    } catch (error) {
      logger.error('Send notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Send bulk notifications
  static async sendBulkNotifications(req, res) {
    try {
      const { error, value } = validateBulkNotification(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const results = await notificationService.sendBulkNotifications(value);

      res.json({
        success: true,
        message: `Bulk notifications processed`,
        data: {
          total_requested: value.notifications.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results: results
        }
      });

    } catch (error) {
      logger.error('Send bulk notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user notifications
  static async getUserNotifications(req, res) {
    try {
      const { page = 1, limit = 20, type, is_read, priority, include_expired = false } = req.query;
      const offset = (page - 1) * limit;

      const options = {
        limit: parseInt(limit),
        offset: offset,
        type: type,
        is_read: is_read === 'true' ? true : is_read === 'false' ? false : null,
        priority: priority,
        include_expired: include_expired === 'true'
      };

      const notifications = await Notification.findByUser(req.user.id, options);
      const unreadCount = await Notification.getUnreadCount(req.user.id);

      res.json({
        success: true,
        data: notifications,
        unread_count: unreadCount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: notifications.length,
          has_more: notifications.length === parseInt(limit)
        }
      });

    } catch (error) {
      logger.error('Get user notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Mark notification as read
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      
      const success = await Notification.markAsRead(id, req.user.id);
      
      if (success) {
        // Update real-time unread count
        const socketManager = req.app.get('socketManager');
        if (socketManager) {
          const unreadCount = await Notification.getUnreadCount(req.user.id);
          socketManager.sendToUser(req.user.id, 'unread_count', { count: unreadCount });
        }

        res.json({
          success: true,
          message: 'Notification marked as read'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

    } catch (error) {
      logger.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(req, res) {
    try {
      const { type } = req.query;
      
      const updatedCount = await Notification.markAllAsRead(req.user.id, type);

      // Update real-time unread count
      const socketManager = req.app.get('socketManager');
      if (socketManager) {
        const unreadCount = await Notification.getUnreadCount(req.user.id);
        socketManager.sendToUser(req.user.id, 'unread_count', { count: unreadCount });
      }

      res.json({
        success: true,
        message: `${updatedCount} notifications marked as read`,
        data: { updated_count: updatedCount }
      });

    } catch (error) {
      logger.error('Mark all as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get unread count
  static async getUnreadCount(req, res) {
    try {
      const { type } = req.query;
      const count = await Notification.getUnreadCount(req.user.id, type);

      res.json({
        success: true,
        data: { count }
      });

    } catch (error) {
      logger.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get notification statistics (admin only)
  static async getNotificationStats(req, res) {
    try {
      if (!['admin', 'support'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const { start_date, end_date } = req.query;
      const stats = await Notification.getNotificationStats(start_date, end_date);

      // Get additional stats
      const additionalStats = await notificationService.getSystemStats(start_date, end_date);

      res.json({
        success: true,
        data: {
          ...stats,
          ...additionalStats
        }
      });

    } catch (error) {
      logger.error('Get notification stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Send notification to restaurant
  static async sendToRestaurant(req, res) {
    try {
      const { restaurant_id, ...notificationData } = req.body;

      if (!restaurant_id) {
        return res.status(400).json({
          success: false,
          message: 'Restaurant ID is required'
        });
      }

      // Create notification for restaurant
      const notification = await Notification.create({
        user_id: restaurant_id,
        user_type: 'restaurant',
        ...notificationData
      });

      // Send through various channels
      const results = await notificationService.sendNotification(notification);

      // Real-time notification
      const socketManager = req.app.get('socketManager');
      if (socketManager) {
        const realTimeData = {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          data: notification.data,
          action_url: notification.action_url,
          created_at: notification.created_at
        };

        const sent = socketManager.sendToRestaurant(restaurant_id, 'notification', realTimeData);
        if (sent) {
          await Notification.updateDeliveryStatus(notification.id, 'socket', 'sent');
        }
      }

      res.status(201).json({
        success: true,
        message: 'Restaurant notification sent successfully',
        data: { 
          notification_id: notification.id, 
          delivery_results: results 
        }
      });

    } catch (error) {
      logger.error('Send restaurant notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Send broadcast notification
  static async sendBroadcast(req, res) {
    try {
      if (!['admin', 'sales'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const { target_audience, ...notificationData } = req.body;

      const result = await notificationService.sendBroadcastNotification({
        target_audience: target_audience || 'all',
        ...notificationData
      });

      res.json({
        success: true,
        message: 'Broadcast notification sent successfully',
        data: result
      });

    } catch (error) {
      logger.error('Send broadcast notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete notification
  static async deleteNotification(req, res) {
    try {
      const { id } = req.params;

      // Check if notification belongs to user
      const notification = await Notification.findById(id);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      if (notification.user_id !== req.user.id && !['admin', 'support'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Soft delete by marking as read and expired
      await Notification.updateStatus(id, { 
        is_read: true, 
        expires_at: new Date() 
      });

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });

    } catch (error) {
      logger.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get notification preferences
  static async getNotificationPreferences(req, res) {
    try {
      const preferences = await notificationService.getUserPreferences(req.user.id);

      res.json({
        success: true,
        data: preferences
      });

    } catch (error) {
      logger.error('Get notification preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update notification preferences
  static async updateNotificationPreferences(req, res) {
    try {
      const { preferences } = req.body;

      await notificationService.updateUserPreferences(req.user.id, preferences);

      res.json({
        success: true,
        message: 'Notification preferences updated successfully'
      });

    } catch (error) {
      logger.error('Update notification preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = NotificationController;

