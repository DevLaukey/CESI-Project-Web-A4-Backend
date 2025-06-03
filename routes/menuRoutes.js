const express = require("express");
const router = express.Router();
const MenuController = require("../controllers/MenuController");
const { authMiddleware } = require("../middleware");

// Public routes
router.get(
  "/restaurant/:restaurantUuid",
  MenuController.getPublicRestaurantMenus
);

// Protected routes (owner only)
router.use(authMiddleware);

// Owner menu management
router.post("/", MenuController.createMenu);
router.get("/owner/restaurant", MenuController.getRestaurantMenus);
router.get("/:menuUuid", MenuController.getMenu);
router.put("/:menuUuid", MenuController.updateMenu);
router.delete("/:menuUuid", MenuController.deleteMenu);
router.patch("/:menuUuid/availability", MenuController.toggleAvailability);
router.post("/:menuUuid/duplicate", MenuController.duplicateMenu);
router.patch("/bulk/availability", MenuController.bulkUpdateAvailability);
router.get("/owner/analytics", MenuController.getMenuAnalytics);

module.exports = router;

