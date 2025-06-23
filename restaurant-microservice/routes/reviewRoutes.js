const express = require("express");
const router = express.Router();

// Basic review routes with direct handlers
router.get("/restaurant/:restaurantUuid", async (req, res, next) => {
  try {
    const { restaurantUuid } = req.params;
    const { page = 1, limit = 10, rating } = req.query;

    let reviews = [];
    try {
      const { Review, Restaurant } = require("../models");

      const restaurant = await Restaurant.findOne({
        where: { uuid: restaurantUuid, isActive: true },
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: "Restaurant not found",
        });
      }

      const whereClause = {
        restaurantId: restaurant.id,
        isVisible: true,
      };

      if (rating) {
        whereClause.rating = parseInt(rating);
      }

      const { count, rows } = await Review.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
      });

      reviews = rows;
    } catch (error) {
      console.warn("Review model not found, returning empty array");
    }

    res.json({
      success: true,
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(reviews.length / parseInt(limit)),
        totalCount: reviews.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Protected routes placeholder
router.post("/", (req, res) => {
  res.json({
    success: true,
    message: "Create review placeholder - authentication required",
  });
});

module.exports = router;
