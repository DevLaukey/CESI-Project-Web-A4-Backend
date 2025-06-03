const express = require("express");
const router = express.Router();
const RestaurantController = require("../controllers/RestaurantController");
const { authMiddleware, ownerMiddleware } = require("../middleware");

// Public routes (no authentication required)
router.get("/search", RestaurantController.searchRestaurants);
router.get("/popular", RestaurantController.getPopularRestaurants);
router.get("/nearby", RestaurantController.getNearbyRestaurants);
router.get("/:uuid", RestaurantController.getRestaurant);

// Protected routes (authentication required)
router.use(authMiddleware); // Apply auth middleware to all routes below

// Owner-specific routes
router.post("/", RestaurantController.createRestaurant);
router.get("/owner/me", RestaurantController.getMyRestaurant);
router.put("/owner/me", RestaurantController.updateRestaurant);
router.patch("/owner/status", RestaurantController.toggleStatus);
router.get("/owner/statistics", RestaurantController.getStatistics);

module.exports = router;

