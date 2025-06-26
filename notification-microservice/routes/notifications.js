

const express = require('express');
const NotificationController = require('../controllers/NotificationController');
const authMiddleware = require('../middleware/auth');
const { 
  validateNotification, 
  validateTemplatedNotification,
  validateBulkNotification 
} = require('../middleware/validation');

const router = express.Router();

// Create notification
router.post('/', 
  validateNotification,
  NotificationController.createNotification
);

// Send templated notification
router.post('/templated', 
  validateTemplatedNotification,
  NotificationController.sendTemplatedNotification
);

// Bulk notifications
router.post('/bulk', 
  authMiddleware, // Require auth for bulk operations
  validateBulkNotification,
  NotificationController.bulkNotification
);

// Get user notifications
router.get('/:userId', 
  NotificationController.getUserNotifications
);

// Retry failed notification
router.post('/:notificationId/retry', 
  authMiddleware,
  NotificationController.retryNotification
);

// Get notification statistics
router.get('/stats/overview', 
  authMiddleware,
  NotificationController.getNotificationStats
);

// Get available templates
router.get('/templates/list', 
  NotificationController.getAvailableTemplates
);

module.exports = router;