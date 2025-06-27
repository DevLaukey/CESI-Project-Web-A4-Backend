const axios = require("axios");

class AuthService {
  constructor() {
    this.authServiceUrl =
      process.env.AUTH_SERVICE_URL || "http://localhost:3000";
    this.userServiceUrl =
      process.env.USER_SERVICE_URL ||
      process.env.AUTH_SERVICE_URL ||
      "http://localhost:3000";
  }

  // Verify JWT token by calling user profile endpoint
  async verifyToken(token) {
    try {
      console.log(token, "Verifying token in AuthService");
      const response = await axios.get(
        `${this.userServiceUrl}/api/users/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 5000,
        }
      );
      console.log(response);

      const user = response.data.user;
      console.log(user);

      // Check if user is a delivery driver
      if (user.userType !== "delivery_driver") {
        return {
          success: false,
          error: "Access denied. Driver role required.",
        };
      }

      return {
        success: true,
        user: user,
        driver: {
          driverId: user.uuid,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phone,
          vehicleType: user.vehicleType,
          licenseNumber: user.licenseNumber,
          isAvailable: user.isAvailable,
          currentLocation:
            user.currentLatitude && user.currentLongitude
              ? {
                  lat: parseFloat(user.currentLatitude),
                  lng: parseFloat(user.currentLongitude),
                }
              : null,
        },
      };
    } catch (error) {
      console.error("Auth service verification failed:", error.message);
      return {
        success: false,
        error: error.response?.data?.message || "Token verification failed",
      };
    }
  }

  // Update driver location
  async updateDriverLocation(token, latitude, longitude, isAvailable = null) {
    try {
      const updateData = { latitude, longitude };
      if (isAvailable !== null) {
        updateData.isAvailable = isAvailable;
      }

      const response = await axios.put(
        `${this.userServiceUrl}/api/users/location`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 5000,
        }
      );

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      console.error("Location update failed:", error.message);
      return {
        success: false,
        error: error.response?.data?.message || "Location update failed",
      };
    }
  }

  // Update driver availability
  async updateDriverAvailability(token, isAvailable) {
    try {
      const response = await axios.put(
        `${this.userServiceUrl}/api/users/availability`,
        { isAvailable },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 5000,
        }
      );

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      console.error("Availability update failed:", error.message);
      return {
        success: false,
        error: error.response?.data?.message || "Availability update failed",
      };
    }
  }

  async updateDriverStatus(token, driverData) {
    try {
      const response = await axios.put(
        `${this.userServiceUrl}/api/users/driver-status`,
        driverData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 5000,
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        "Failed to update driver status in auth service:",
        error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to update driver status",
      };
    }
  }
}

module.exports = new AuthService();
// This service handles authentication and user profile verification for delivery drivers.
// It verifies JWT tokens, updates driver locations, and manages availability status.