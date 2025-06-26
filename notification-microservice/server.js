
```

---

## Middleware

### src/middleware/auth.js
```javascript
const jwt = require('jsonwebtoken');

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

// Optional auth middleware - doesn't fail if no token
const optionalAuthMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.user = decoded;
    } catch (error) {
      // Ignore invalid tokens in optional auth
    }
  }
  
  next();
};

module.exports = authMiddleware;
module.exports.optional = optionalAuthMiddleware;
```

### src/middleware/validation.js
```javascript
const { body, param, query } = require('express-validator');

const validateNotification = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('userType').isIn(['customer', 'restaurant', 'driver']).withMessage('Invalid user type'),
  body('message').notEmpty().isLength({ max: 1600 }).withMessage('Message is required and must be under 1600 characters'),
  body('type').isIn(['order', 'delivery', 'payment', 'system']).withMessage('Invalid notification type'),
  body('data').optional().isObject().withMessage('Data must be an object')
];

const validateTemplatedNotification = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('userType').optional().isIn(['customer', 'restaurant', 'driver']).withMessage('Invalid user type'),
  body('template').notEmpty().matches(/^\w+\.\w+$/).withMessage('Template must be in format "category.type"'),
  body('data').isArray().withMessage('Template data must be an array')
];

const validateBulkNotification = [
  body('userIds').isArray({ min: 1, max: 1000 }).withMessage('User IDs must be an array with 1-1000 items'),
  body('message').notEmpty().isLength({ max: 1600 }).withMessage('Message is required and must be under 1600 characters'),
  body('type').optional().isIn(['order', 'delivery', 'payment', 'system']).withMessage('Invalid notification type'),
  body('options.batchSize').optional().isInt({ min: 1, max: 50 }).withMessage('Batch size must be between 1-50'),
  body('options.delay').optional().isInt({ min: 0 }).withMessage('Delay must be a positive integer')
];

const validatePreferences = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('phone').matches(/^\+[1-9]\d{1,14}$/).withMessage('Phone must be in E.164 format'),
  body('smsEnabled').optional().isBoolean().withMessage('SMS enabled must be boolean'),
  body('orderNotifications').optional().isBoolean().withMessage('Order notifications must be boolean'),
  body('deliveryNotifications').optional().isBoolean().withMessage('Delivery notifications must be boolean'),
  body('paymentNotifications').optional().isBoolean().withMessage('Payment notifications must be boolean'),
  body('systemNotifications').optional().isBoolean().withMessage('System notifications must be boolean'),
  body('quietHours.enabled').optional().isBoolean().withMessage('Quiet hours enabled must be boolean'),
  body('quietHours.startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
  body('quietHours.endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
  body('quietHours.timezone').optional().isString().withMessage('Timezone must be a string')
];

const validatePhoneTest = [
  body('phone').notEmpty().withMessage('Phone number is required')
];

module.exports = {
  validateNotification,
  validateTemplatedNotification,
  validateBulkNotification,
  validatePreferences,
  validatePhoneTest
};
```

### src/middleware/errorHandler.js
```javascript
const errorHandler = (err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: 'Duplicate entry',
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
```

---

## Configuration

### src/config/database.js
```javascript

```

### src/config/twilio.js
```javascript
module.exports = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  webhookUrl: process.env.TWILIO_WEBHOOK_URL,
  
  // Validate configuration
  isConfigured() {
    return !!(this.accountSid && this.authToken && this.phoneNumber);
  },

  // Get missing configuration
  getMissingConfig() {
    const missing = [];
    if (!this.accountSid) missing.push('TWILIO_ACCOUNT_SID');
    if (!this.authToken) missing.push('TWILIO_AUTH_TOKEN');
    if (!this.phoneNumber) missing.push('TWILIO_PHONE_NUMBER');
    return missing;
  }
};
```

---

## Utilities

### src/utils/constants.js
```javascript
const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  SCHEDULED: 'scheduled'
};

const NOTIFICATION_TYPES = {
  ORDER: 'order',
  DELIVERY: 'delivery',
  PAYMENT: 'payment',
  SYSTEM: 'system'
};

const USER_TYPES = {
  CUSTOMER: 'customer',
  RESTAURANT: 'restaurant',
  DRIVER: 'driver'
};

const API_LIMITS = {
  BULK_NOTIFICATION_MAX: 1000,
  NOTIFICATION_MESSAGE_MAX: 1600,
  RETRY_MAX_ATTEMPTS: 3,
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100 // requests per window
};

module.exports = {
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPES,
  USER_TYPES,
  API_LIMITS
};
```

---

## Main Server File

### server.js
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDatabase } = require('./src/config/database');
const twilioConfig = require('./src/config/twilio');
const routes = require('./src/routes');
const errorHandler = require('./src/middleware/errorHandler');
const { API_LIMITS } = require('./src/utils/constants');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: API_LIMITS.RATE_LIMIT_WINDOW,
  max: API_LIMITS.RATE_LIMIT_MAX,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Database connection
connectDatabase();

// Check Twilio configuration
if (!twilioConfig.isConfigured()) {
  console.warn('⚠️  Twilio not configured. Missing:', twilioConfig.getMissingConfig());
} else {
  console.log(`✅ Twilio configured with phone: ${twilioConfig.phoneNumber}`);
}

// Routes
app.use('/api', routes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3007;
const server = app.listen(PORT, () => {
  console.log(`🚀 Notification service running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('💤 Process terminated');
    process.exit(0);
  });
});

module.exports = app;
