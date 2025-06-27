const axios = require("axios");

class RestaurantService {
  constructor() {
    this.userServiceUrl =
      process.env.USER_SERVICE_URL ||
      process.env.AUTH_SERVICE_URL ||
      "http://localhost:3000";
  }

  // Get restaurant details by getting restaurant owner info
  async getRestaurantDetails(restaurantId) {
    try {
      const response = await axios.get(
        `${this.userServiceUrl}/api/users/${restaurantId}`,
        {
          timeout: 5000,
        }
      );

      const user = response.data;

      if (user.userType !== "restaurant_owner") {
        return {
          success: false,
          error: "Invalid restaurant ID",
        };
      }

      return {
        success: true,
        restaurant: {
          restaurantId: user.uuid,
          name: user.restaurantName,
          description: user.restaurantDescription,
          address: user.restaurantAddress,
          phone: user.restaurantPhone,
          cuisineType: user.cuisineType,
        },
      };
    } catch (error) {
      console.error("Failed to fetch restaurant details:", error.message);
      return {
        success: false,
        error: error.response?.data?.message || "Restaurant not found",
      };
    }
  }

  // Get multiple restaurant details
  async getRestaurantsDetails(restaurantIds) {
    try {
      const response = await axios.post(
        `${this.userServiceUrl}/api/users/internal/bulk`,
        { uuids: restaurantIds },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      const users = response.data.users || [];
      const restaurants = users
        .filter((user) => user.userType === "restaurant_owner")
        .map((user) => ({
          restaurantId: user.uuid,
          name: user.restaurantName,
          description: user.restaurantDescription,
          address: user.restaurantAddress,
          phone: user.restaurantPhone,
          cuisineType: user.cuisineType,
        }));

      return {
        success: true,
        restaurants,
      };
    } catch (error) {
      console.error("Failed to fetch restaurants details:", error.message);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch restaurants",
      };
    }
  }

  // Notify restaurant of pickup (placeholder)
  async notifyPickup(restaurantId, orderId, driverId) {
    try {
      console.log(
        `Pickup notification: Driver ${driverId} picked up order ${orderId} from restaurant ${restaurantId}`
      );

      return {
        success: true,
        message: "Pickup notification logged",
      };
    } catch (error) {
      return {
        success: false,
        error: "Notification failed",
      };
    }
  }
}

module.exports = new RestaurantService();
