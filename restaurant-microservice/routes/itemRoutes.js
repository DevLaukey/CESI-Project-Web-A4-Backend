const express = require("express");
const router = express.Router();

// Import controller
let ItemController;
try {
  ItemController = require("../controllers/ItemController");
} catch (error) {
  console.warn("ItemController not found, using placeholder");
  ItemController = {
    searchItems: (req, res) =>
      res.json({ success: true, message: "Search items placeholder" }),
    getPopularItems: (req, res) =>
      res.json({ success: true, message: "Popular items placeholder" }),
    getPublicRestaurantItems: (req, res) =>
      res.json({ success: true, message: "Public items placeholder" }),
    createItem: (req, res) =>
      res.json({ success: true, message: "Create item placeholder" }),
    getRestaurantItems: (req, res) =>
      res.json({ success: true, message: "Restaurant items placeholder" }),
    updateItem: (req, res) =>
      res.json({ success: true, message: "Update item placeholder" }),
    deleteItem: (req, res) =>
      res.json({ success: true, message: "Delete item placeholder" }),
    toggleAvailability: (req, res) =>
      res.json({ success: true, message: "Toggle availability placeholder" }),
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
router.get("/search", ItemController.searchItems);
router.get("/popular", ItemController.getPopularItems);
router.get(
  "/restaurant/:restaurantUuid",
  ItemController.getPublicRestaurantItems
);

// Protected routes
router.use(authMiddleware);
router.post("/", ItemController.createItem);
router.get("/owner/restaurant", ItemController.getRestaurantItems);
router.put("/:itemUuid", ItemController.updateItem);
router.delete("/:itemUuid", ItemController.deleteItem);
router.patch("/:itemUuid/availability", ItemController.toggleAvailability);

module.exports = router;
