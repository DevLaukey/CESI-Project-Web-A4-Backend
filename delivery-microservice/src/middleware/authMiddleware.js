const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

/**
 * Authentication Middleware
 * Validates JWT tokens and extracts user information
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing",
      });
    }

    // Extract token from "Bearer <token>" format
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = parts[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      logger.error("JWT_SECRET not configured");
      return res.status(500).json({
        success: false,
        message: "Authentication not properly configured",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret);

    // Check token expiration
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    // Add user information to request
    req.user = {
      id: decoded.id || decoded.user_id,
      email: decoded.email,
      role: decoded.role,
      status: decoded.status,
      restaurant_id: decoded.restaurant_id,
      driver_id: decoded.driver_id,
      permissions: decoded.permissions || [],
    };

    // Log authentication success
    logger.debug(`User authenticated: ${req.user.id}`, {
      role: req.user.role,
      endpoint: req.path,
    });

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    logger.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user info if token is valid, but doesn't require authentication
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  try {
    // Try to authenticate, but don't fail if invalid
    await auth(req, res, next);
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Role-based authentication middleware
 */
const requireRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // First authenticate
      await auth(req, res, () => {
        // Then check role
        if (!allowedRoles.includes(req.user.role)) {
          logger.warn(
            `Access denied for user ${req.user.id} with role ${req.user.role}`,
            {
              requiredRoles: allowedRoles,
              endpoint: req.path,
            }
          );

          return res.status(403).json({
            success: false,
            message: "Insufficient permissions",
          });
        }

        next();
      });
    } catch (error) {
      // Authentication already handled the error
      return;
    }
  };
};

/**
 * Check if user is active
 */
const requireActiveUser = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.status !== "active") {
    return res.status(403).json({
      success: false,
      message: "Account not active",
    });
  }

  next();
};

/**
 * Refresh token middleware
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token required",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    const decoded = jwt.verify(refresh_token, jwtSecret);

    // Generate new access token
    const newToken = jwt.sign(
      {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        status: decoded.status,
        restaurant_id: decoded.restaurant_id,
        driver_id: decoded.driver_id,
      },
      jwtSecret,
      { expiresIn: "1h" }
    );

    req.newToken = newToken;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};

/**
 * Generate JWT token
 */
const generateToken = (user, expiresIn = "1h") => {
  const jwtSecret = process.env.JWT_SECRET;

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      restaurant_id: user.restaurant_id,
      driver_id: user.driver_id,
      permissions: user.permissions,
    },
    jwtSecret,
    { expiresIn }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET;

  return jwt.sign(
    {
      id: user.id,
      type: "refresh",
    },
    jwtSecret,
    { expiresIn: "7d" }
  );
};

/**
 * Validate token without middleware (for internal use)
 */
const validateToken = (token) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
};

// Export auth as default export for easy import
module.exports = auth;

// Also export all functions as named exports
module.exports.auth = auth;
module.exports.optionalAuth = optionalAuth;
module.exports.requireRole = requireRole;
module.exports.requireActiveUser = requireActiveUser;
module.exports.refreshToken = refreshToken;
module.exports.generateToken = generateToken;
module.exports.generateRefreshToken = generateRefreshToken;
module.exports.validateToken = validateToken;
