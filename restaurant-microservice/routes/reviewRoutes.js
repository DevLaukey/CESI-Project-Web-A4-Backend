
const express = require("express");
const router = express.Router();
const ReviewController = require("../controllers/ReviewController");
const { authMiddleware } = require("../middleware");

// Public routes
router.get(
  "/restaurant/:restaurantUuid",
  ReviewController.getRestaurantReviews
);

// Protected routes
router.use(authMiddleware);

// Customer routes
router.post("/", ReviewController.createReview);
router.get("/customer/me", ReviewController.getMyReviews);
router.put("/:reviewUuid", ReviewController.updateReview);
router.delete("/:reviewUuid", ReviewController.deleteReview);

// Owner routes
router.get("/owner/restaurant", ReviewController.getOwnerRestaurantReviews);
router.post("/:reviewUuid/respond", ReviewController.respondToReview);
router.patch(
  "/:reviewUuid/visibility",
  ReviewController.toggleReviewVisibility
);
router.get("/owner/analytics", ReviewController.getReviewAnalytics);

module.exports = router;