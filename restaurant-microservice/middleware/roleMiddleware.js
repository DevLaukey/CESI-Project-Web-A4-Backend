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
 * Restaurant owner middleware - ensures only restaurant owners can access
 */
const restaurantOwnerMiddleware = roleMiddleware(["restaurant_owner"]);

/**
 * Admin middleware - for sales and tech support staff
 */
const adminMiddleware = roleMiddleware(["sales_dept", "tech_support"]);

/**
 * Developer middleware - for third-party developers
 */
const developerMiddleware = roleMiddleware(["developer"]);

/**
 * Staff middleware - for internal staff (sales and tech support)
 */
const staffMiddleware = roleMiddleware(["sales_dept", "tech_support"]);

module.exports = {
  roleMiddleware,
  restaurantOwnerMiddleware,
  adminMiddleware,
  developerMiddleware,
  staffMiddleware,
};
