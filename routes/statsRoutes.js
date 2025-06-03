
// routes/statsRoutes.js
const express = require("express");
const router = express.Router();
const StatsController = require("../controllers/StatsController");
const { authMiddleware } = require("../middleware");

// All stats routes require authentication
router.use(authMiddleware);

// Restaurant owner statistics
router.get("/restaurant", StatsController.getRestaurantStats);
router.post("/restaurant/daily", StatsController.updateDailyStats);
router.get("/restaurant/summary", StatsController.getStatsSummary);
router.get("/restaurant/report", StatsController.generateReport);
router.get("/restaurant/benchmarks", StatsController.getIndustryBenchmarks);

module.exports = router;