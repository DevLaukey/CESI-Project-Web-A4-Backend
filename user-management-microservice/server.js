const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { sequelize } = require('./models');
const apiRoutes = require('./routes'); // Main router
const { errorHandler } = require('./middleware/errorHandler');
const swaggerSetup = require('./config/swagger');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Swagger Documentation
swaggerSetup(app);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'User Management Service API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/api/health',
    endpoints: {
      authentication: '/api/auth',
      users: '/api/users'
    }
  });
});

// Mount API routes
app.use('/api', apiRoutes);

// Error Handler
app.use(errorHandler);

// Global 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    suggestion: 'Check the API documentation at /api-docs'
  });
});

const PORT = process.env.PORT || 3001;

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    
    sequelize.close().then(() => {
      console.log('Database connection closed.');
      process.exit(0);
    }).catch((err) => {
      console.error('Error during database shutdown:', err);
      process.exit(1);
    });
  });
};

// Start Server
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync database models
    await sequelize.sync({ 
      alter: process.env.NODE_ENV === 'development',
      force: process.env.DB_FORCE_SYNC === 'true' 
    });
    console.log('✅ Database models synchronized.');

    const server = app.listen(PORT, () => {
      console.log(`🚀 User Management Service running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`📊 Service Info: http://localhost:${PORT}/api/info`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;