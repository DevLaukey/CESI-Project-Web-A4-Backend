const NotificationService = require("../services/NotificationService");
const MessageTemplateService = require("../services/MessageTemplateService");
const { validationResult } = require("express-validator");

class NotificationController {
  async createNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const result = await NotificationService.createNotification(req.body);

      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        error: "Failed to create notification",
        message: error.message,
      });
    }
  }

  async sendTemplatedNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { userId, userType = "customer", template, data } = req.body;

      const result = await NotificationService.sendTemplatedNotification(
        userId,
        userType,
        template,
        data
      );

      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        error: "Failed to send templated notification",
        message: error.message,
      });
    }
  }

  async getUserNotifications(req, res) {
    try {
      const { userId } = req.params;
      const options = {
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0,
        status: req.query.status,
        type: req.query.type,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };

      const result = await NotificationService.getUserNotifications(
        userId,
        options
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: "Failed to retrieve notifications",
        message: error.message,
      });
    }
  }

  async retryNotification(req, res) {
    try {
      const { notificationId } = req.params;

      const result = await NotificationService.retryFailedNotification(
        notificationId
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: "Failed to retry notification",
        message: error.message,
      });
    }
  }

  async bulkNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { userIds, message, type = "system", options = {} } = req.body;

      const result = await NotificationService.bulkNotification(
        userIds,
        message,
        type,
        options
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: "Failed to send bulk notifications",
        message: error.message,
      });
    }
  }

  async getNotificationStats(req, res) {
    try {
      const options = {
        userId: req.query.userId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        groupBy: req.query.groupBy || "day",
      };

      const stats = await NotificationService.getNotificationStats(options);
      res.json(stats);
    } catch (error) {
      res.status(500).json({
        error: "Failed to retrieve notification statistics",
        message: error.message,
      });
    }
  }

  async getAvailableTemplates(req, res) {
    try {
      const templates = MessageTemplateService.getAvailableTemplates();
      res.json({ templates });
    } catch (error) {
      res.status(500).json({
        error: "Failed to retrieve templates",
        message: error.message,
      });
    }
  }
}

module.exports = new NotificationController();
