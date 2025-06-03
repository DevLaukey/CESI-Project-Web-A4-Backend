/**
 * Role-based authorization middleware
 * @param {Array} allowedRoles - Array of user types that can access the route
 * @returns {Function} Express middleware function
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        message: "Please login to access this resource",
      });
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
        userRole: req.user.userType,
      });
    }

    next();
  };
};

/**
 * Admin role middleware - shorthand for admin roles
 */
const adminMiddleware = roleMiddleware(["sales_dept", "tech_support"]);

/**
 * Driver role middleware - shorthand for delivery drivers
 */
const driverMiddleware = roleMiddleware(["delivery_driver"]);

/**
 * Restaurant owner middleware
 */
const restaurantOwnerMiddleware = roleMiddleware(["restaurant_owner"]);

/**
 * Self or admin middleware - allows access to own resources or admin access
 */
const selfOrAdminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
      message: "Please login to access this resource",
    });
  }

  const targetUuid = req.params.uuid || req.params.userId;
  const isAdmin = ["sales_dept", "tech_support"].includes(req.user.userType);
  const isSelf = req.user.uuid === targetUuid;

  if (!isAdmin && !isSelf) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      message:
        "You can only access your own resources or contact an administrator",
    });
  }

  next();
};

module.exports = {
  roleMiddleware,
  adminMiddleware,
  driverMiddleware,
  restaurantOwnerMiddleware,
  selfOrAdminMiddleware,
};
