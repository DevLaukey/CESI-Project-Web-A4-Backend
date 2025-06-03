const { authMiddleware, optionalAuthMiddleware } = require("./authMiddleware");
const {
  roleMiddleware,
  restaurantOwnerMiddleware,
  adminMiddleware,
  developerMiddleware,
  staffMiddleware,
} = require("./roleMiddleware");
const { rateLimitMiddleware } = require("./rateLimitMiddleware");
const {
  validateMiddleware,
  validateUuidParam,
  validatePagination,
  validateSearch,
} = require("./validationMiddleware");
const { uploadMiddleware, handleUploadError } = require("./uploadMiddleware");
const {
  errorHandler,
  notFoundHandler,
  asyncHandler,
} = require("./errorHandler");
const corsMiddleware = require("./corsMiddleware");

module.exports = {
  // Authentication
  authMiddleware,
  optionalAuthMiddleware,

  // Authorization
  roleMiddleware,
  restaurantOwnerMiddleware,
  adminMiddleware,
  developerMiddleware,
  staffMiddleware,

  // Rate Limiting
  rateLimitMiddleware,

  // Validation
  validateMiddleware,
  validateUuidParam,
  validatePagination,
  validateSearch,

  // File Upload
  uploadMiddleware,
  handleUploadError,

  // Error Handling
  errorHandler,
  notFoundHandler,
  asyncHandler,

  // CORS
  corsMiddleware,
};
