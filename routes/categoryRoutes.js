const express = require("express");
const router = express.Router();
const CategoryController = require("../controllers/CategoryController");
const { authMiddleware, adminMiddleware } = require("../middleware");

// Public routes
router.get("/", CategoryController.getAllCategories);
router.get("/:uuid", CategoryController.getCategory);

// Admin routes (for managing global categories)
router.use(authMiddleware);
router.use(adminMiddleware); // Only admins can manage categories

router.post("/", CategoryController.createCategory);
router.put("/:uuid", CategoryController.updateCategory);
router.delete("/:uuid", CategoryController.deleteCategory);
router.patch("/:uuid/status", CategoryController.toggleStatus);
router.patch("/bulk/reorder", CategoryController.reorderCategories);

module.exports = router;
