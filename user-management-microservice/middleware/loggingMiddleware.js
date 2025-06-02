const fs = require("fs");
const path = require("path");

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Request logging middleware
 */
const loggingMiddleware = (req, res, next) => {
  const start = Date.now();

  // Log request
  const requestLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    userId: req.user?.id || null,
    userType: req.user?.userType || null,
    contentLength: req.get("Content-Length") || 0,
  };

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const duration = Date.now() - start;

    const responseLog = {
      ...requestLog,
      statusCode: res.statusCode,
      responseTime: duration,
      responseSize: res.get("Content-Length") || 0,
    };

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      const color = res.statusCode >= 400 ? "\x1b[31m" : "\x1b[32m"; // Red for errors, green for success
      console.log(
        `${color}${responseLog.method} ${responseLog.url} ${responseLog.statusCode} - ${duration}ms\x1b[0m`
      );
    }

    // Log to file
    const logEntry = JSON.stringify(responseLog) + "\n";
    const logFile = path.join(
      logsDir,
      `access-${new Date().toISOString().split("T")[0]}.log`
    );

    fs.appendFile(logFile, logEntry, (err) => {
      if (err) console.error("Failed to write to log file:", err);
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Security logging middleware for sensitive operations
 */
const securityLoggingMiddleware = (operation) => {
  return (req, res, next) => {
    const securityLog = {
      timestamp: new Date().toISOString(),
      operation,
      userId: req.user?.id || null,
      userType: req.user?.userType || null,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
      success: null, // Will be updated after operation
    };

    // Store original json method to intercept response
    const originalJson = res.json;
    res.json = function (data) {
      securityLog.success = data.success || false;
      securityLog.statusCode = res.statusCode;

      // Log security event
      const logEntry = JSON.stringify(securityLog) + "\n";
      const logFile = path.join(
        logsDir,
        `security-${new Date().toISOString().split("T")[0]}.log`
      );

      fs.appendFile(logFile, logEntry, (err) => {
        if (err) console.error("Failed to write to security log:", err);
      });

      originalJson.call(this, data);
    };

    next();
  };
};

module.exports = {
  loggingMiddleware,
  securityLoggingMiddleware,
};
