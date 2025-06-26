
const express = require('express');
const notificationRoutes = require('./notifications');
const preferencesRoutes = require('./preferences');
const webhookRoutes = require('./webhooks');

const router = express.Router();

// API Routes
router.use('/notifications', notificationRoutes);
router.use('/preferences', preferencesRoutes);
router.use('/webhooks', webhookRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'notification-service',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Service info
router.get('/info', (req, res) => {
  res.json({
    service: 'notification-service',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;