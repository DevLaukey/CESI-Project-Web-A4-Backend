const adminAuth = (allowedRoles = ["admin"]) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        required_roles: allowedRoles,
        user_role: req.user.role,
      });
    }

    next();
  };
};

module.exports = adminAuth;
