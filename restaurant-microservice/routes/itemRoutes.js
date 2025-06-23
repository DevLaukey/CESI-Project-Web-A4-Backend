const express = require("express");
const router = express.Router();
const ItemController = require("../controllers/ItemController");
const { route } = require("./restaurantRoutes");



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

// get restaurant items by uuid
router.get("/restaurant/:restaurantUuid", ItemController.getRestaurantItemsByUuid);
// Protected routes
router.use(authMiddleware);
router.post("/", ItemController.createItem);
router.get("/owner/restaurant", ItemController.getRestaurantItems);
router.put("/:itemUuid", ItemController.updateItem);
router.delete("/:itemUuid", ItemController.deleteItem);
router.patch("/:itemUuid/availability", ItemController.toggleAvailability);

module.exports = router;
