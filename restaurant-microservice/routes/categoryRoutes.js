// routes/categoryRoutes.js
const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");
const CategoryController = require("../controllers/CategoryController");
const authMiddleware = require("../middleware/auth");
const {roleMiddleware} = require("../middleware/roleMiddleware");

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors.array(),
    });
  }
  next();
};

// Validation rules for creating categories
const createCategoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Category name must be between 1 and 100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must be less than 500 characters"),
  body("icon")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Icon must be less than 100 characters"),
  body("color")
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage("Color must be a valid hex color code (#RRGGBB)"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),
  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("sortOrder must be a non-negative integer"),
  body("restaurantIds")
    .optional()
    .isArray()
    .withMessage("restaurantIds must be an array"),
  body("restaurantIds.*")
    .optional()
    .isUUID()
    .withMessage("Each restaurant ID must be a valid UUID"),
];

// Validation rules for updating categories
const updateCategoryValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category name cannot be empty if provided")
    .isLength({ min: 1, max: 100 })
    .withMessage("Category name must be between 1 and 100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must be less than 500 characters"),
  body("icon")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Icon must be less than 100 characters"),
  body("color")
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage("Color must be a valid hex color code (#RRGGBB)"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),
  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("sortOrder must be a non-negative integer"),
  body("restaurantIds")
    .optional()
    .isArray()
    .withMessage("restaurantIds must be an array"),
  body("restaurantIds.*")
    .optional()
    .isUUID()
    .withMessage("Each restaurant ID must be a valid UUID"),
];

// UUID parameter validation
const uuidValidation = [
  param("uuid").isUUID().withMessage("Invalid UUID format"),
];

// Restaurant UUID parameter validation
const restaurantUuidValidation = [
  param("restaurantUuid")
    .isUUID()
    .withMessage("Invalid restaurant UUID format"),
];

// Category UUID parameter validation
const categoryUuidValidation = [
  param("categoryUuid").isUUID().withMessage("Invalid category UUID format"),
];

// Query parameters validation
const queryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("search")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be between 1 and 100 characters"),
  query("isActive")
    .optional()
    .isIn(["true", "false"])
    .withMessage("isActive must be true or false"),
  query("restaurantId")
    .optional()
    .isUUID()
    .withMessage("Restaurant ID must be a valid UUID"),
  query("includeItems")
    .optional()
    .isIn(["true", "false"])
    .withMessage("includeItems must be true or false"),
  query("includeRestaurants")
    .optional()
    .isIn(["true", "false"])
    .withMessage("includeRestaurants must be true or false"),
  query("activeOnly")
    .optional()
    .isIn(["true", "false"])
    .withMessage("activeOnly must be true or false"),
];

// Reorder validation
const reorderValidation = [
  body("categories")
    .isArray({ min: 1 })
    .withMessage("Categories array is required and must not be empty"),
  body("categories.*.uuid")
    .isUUID()
    .withMessage("Each category must have a valid UUID"),
];

// =============================================================================
// PUBLIC ROUTES (No authentication required)
// =============================================================================

/**
 * GET /api/categories
 * Get all categories with filtering and pagination
 */
router.get(
  "/",
  queryValidation,
  handleValidationErrors,
  CategoryController.getAllCategories
);

/**
 * GET /api/categories/:uuid
 * Get a specific category by UUID
 */
router.get(
  "/:uuid",
  uuidValidation,
  query("includeItems").optional().isIn(["true", "false"]),
  query("includeRestaurants").optional().isIn(["true", "false"]),
  handleValidationErrors,
  CategoryController.getCategoryByUuid
);

/**
 * GET /api/categories/restaurant/:restaurantUuid
 * Get all categories associated with a specific restaurant
 */
router.get(
  "/restaurant/:restaurantUuid",
  restaurantUuidValidation,
  query("includeItems").optional().isIn(["true", "false"]),
  query("activeOnly").optional().isIn(["true", "false"]),
  handleValidationErrors,
  CategoryController.getRestaurantCategories
);

// =============================================================================
// PROTECTED ROUTES (Authentication required)
// =============================================================================

/**
 * POST /api/categories
 * Create a new category
 * Requires: admin or restaurant_owner role
 */
router.post(
  "/",
  authMiddleware,
  createCategoryValidation,
  handleValidationErrors,
  CategoryController.createCategory
);

/**
 * PUT /api/categories/:uuid
 * Update an existing category
 * Requires: admin or restaurant_owner role
 */
router.put(
  "/:uuid",
  authMiddleware,
  roleMiddleware(["admin", "restaurant_owner"]),
  uuidValidation,
  updateCategoryValidation,
  handleValidationErrors,
  CategoryController.updateCategory
);

/**
 * DELETE /api/categories/:uuid
 * Delete a category
 * Requires: admin role only
 */
router.delete(
  "/:uuid",
  authMiddleware,
  roleMiddleware(["admin"]),
  uuidValidation,
  handleValidationErrors,
  CategoryController.deleteCategory
);

/**
 * POST /api/categories/reorder
 * Reorder categories by updating their sortOrder
 * Requires: admin or restaurant_owner role
 */
router.post(
  "/reorder",
  authMiddleware,
  roleMiddleware(["admin", "restaurant_owner"]),
  reorderValidation,
  handleValidationErrors,
  CategoryController.reorderCategories
);

// =============================================================================
// RESTAURANT-CATEGORY ASSOCIATION ROUTES
// =============================================================================

/**
 * POST /api/categories/restaurant/:restaurantUuid/:categoryUuid
 * Add a category to a restaurant
 * Requires: admin or restaurant_owner role
 */
router.post(
  "/restaurant/:restaurantUuid/:categoryUuid",
  authMiddleware,
  roleMiddleware(["admin", "restaurant_owner"]),
  restaurantUuidValidation,
  categoryUuidValidation,
  handleValidationErrors,
  CategoryController.addCategoryToRestaurant
);

/**
 * DELETE /api/categories/restaurant/:restaurantUuid/:categoryUuid
 * Remove a category from a restaurant
 * Requires: admin or restaurant_owner role
 */
router.delete(
  "/restaurant/:restaurantUuid/:categoryUuid",
  authMiddleware,
  roleMiddleware(["admin", "restaurant_owner"]),
  restaurantUuidValidation,
  categoryUuidValidation,
  handleValidationErrors,
  CategoryController.removeCategoryFromRestaurant
);

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

router.use((error, req, res, next) => {
  console.error("Category routes error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

module.exports = router;
