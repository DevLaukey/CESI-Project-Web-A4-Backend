const Delivery = require("../models/Delivery");
const Driver = require("../models/Driver");
const logger = require("../utils/logger");
const {
  validateDelivery,
  validateDeliveryUpdate,
  validateLocationUpdate,
  validateQRCode,
  validateRating,
  validateIssueReport,
  validateEmergencyStop,
} = require("../validators/deliveryValidator");
const deliveryAssignment = require("../services/deliveryAssignment");
const externalServices = require("../services/externalServices");
const QRCode = require("qrcode");

class DeliveryController {
  // ================================================================
  // SERVICE-TO-SERVICE METHODS
  // ================================================================

  // Get all deliveries 
  static async getAllDeliveries(req, res) {
    try {
      const deliveries = await Delivery.findAll();
      res.json({
        success: true,
        data: deliveries,
      });
    } catch (error) {
      logger.error("Get all deliveries error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  
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

      const orderId = value.order_id;
      const restaurantId = value.restaurant_id;

      // Check if order exists and belongs to the restaurant
      const order = await Delivery.findOrderById(orderId);
      if (!order || order.restaurant_id !== restaurantId) {
        return res.status(404).json({
          success: false,
          message: "Order not found or does not belong to the restaurant",
        });
      }

      // Check if delivery already exists for this order
      const existingDelivery = await Delivery.findByOrderId(orderId);
      if (existingDelivery) {
        return res.status(409).json({
          success: false,
          message: "Delivery already exists for this order",
        });
      } 


      // Create new delivery
      const newDelivery = await Delivery.create({
        ...value,
        status: "pending",
        created_at: new Date(),
      });
      logger.info(`New delivery created: ${newDelivery.id}`);

      // Notify restaurant and customer
      // await externalServices.sendNotification(restaurantId, {
      //   type: "new_delivery",
      //   delivery_id: newDelivery.id,
      //   order_id: orderId,
      // });
      // await externalServices.sendNotification(value.customer_id, {
      //   type: "delivery_request",
      //   delivery_id: newDelivery.id,
      //   order_id: orderId,
      // });
      
      

      res.status(201).json({
        success: true,
        message: "Delivery request created successfully",
        data: newDelivery,
      });
    } catch (error) {
      logger.error("Create delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Assign delivery to driver (internal)
  static async assignDeliveryInternal(req, res) {
    try {
      const { id } = req.params;
      const { driver_id } = req.body;

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      const driver = await Driver.findById(driver_id);
      if (!driver || !driver.is_verified || !driver.is_available) {
        return res.status(400).json({
          success: false,
          message: "Driver not available",
        });
      }

      // Assign delivery to driver
      const assignedDelivery = await Delivery.assignDriver(id, driver_id);
      await Driver.updateAvailability(driver_id, false);

      // Send notifications
      await this.sendStatusNotifications(assignedDelivery);

      res.json({
        success: true,
        message: "Delivery assigned successfully",
        data: assignedDelivery,
      });
    } catch (error) {
      logger.error("Assign delivery internal error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update delivery status (from external services)
  static async updateDeliveryStatusInternal(req, res) {
    try {
      const { id } = req.params;
      const { status, metadata } = req.body;

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      const updatedDelivery = await Delivery.updateStatus(id, status, metadata);
      await this.sendStatusNotifications(updatedDelivery);

      // Real-time updates
      const socketManager = req.app.get("socketManager");
      if (socketManager) {
        socketManager.broadcastDeliveryUpdate(updatedDelivery);
      }

      res.json({
        success: true,
        message: "Delivery status updated",
        data: updatedDelivery,
      });
    } catch (error) {
      logger.error("Update delivery status internal error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // PUBLIC METHODS
  // ================================================================

  // Track delivery by tracking number
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

  // Get delivery ETA
  static async getDeliveryETA(req, res) {
    try {
      const { trackingNumber } = req.params;
      const delivery = await Delivery.findByTrackingNumber(trackingNumber);

      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      let eta = delivery.estimated_delivery_time;

      // If driver is assigned, calculate real-time ETA
      if (delivery.driver_id && delivery.status === "in_transit") {
        const driver = await Driver.findById(delivery.driver_id);
        if (driver && driver.current_lat && driver.current_lng) {
          eta = await this.calculateRealTimeETA(
            driver.current_lat,
            driver.current_lng,
            delivery.delivery_lat,
            delivery.delivery_lng
          );
        }
      }

      res.json({
        success: true,
        data: {
          tracking_number: trackingNumber,
          estimated_delivery_time: eta,
          status: delivery.status,
        },
      });
    } catch (error) {
      logger.error("Get delivery ETA error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // USER METHODS
  // ================================================================

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
      if (socketManager) {
        socketManager.broadcastDeliveryUpdate(updatedDelivery);
      }

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

  // Get delivery history for user
  static async getUserDeliveryHistory(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;

      let deliveries;
      if (req.user.role === "customer") {
        deliveries = await Delivery.findByCustomer(
          req.user.id,
          parseInt(page),
          parseInt(limit),
          status
        );
      } else if (req.user.role === "driver") {
        const driver = await Driver.findByUserId(req.user.id);
        if (!driver) {
          return res.status(404).json({
            success: false,
            message: "Driver profile not found",
          });
        }
        deliveries = await Delivery.findByDriver(
          driver.id,
          parseInt(page),
          parseInt(limit),
          status
        );
      } else if (req.user.role === "restaurant") {
        deliveries = await Delivery.findByRestaurant(
          req.user.restaurant_id,
          parseInt(page),
          parseInt(limit),
          status
        );
      } else {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      res.json({
        success: true,
        data: deliveries,
      });
    } catch (error) {
      logger.error("Get user delivery history error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // DRIVER SPECIFIC METHODS
  // ================================================================

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
      if (socketManager) {
        socketManager.broadcastDeliveryUpdate(assignedDelivery);
      }

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

  // Start delivery (driver picks up from restaurant)
  static async pickupDelivery(req, res) {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver || delivery.driver_id !== driver.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      if (delivery.status !== "assigned") {
        return res.status(400).json({
          success: false,
          message: "Invalid delivery status for pickup",
        });
      }

      // Update delivery status and driver location
      const updatedDelivery = await Delivery.updateStatus(id, "picked_up", {
        pickup_time: new Date(),
        pickup_lat: latitude,
        pickup_lng: longitude,
      });

      await Driver.updateLocation(driver.id, latitude, longitude);

      // Send notifications
      await this.sendStatusNotifications(updatedDelivery);

      res.json({
        success: true,
        message: "Delivery picked up successfully",
        data: updatedDelivery,
      });
    } catch (error) {
      logger.error("Pickup delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Complete delivery (driver delivers to customer)
  static async completeDelivery(req, res) {
    try {
      const { id } = req.params;
      const { latitude, longitude, notes } = req.body;

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver || delivery.driver_id !== driver.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      if (!["picked_up", "in_transit"].includes(delivery.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid delivery status for completion",
        });
      }

      // Update delivery status
      const updatedDelivery = await Delivery.updateStatus(id, "delivered", {
        delivered_time: new Date(),
        delivered_lat: latitude,
        delivered_lng: longitude,
        delivery_notes: notes,
      });

      // Update driver
      await Driver.updateAvailability(driver.id, true);
      await Driver.updateLocation(driver.id, latitude, longitude);
      await Driver.incrementDeliveries(driver.id, delivery.delivery_fee);

      // Send notifications
      await this.sendStatusNotifications(updatedDelivery);

      res.json({
        success: true,
        message: "Delivery completed successfully",
        data: updatedDelivery,
      });
    } catch (error) {
      logger.error("Complete delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update driver location during delivery
  static async updateDeliveryLocation(req, res) {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver || delivery.driver_id !== driver.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Update driver location
      await Driver.updateLocation(driver.id, latitude, longitude);

      // Real-time location update
      const socketManager = req.app.get("socketManager");
      if (socketManager) {
        socketManager.broadcastLocationUpdate(delivery.id, {
          latitude,
          longitude,
          timestamp: new Date(),
        });
      }

      res.json({
        success: true,
        message: "Location updated successfully",
      });
    } catch (error) {
      logger.error("Update delivery location error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Report delivery issue
  static async reportDeliveryIssue(req, res) {
    try {
      const { id } = req.params;
      const { issue_type, description, severity } = req.body;

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

      // Create issue report
      const issue = await Delivery.createIssue(id, {
        reporter_id: req.user.id,
        reporter_type: req.user.role,
        issue_type,
        description,
        severity: severity || "medium",
      });

      // Notify support team
      await externalServices.sendNotification("support", {
        type: "delivery_issue_reported",
        delivery_id: id,
        issue_id: issue.id,
        severity,
      });

      res.json({
        success: true,
        message: "Issue reported successfully",
        data: issue,
      });
    } catch (error) {
      logger.error("Report delivery issue error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // QR CODE METHODS
  // ================================================================

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
        if (socketManager) {
          socketManager.broadcastDeliveryUpdate(updatedDelivery);
        }
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

  // Regenerate QR codes
  static async regenerateQRCodes(req, res) {
    try {
      const { id } = req.params;

      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Check authorization (admin or restaurant)
      if (
        req.user.role !== "admin" &&
        (req.user.role !== "restaurant" ||
          req.user.restaurant_id !== delivery.restaurant_id)
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const updatedDelivery = await Delivery.regenerateQRCodes(id);

      res.json({
        success: true,
        message: "QR codes regenerated successfully",
        data: updatedDelivery,
      });
    } catch (error) {
      logger.error("Regenerate QR codes error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // RATING AND FEEDBACK METHODS
  // ================================================================

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

  // Get delivery ratings
  static async getDeliveryRatings(req, res) {
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

      const ratings = await Delivery.getRatings(id);

      res.json({
        success: true,
        data: ratings,
      });
    } catch (error) {
      logger.error("Get delivery ratings error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Add delivery feedback
  static async addDeliveryFeedback(req, res) {
    try {
      const { id } = req.params;
      const { feedback_type, message } = req.body;

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

      const feedback = await Delivery.addFeedback(id, {
        user_id: req.user.id,
        user_type: req.user.role,
        feedback_type,
        message,
      });

      res.json({
        success: true,
        message: "Feedback added successfully",
        data: feedback,
      });
    } catch (error) {
      logger.error("Add delivery feedback error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // ANALYTICS AND STATISTICS METHODS
  // ================================================================

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

  // Get delivery performance metrics
  static async getDeliveryPerformance(req, res) {
    try {
      const { timeframe = "week", restaurant_id, driver_id } = req.query;

      const performance = await Delivery.getPerformanceMetrics({
        timeframe,
        restaurant_id,
        driver_id,
      });

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      logger.error("Get delivery performance error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get driver performance
  static async getDriverPerformance(req, res) {
    try {
      const { driverId } = req.params;
      const { start_date, end_date } = req.query;

      // Check authorization
      if (req.user.role === "driver") {
        const driver = await Driver.findByUserId(req.user.id);
        if (!driver || driver.id !== driverId) {
          return res.status(403).json({
            success: false,
            message: "Access denied",
          });
        }
      }

      const performance = await Driver.getPerformanceMetrics(
        driverId,
        start_date,
        end_date
      );

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      logger.error("Get driver performance error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // EMERGENCY AND SUPPORT METHODS
  // ================================================================

  // Emergency stop delivery
  static async emergencyStopDelivery(req, res) {
    try {
      const { id } = req.params;
      const { reason, contact_support } = req.body;

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

      // Update delivery status to emergency
      const updatedDelivery = await Delivery.updateStatus(id, "emergency", {
        emergency_reason: reason,
        emergency_by: req.user.id,
        emergency_time: new Date(),
      });

      // Make driver available again if assigned
      if (delivery.driver_id) {
        await Driver.updateAvailability(delivery.driver_id, true);
      }

      // Notify all parties and support team
      await externalServices.sendNotification("support", {
        type: "delivery_emergency",
        delivery_id: id,
        reason,
        contact_support,
      });

      await this.sendStatusNotifications(updatedDelivery);

      res.json({
        success: true,
        message: "Emergency stop activated",
        data: updatedDelivery,
      });
    } catch (error) {
      logger.error("Emergency stop delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Contact delivery participants
  static async contactParticipant(req, res) {
    try {
      const { id } = req.params;
      const { participant_type, message } = req.body;

      if (!["customer", "driver", "restaurant"].includes(participant_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid participant type",
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
      if (!this.canAccessDelivery(req.user, delivery)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Send contact message through notification service
      let targetUserId;
      switch (participant_type) {
        case "customer":
          targetUserId = delivery.customer_id;
          break;
        case "driver":
          if (delivery.driver_id) {
            const driver = await Driver.findById(delivery.driver_id);
            targetUserId = driver?.user_id;
          }
          break;
        case "restaurant":
          // Get restaurant owner/manager user ID
          const restaurant = await externalServices.getRestaurant(
            delivery.restaurant_id
          );
          targetUserId = restaurant?.owner_id;
          break;
      }

      if (!targetUserId) {
        return res.status(404).json({
          success: false,
          message: `${participant_type} not found or not available`,
        });
      }

      await externalServices.sendNotification(targetUserId, {
        type: "delivery_contact",
        delivery_id: id,
        from_user: req.user.id,
        from_role: req.user.role,
        message,
      });

      res.json({
        success: true,
        message: "Message sent successfully",
      });
    } catch (error) {
      logger.error("Contact participant error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get delivery timeline
  static async getDeliveryTimeline(req, res) {
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

      const timeline = await Delivery.getTimeline(id);

      res.json({
        success: true,
        data: timeline,
      });
    } catch (error) {
      logger.error("Get delivery timeline error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================

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

  static async calculateRealTimeETA(currentLat, currentLng, destLat, destLng) {
    // Calculate distance to destination
    const R = 6371;
    const dLat = ((destLat - currentLat) * Math.PI) / 180;
    const dLng = ((destLng - currentLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((currentLat * Math.PI) / 180) *
        Math.cos((destLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Assume average speed of 30 km/h in city
    const avgSpeed = 30;
    const estimatedMinutes = (distance / avgSpeed) * 60;

    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + Math.ceil(estimatedMinutes));
    return eta;
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
