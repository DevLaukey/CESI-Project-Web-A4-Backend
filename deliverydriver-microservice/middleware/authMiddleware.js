const authService = require("../services/authService");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    console.log(token)
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided.",
      });
    }

    // Verify token with auth service
    const authResult = await authService.verifyToken(token);

    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        error: authResult.error || "Invalid token",
      });
    }

    req.user = authResult.user;
    req.driver = authResult.driver;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Authentication service unavailable",
    });
  }
};

module.exports = authMiddleware;
