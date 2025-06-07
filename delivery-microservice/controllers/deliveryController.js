const Delivery = require("../models/Delivery");
const Driver = require("../models/Driver");
const logger = require("../utils/logger");
const {
  validateDelivery,
  validateDeliveryUpdate,
} = require("../validators/deliveryValidator");
const externalServices = require("../services/externalServices");
const deliveryAssignment = require("../services/deliveryAssignment");
const QRCode = require("qrcode");

class DeliveryController {
  // Create delivery request
  static async createDelivery(req, res) {
    try {
      const { error, value } = validateDelivery(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      // Verify order exists
      const order = await externalServices.getOrder(value.order_id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Check if delivery already exists for this order
      const existingDelivery = await Delivery.findByOrder(value.order_id);
      if (existingDelivery) {
        return res.status(409).json({
          success: false,
          message: "Delivery already exists for this order",
          data: existingDelivery,
        });
      }

      // Get restaurant details for pickup address
      const restaurant = await externalServices.getRestaurant(
        order.restaurant_id
      );
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found",
        });
      }

      // Calculate delivery fee and estimated time
      const deliveryData = {
        ...value,
        restaurant_id: order.restaurant_id,
        customer_id: order.customer_id,
        pickup_address: restaurant.address,
        pickup_lat: restaurant.latitude,
        pickup_lng: restaurant.longitude,
        delivery_fee: await this.calculateDeliveryFee(
          restaurant.latitude,
          restaurant.longitude,
          value.delivery_lat,
          value.delivery_lng
        ),
        estimated_delivery_time: this.calculateEstimatedDeliveryTime(),
      };

      // Create delivery
      const delivery = await Delivery.create(deliveryData);

      // Try to auto-assign to available driver
      const assignment = await deliveryAssignment.findAndAssignDriver(delivery);
      if (assignment.success) {
        await Delivery.assignDriver(delivery.id, assignment.driver.id);

        // Notify driver
        await externalServices.sendNotification(assignment.driver.user_id, {
          type: "delivery_assigned",
          delivery_id: delivery.id,
          order_id: delivery.order_id,
        });

        // Update socket for real-time
        const socketManager = req.app.get("socketManager");
        socketManager.notifyDriver(
          assignment.driver.user_id,
          "delivery_assigned",
          {
            delivery: delivery,
          }
        );
      }

      logger.info(
        `Delivery created: ${delivery.id} for order: ${delivery.order_id}`
      );

      res.status(201).json({
        success: true,
        message: "Delivery created successfully",
        data: {
          ...delivery,
          auto_assigned: assignment.success,
          assigned_driver: assignment.success ? assignment.driver : null,
        },
      });
    } catch (error) {
      logger.error("Create delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get delivery details
  static async getDelivery(req, res) {
    try {
      const { id } = req.params;
      const delivery = await Delivery.findById(id);

      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Check authorization
      if (!this.canAccessDelivery(req.user, delivery)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      res.json({
        success: true,
        data: delivery,
      });
    } catch (error) {
      logger.error("Get delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update delivery status
  static async updateDeliveryStatus(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = validateDeliveryUpdate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Check authorization
      if (!this.canUpdateDelivery(req.user, delivery, value.status)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Update delivery
      const updatedDelivery = await Delivery.updateStatus(id, value.status, {
        actual_distance: value.actual_distance,
        driver_notes: value.driver_notes,
      });

      // Update driver availability if delivered
      if (value.status === "delivered" && delivery.driver_id) {
        await Driver.updateAvailability(delivery.driver_id, true);
        await Driver.incrementDeliveries(
          delivery.driver_id,
          delivery.delivery_fee
        );
      }

      // Send notifications
      await this.sendStatusNotifications(updatedDelivery);

      // Real-time updates
      const socketManager = req.app.get("socketManager");
      socketManager.broadcastDeliveryUpdate(updatedDelivery);

      logger.info(`Delivery status updated: ${id} to ${value.status}`);

      res.json({
        success: true,
        message: "Delivery status updated successfully",
        data: updatedDelivery,
      });
    } catch (error) {
      logger.error("Update delivery status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Accept delivery (driver)
  static async acceptDelivery(req, res) {
    try {
      const { id } = req.params;

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      if (delivery.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Delivery is no longer available",
        });
      }

      // Get driver profile
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver || !driver.is_verified || !driver.is_available) {
        return res.status(400).json({
          success: false,
          message: "Driver not available for deliveries",
        });
      }

      // Assign delivery to driver
      const assignedDelivery = await Delivery.assignDriver(id, driver.id);
      if (!assignedDelivery) {
        return res.status(409).json({
          success: false,
          message: "Delivery was already assigned to another driver",
        });
      }

      // Set driver as unavailable
      await Driver.updateAvailability(driver.id, false);

      // Notify customer and restaurant
      await this.sendStatusNotifications(assignedDelivery);

      // Real-time updates
      const socketManager = req.app.get("socketManager");
      socketManager.broadcastDeliveryUpdate(assignedDelivery);

      logger.info(`Delivery accepted: ${id} by driver: ${driver.id}`);

      res.json({
        success: true,
        message: "Delivery accepted successfully",
        data: assignedDelivery,
      });
    } catch (error) {
      logger.error("Accept delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Decline delivery (driver)
  static async declineDelivery(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Get driver profile
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      // Try to reassign to another driver
      const reassignment = await deliveryAssignment.findAndAssignDriver(
        delivery,
        [driver.id]
      );

      if (reassignment.success) {
        await Delivery.assignDriver(id, reassignment.driver.id);

        // Notify new driver
        await externalServices.sendNotification(reassignment.driver.user_id, {
          type: "delivery_assigned",
          delivery_id: delivery.id,
          order_id: delivery.order_id,
        });
      }

      logger.info(
        `Delivery declined: ${id} by driver: ${driver.id}, reason: ${reason}`
      );

      res.json({
        success: true,
        message: "Delivery declined",
        data: {
          reassigned: reassignment.success,
          new_driver: reassignment.success ? reassignment.driver : null,
        },
      });
    } catch (error) {
      logger.error("Decline delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get delivery by tracking number
  static async trackDelivery(req, res) {
    try {
      const { trackingNumber } = req.params;
      const delivery = await Delivery.findByTrackingNumber(trackingNumber);

      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Get driver location if assigned and in transit
      let driverLocation = null;
      if (
        delivery.driver_id &&
        ["assigned", "picked_up", "in_transit"].includes(delivery.status)
      ) {
        const driver = await Driver.findById(delivery.driver_id);
        if (driver && driver.current_lat && driver.current_lng) {
          driverLocation = {
            lat: driver.current_lat,
            lng: driver.current_lng,
            last_updated: driver.last_location_update,
          };
        }
      }

      res.json({
        success: true,
        data: {
          ...delivery,
          driver_location: driverLocation,
        },
      });
    } catch (error) {
      logger.error("Track delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Validate QR code
  static async validateQRCode(req, res) {
    try {
      const { id } = req.params;
      const { qr_code, type } = req.body;

      if (!["pickup", "delivery"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid QR code type",
        });
      }

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Validate QR code
      const isValid = await Delivery.validateQRCode(id, qr_code, type);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid QR code",
        });
      }

      // Update delivery status based on QR code type
      let newStatus = delivery.status;
      if (type === "pickup" && delivery.status === "assigned") {
        newStatus = "picked_up";
      } else if (type === "delivery" && delivery.status === "in_transit") {
        newStatus = "delivered";
      }

      if (newStatus !== delivery.status) {
        const updatedDelivery = await Delivery.updateStatus(id, newStatus);

        // Send notifications
        await this.sendStatusNotifications(updatedDelivery);

        // Real-time updates
        const socketManager = req.app.get("socketManager");
        socketManager.broadcastDeliveryUpdate(updatedDelivery);
      }

      res.json({
        success: true,
        message: "QR code validated successfully",
        data: {
          valid: true,
          status_updated: newStatus !== delivery.status,
          new_status: newStatus,
        },
      });
    } catch (error) {
      logger.error("Validate QR code error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Generate QR code image
  static async generateQRCodeImage(req, res) {
    try {
      const { id } = req.params;
      const { type } = req.query;

      if (!["pickup", "delivery"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid QR code type",
        });
      }

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      const qrData =
        type === "pickup" ? delivery.qr_code_pickup : delivery.qr_code_delivery;
      const qrCodeImage = await QRCode.toDataURL(qrData);

      res.json({
        success: true,
        data: {
          qr_code_image: qrCodeImage,
          qr_code_data: qrData,
        },
      });
    } catch (error) {
      logger.error("Generate QR code error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Rate delivery
  static async rateDelivery(req, res) {
    try {
      const { id } = req.params;
      const { rating, feedback } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      if (delivery.customer_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      if (delivery.status !== "delivered") {
        return res.status(400).json({
          success: false,
          message: "Delivery must be completed before rating",
        });
      }

      // Add rating
      const ratedDelivery = await Delivery.addRating(id, rating, feedback);

      // Update driver's overall rating
      if (delivery.driver_id) {
        const driverStats = await Driver.getDriverStats(delivery.driver_id);
        if (driverStats.avg_rating) {
          await Driver.updateRating(delivery.driver_id, driverStats.avg_rating);
        }
      }

      logger.info(`Delivery rated: ${id} with ${rating} stars`);

      res.json({
        success: true,
        message: "Delivery rated successfully",
        data: ratedDelivery,
      });
    } catch (error) {
      logger.error("Rate delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get delivery statistics
  static async getDeliveryStats(req, res) {
    try {
      const { driver_id, start_date, end_date } = req.query;

      // Check authorization
      if (driver_id && req.user.role === "driver") {
        const driver = await Driver.findByUserId(req.user.id);
        if (!driver || driver.id !== driver_id) {
          return res.status(403).json({
            success: false,
            message: "Access denied",
          });
        }
      }

      const stats = await Delivery.getDeliveryStats(
        driver_id,
        start_date,
        end_date
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Get delivery stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Helper methods
  static async calculateDeliveryFee(
    pickupLat,
    pickupLng,
    deliveryLat,
    deliveryLng
  ) {
    if (!pickupLat || !pickupLng || !deliveryLat || !deliveryLng) {
      return parseFloat(process.env.BASE_DELIVERY_FEE) || 2.99;
    }

    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((deliveryLat - pickupLat) * Math.PI) / 180;
    const dLng = ((deliveryLng - pickupLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pickupLat * Math.PI) / 180) *
        Math.cos((deliveryLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    const baseFee = parseFloat(process.env.BASE_DELIVERY_FEE) || 2.99;
    const feePerKm = parseFloat(process.env.DELIVERY_FEE_PER_KM) || 1.5;

    return Math.round((baseFee + distance * feePerKm) * 100) / 100;
  }

  static calculateEstimatedDeliveryTime() {
    // Estimate 30-45 minutes delivery time
    const baseMinutes = 30;
    const variableMinutes = Math.floor(Math.random() * 15);
    const estimatedTime = new Date();
    estimatedTime.setMinutes(
      estimatedTime.getMinutes() + baseMinutes + variableMinutes
    );
    return estimatedTime;
  }

  // Authorization helpers
  static canAccessDelivery(user, delivery) {
    if (
      user.role === "admin" ||
      user.role === "sales" ||
      user.role === "support"
    )
      return true;
    if (user.role === "customer") return user.id === delivery.customer_id;
    if (user.role === "driver") {
      // Driver can access if assigned to them or if it's unassigned
      return !delivery.driver_id || delivery.driver_id === user.driver_id;
    }
    if (user.role === "restaurant")
      return user.restaurant_id === delivery.restaurant_id;
    return false;
  }

  static canUpdateDelivery(user, delivery, newStatus) {
    if (user.role === "admin") return true;
    if (user.role === "driver") {
      return (
        delivery.driver_id === user.driver_id &&
        ["picked_up", "in_transit", "delivered"].includes(newStatus)
      );
    }
    return false;
  }

  // Notification helper
  static async sendStatusNotifications(delivery) {
    try {
      // Notify customer
      await externalServices.sendNotification(delivery.customer_id, {
        type: "delivery_status_update",
        delivery_id: delivery.id,
        status: delivery.status,
        tracking_number: delivery.tracking_number,
      });

      // Notify driver if assigned
      if (delivery.driver_id) {
        const driver = await Driver.findById(delivery.driver_id);
        if (driver) {
          await externalServices.sendNotification(driver.user_id, {
            type: "delivery_update",
            delivery_id: delivery.id,
            status: delivery.status,
          });
        }
      }

      // Notify restaurant for certain status updates
      if (["assigned", "picked_up"].includes(delivery.status)) {
        await externalServices.notifyRestaurant(delivery.restaurant_id, {
          type: "delivery_update",
          delivery_id: delivery.id,
          status: delivery.status,
        });
      }
    } catch (error) {
      logger.error("Failed to send status notifications:", error);
    }
  }
}

module.exports = DeliveryController;
