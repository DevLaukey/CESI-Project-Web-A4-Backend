const express = require("express");
const TemplateController = require("../controllers/templateController");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const rateLimitMiddleware = require("../middleware/rateLimit");
const router = express.Router();

// ================================================================
// ADMIN TEMPLATE MANAGEMENT
// ================================================================

// Create new notification template (admin only)
router.post(
  "/",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  TemplateController.createTemplate
);

// Get all templates with optional filtering
router.get(
  "/",
  auth,
  adminAuth(["admin", "support", "sales"]),
  rateLimitMiddleware.adminRate,
  TemplateController.getTemplates
);

// Get specific template by ID
router.get(
  "/:id",
  auth,
  adminAuth(["admin", "support", "sales"]),
  rateLimitMiddleware.adminRate,
  TemplateController.getTemplate
);

// Update existing template (admin only)
router.put(
  "/:id",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  TemplateController.updateTemplate
);

// Delete/deactivate template (admin only)
router.delete(
  "/:id",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  TemplateController.deleteTemplate
);

// ================================================================
// TEMPLATE TESTING AND UTILITIES
// ================================================================

// Test template rendering with variables
router.post(
  "/:id/test",
  auth,
  adminAuth(["admin", "support", "sales"]),
  rateLimitMiddleware.testRate,
  TemplateController.testTemplate
);

// Preview template with sample data
router.post(
  "/:id/preview",
  auth,
  adminAuth(["admin", "support", "sales"]),
  rateLimitMiddleware.testRate,
  TemplateController.previewTemplate
);

// Validate template syntax
router.post(
  "/validate",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.testRate,
  TemplateController.validateTemplate
);

// ================================================================
// TEMPLATE ANALYTICS
// ================================================================

// Get template usage statistics
router.get(
  "/:id/stats",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  TemplateController.getTemplateStats
);

// Get template performance metrics
router.get(
  "/:id/performance",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  TemplateController.getTemplatePerformance
);

// Get all templates usage overview
router.get(
  "/analytics/overview",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  TemplateController.getTemplatesOverview
);

// ================================================================
// TEMPLATE IMPORT/EXPORT
// ================================================================

// Export templates (admin only)
router.get(
  "/export/all",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  TemplateController.exportTemplates
);

// Import templates (admin only)
router.post(
  "/import",
  auth,
  adminAuth(["admin"]),
  rateLimitMiddleware.adminRate,
  TemplateController.importTemplates
);

// Duplicate existing template
router.post(
  "/:id/duplicate",
  auth,
  adminAuth(["admin", "support"]),
  rateLimitMiddleware.adminRate,
  TemplateController.duplicateTemplate
);

module.exports = router;
