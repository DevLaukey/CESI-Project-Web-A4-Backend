const express = require("express");
const router = express.Router();

const restaurantRoutes = require("./restaurantRoutes");
const itemRoutes = require("./itemRoutes");
const menuRoutes = require("./menuRoutes");
const categoryRoutes = require("./categoryRoutes");
const statsRoutes = require("./statsRoutes");
const reviewRoutes = require("./reviewRoutes");

// Mount route modules
router.use("/restaurants", restaurantRoutes);
router.use("/items", itemRoutes);
router.use("/menus", menuRoutes);
router.use("/categories", categoryRoutes);
router.use("/stats", statsRoutes);
router.use("/reviews", reviewRoutes);

// Service info endpoint
router.get("/info", (req, res) => {
  res.json({
    success: true,
    service: "Restaurant Management Service",
    version: "1.0.0",
    endpoints: {
      restaurants: "/api/restaurants",
      items: "/api/items",
      menus: "/api/menus",
      categories: "/api/categories",
      stats: "/api/stats",
      reviews: "/api/reviews",
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
