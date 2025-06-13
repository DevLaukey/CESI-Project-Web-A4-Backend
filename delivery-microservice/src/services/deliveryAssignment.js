const Driver = require("../models/Driver");
const logger = require("../utils/logger");

class DeliveryAssignmentService {
  // Find and assign the best available driver
  async findAndAssignDriver(delivery, excludeDrivers = []) {
    try {
      // Get available drivers near pickup location
      const availableDrivers = await Driver.findAvailableDrivers(
        delivery.pickup_lat,
        delivery.pickup_lng,
        parseInt(process.env.DEFAULT_DELIVERY_RADIUS) || 10
      );

      if (availableDrivers.length === 0) {
        return {
          success: false,
          message: "No drivers available in the area",
        };
      }

      // Filter out excluded drivers
      const eligibleDrivers = availableDrivers.filter(
        (driver) => !excludeDrivers.includes(driver.id)
      );

      if (eligibleDrivers.length === 0) {
        return {
          success: false,
          message: "No eligible drivers available",
        };
      }

      // Score drivers based on multiple factors
      const scoredDrivers = eligibleDrivers.map((driver) => ({
        ...driver,
        score: this.calculateDriverScore(driver, delivery),
      }));

      // Sort by score (highest first)
      scoredDrivers.sort((a, b) => b.score - a.score);

      const bestDriver = scoredDrivers[0];

      logger.info(
        `Best driver found: ${bestDriver.id} with score: ${bestDriver.score}`
      );

      return {
        success: true,
        driver: bestDriver,
        alternatives: scoredDrivers.slice(1, 3), // Top 2 alternatives
      };
    } catch (error) {
      logger.error("Driver assignment error:", error);
      return {
        success: false,
        message: "Driver assignment failed",
      };
    }
  }

  // Calculate driver score based on multiple factors
  calculateDriverScore(driver, delivery) {
    let score = 0;

    // Distance factor (closer is better) - 40% weight
    const maxDistance = 10; // km
    const distanceScore =
      Math.max(0, (maxDistance - driver.distance) / maxDistance) * 40;
    score += distanceScore;

    // Rating factor - 30% weight
    const ratingScore = (driver.rating / 5) * 30;
    score += ratingScore;

    // Experience factor (total deliveries) - 20% weight
    const maxDeliveries = 1000;
    const experienceScore =
      Math.min(driver.total_deliveries / maxDeliveries, 1) * 20;
    score += experienceScore;

    // Recency factor (last location update) - 10% weight
    const lastUpdateMinutes = driver.last_location_update
      ? (Date.now() - new Date(driver.last_location_update).getTime()) /
        (1000 * 60)
      : 60;
    const recencyScore = Math.max(0, (30 - lastUpdateMinutes) / 30) * 10;
    score += recencyScore;

    return Math.round(score * 100) / 100;
  }

  // Batch assign multiple deliveries
  async batchAssignDeliveries(deliveries) {
    const results = [];

    for (const delivery of deliveries) {
      const assignment = await this.findAndAssignDriver(delivery);
      results.push({
        delivery_id: delivery.id,
        ...assignment,
      });

      // Small delay to prevent race conditions
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }
}

module.exports = new DeliveryAssignmentService();
