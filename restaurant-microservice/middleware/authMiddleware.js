const jwt = require("jsonwebtoken");
const axios = require("axios");

/**
 * Authentication middleware that validates JWT tokens
 * Can work independently or communicate with User microservice
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access token required",
        message: "Please provide a valid authentication token",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // For restaurant microservice, we mainly need the user UUID
    // We can optionally call User microservice for full user data
    if (process.env.USER_SERVICE_URL) {
      try {
        const userResponse = await axios.get(
          `${process.env.USER_SERVICE_URL}/api/users/internal/${decoded.uuid}`,
          { timeout: 5000 }
        );

        if (userResponse.data.success) {
          req.user = userResponse.data.user;
        } else {
          // Fallback to token data if user service is unavailable
          req.user = { uuid: decoded.uuid, userType: decoded.userType };
        }
      } catch (error) {
        console.warn(
          "User service unavailable, using token data:",
          error.message
        );
        req.user = { uuid: decoded.uuid, userType: decoded.userType };
      }
    } else {
      // Use token data directly
      req.user = { uuid: decoded.uuid, userType: decoded.userType };
    }

    // Attach user info to request headers for downstream services
    req.headers["x-user-id"] = req.user.uuid;
    req.headers["x-user-type"] = req.user.userType;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
        message: "The provided authentication token is invalid",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired",
        message: "Authentication token has expired. Please login again.",
      });
    }

    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      error: "Authentication error",
      message: "An error occurred during authentication",
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require authentication
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { uuid: decoded.uuid, userType: decoded.userType };
      req.headers["x-user-id"] = req.user.uuid;
      req.headers["x-user-type"] = req.user.userType;
    }

    next();
  } catch (error) {
    // Silently ignore auth errors for optional auth
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
};
