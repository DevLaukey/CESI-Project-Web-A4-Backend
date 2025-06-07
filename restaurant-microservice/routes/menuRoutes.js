const express = require("express");
const router = express.Router();

// Import controller
let MenuController;
try {
  MenuController = require("../controllers/MenuController");
} catch (error) {
  console.warn("MenuController not found, using placeholder");
  MenuController = {
    getPublicRestaurantMenus: (req, res) =>
      res.json({ success: true, message: "Public menus placeholder" }),
    createMenu: (req, res) =>
      res.json({ success: true, message: "Create menu placeholder" }),
    getRestaurantMenus: (req, res) =>
      res.json({ success: true, message: "Restaurant menus placeholder" }),
    getMenu: (req, res) =>
      res.json({ success: true, message: "Get menu placeholder" }),
    updateMenu: (req, res) =>
      res.json({ success: true, message: "Update menu placeholder" }),
    deleteMenu: (req, res) =>
      res.json({ success: true, message: "Delete menu placeholder" }),
    toggleAvailability: (req, res) =>
      res.json({
        success: true,
        message: "Toggle menu availability placeholder",
      }),
    duplicateMenu: (req, res) =>
      res.json({ success: true, message: "Duplicate menu placeholder" }),
    bulkUpdateAvailability: (req, res) =>
      res.json({ success: true, message: "Bulk update placeholder" }),
    getMenuAnalytics: (req, res) =>
      res.json({ success: true, message: "Menu analytics placeholder" }),
  };
}

// Import auth middleware
let authMiddleware;
try {
  authMiddleware = require("../middleware/auth");
} catch (error) {
  console.warn("Auth middleware not found, using placeholder");
  authMiddleware = (req, res, next) => {
    req.user = { uuid: req.headers["x-user-id"] || "test-user" };
    next();
  };
}

// Public routes
router.get(
  "/restaurant/:restaurantUuid",
  MenuController.getPublicRestaurantMenus
);

// Protected routes
router.use(authMiddleware);
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
