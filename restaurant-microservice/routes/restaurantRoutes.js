const express = require("express");
const router = express.Router();
const RestaurantController = require("../controllers/RestaurantController");


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
router.get("/", RestaurantController.getAllRestaurants);
router.get("/search", RestaurantController.searchRestaurants);
router.get("/:uuid", RestaurantController.getRestaurant);

// Protected routes
router.use(authMiddleware);
router.post("/", RestaurantController.createRestaurant);
router.get("/owner/me", RestaurantController.getMyRestaurant);
router.put("/owner/me", RestaurantController.updateRestaurant);
router.patch("/owner/status", RestaurantController.toggleStatus);
router.get("/owner/statistics", RestaurantController.getStatistics);

module.exports = router;
