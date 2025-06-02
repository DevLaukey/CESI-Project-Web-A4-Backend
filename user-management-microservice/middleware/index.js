const { authMiddleware, optionalAuthMiddleware } = require("./authMiddleware");
const {
  roleMiddleware,
  adminMiddleware,
  driverMiddleware,
  restaurantOwnerMiddleware,
  selfOrAdminMiddleware,
} = require("./roleMiddleware");
const { rateLimitMiddleware } = require("./rateLimitMiddleware");
const {
  validateMiddleware,
  validateUuidParam,
  validatePagination,
} = require("./validationMiddleware");
const { uploadMiddleware, handleUploadError } = require("./uploadMiddleware");
const {
  errorHandler,
  notFoundHandler,
  asyncHandler,
} = require("./errorHandler");
const {
  loggingMiddleware,
  securityLoggingMiddleware,
} = require("./loggingMiddleware");

module.exports = {
  // Authentication
  authMiddleware,
  optionalAuthMiddleware,

  // Authorization
  roleMiddleware,
  adminMiddleware,
  driverMiddleware,
  restaurantOwnerMiddleware,
  selfOrAdminMiddleware,

  // Rate Limiting
  rateLimitMiddleware,

  // Validation
  validateMiddleware,
  validateUuidParam,
  validatePagination,

  // File Upload
  uploadMiddleware,
  handleUploadError,

  // Error Handling
  errorHandler,
  notFoundHandler,
  asyncHandler,

  // Logging
  loggingMiddleware,
  securityLoggingMiddleware,
};
