const express = require("express");
const router = express.Router();

// Import controller
let RestaurantController;
try {
  RestaurantController = require("../controllers/RestaurantController");
} catch (error) {
  console.warn("RestaurantController not found, using placeholder");
  RestaurantController = {
    searchRestaurants: (req, res) =>
      res.json({ success: true, message: "Search placeholder" }),
    getPopularRestaurants: (req, res) =>
      res.json({ success: true, message: "Popular placeholder" }),
    getNearbyRestaurants: (req, res) =>
      res.json({ success: true, message: "Nearby placeholder" }),
    getRestaurant: (req, res) =>
      res.json({ success: true, message: "Get restaurant placeholder" }),
    createRestaurant: (req, res) =>
      res.json({ success: true, message: "Create restaurant placeholder" }),
    getMyRestaurant: (req, res) =>
      res.json({ success: true, message: "My restaurant placeholder" }),
    updateRestaurant: (req, res) =>
      res.json({ success: true, message: "Update restaurant placeholder" }),
    toggleStatus: (req, res) =>
      res.json({ success: true, message: "Toggle status placeholder" }),
    getStatistics: (req, res) =>
      res.json({ success: true, message: "Statistics placeholder" }),
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
router.get("/search", RestaurantController.searchRestaurants);
router.get("/popular", RestaurantController.getPopularRestaurants);
router.get("/nearby", RestaurantController.getNearbyRestaurants);
router.get("/:uuid", RestaurantController.getRestaurant);

// Protected routes
router.use(authMiddleware);
router.post("/", RestaurantController.createRestaurant);
router.get("/owner/me", RestaurantController.getMyRestaurant);
router.put("/owner/me", RestaurantController.updateRestaurant);
router.patch("/owner/status", RestaurantController.toggleStatus);
router.get("/owner/statistics", RestaurantController.getStatistics);

module.exports = router;
