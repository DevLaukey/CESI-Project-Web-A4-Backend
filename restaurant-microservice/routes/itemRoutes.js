const express = require("express");
const router = express.Router();
const ItemController = require("../controllers/ItemController");
const { authMiddleware } = require("../middleware");

// Public routes
router.get("/search", ItemController.searchItems);
router.get("/popular", ItemController.getPopularItems);
router.get(
  "/restaurant/:restaurantUuid",
  ItemController.getPublicRestaurantItems
);


// Protected routes (owner only)
router.use(authMiddleware);

// Owner item management
router.post("/", ItemController.createItem);
router.get("/owner/restaurant", ItemController.getRestaurantItems);
router.get("/:itemUuid", ItemController.getItem);
router.put("/:itemUuid", ItemController.updateItem);
router.delete("/:itemUuid", ItemController.deleteItem);
router.patch("/:itemUuid/availability", ItemController.toggleAvailability);

module.exports = router;
