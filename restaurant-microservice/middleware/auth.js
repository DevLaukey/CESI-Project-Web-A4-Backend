const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const userId = req.headers["x-user-id"];

    if (!token && !userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        message: "Please provide authentication token or user ID",
      });
    }

    // Simple auth for now
    req.user = { uuid: userId || "default-user" };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Invalid authentication",
    });
  }
};

module.exports = authMiddleware;
