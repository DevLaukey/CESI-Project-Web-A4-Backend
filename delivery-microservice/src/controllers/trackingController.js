const Delivery = require("../models/Delivery");
const Driver = require("../models/Driver");
const Tracking = require("../models/Tracking");
const logger = require("../utils/logger");
const externalServices = require("../services/externalServices");
const {
  validateTrackingUpdate,
  validateLocationHistory,
  validateRouteOptimization,
} = require("../validators/trackingValidator");

/**
 * Tracking Controller
 * Handles all tracking-related operations for deliveries, drivers, and routes
 */
class TrackingController {
  // ================================================================
  // DELIVERY TRACKING
  // ================================================================

  /**
   * Get real-time delivery tracking information
   */
  static async trackDelivery(req, res) {
    try {
      const { trackingNumber } = req.params;
      const { include_history = false } = req.query;

      const delivery = await Delivery.findByTrackingNumber(trackingNumber);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Get current tracking information
      const trackingInfo = await Tracking.getDeliveryTracking(delivery.id);

      // Get driver location if assigned and active
      let driverLocation = null;
      if (
        delivery.driver_id &&
        ["assigned", "picked_up", "in_transit"].includes(delivery.status)
      ) {
        driverLocation = await Driver.getCurrentLocation(delivery.driver_id);
      }

      // Get location history if requested
      let locationHistory = null;
      if (include_history === "true") {
        locationHistory = await Tracking.getLocationHistory(delivery.id);
      }

      // Calculate real-time ETA if driver is en route
      let realTimeETA = delivery.estimated_delivery_time;
      if (driverLocation && delivery.status === "in_transit") {
        realTimeETA = await this.calculateRealTimeETA(
          driverLocation.latitude,
          driverLocation.longitude,
          delivery.delivery_lat,
          delivery.delivery_lng
        );
      }

      // Get route information
      const routeInfo = await Tracking.getDeliveryRoute(delivery.id);

      const trackingData = {
        delivery_id: delivery.id,
        tracking_number: delivery.tracking_number,
        status: delivery.status,
        estimated_delivery_time: delivery.estimated_delivery_time,
        real_time_eta: realTimeETA,

        pickup_location: {
          address: delivery.pickup_address,
          latitude: delivery.pickup_lat,
          longitude: delivery.pickup_lng,
        },

        delivery_location: {
          address: delivery.delivery_address,
          latitude: delivery.delivery_lat,
          longitude: delivery.delivery_lng,
        },

        driver_info: delivery.driver_id
          ? {
              name: `${delivery.driver_first_name} ${delivery.driver_last_name}`,
              phone: delivery.driver_phone,
              vehicle_type: delivery.driver_vehicle_type,
              vehicle_license: delivery.driver_vehicle_license,
              current_location: driverLocation,
            }
          : null,

        tracking_events: trackingInfo.events || [],
        route_info: routeInfo,
        location_history: locationHistory,

        timestamps: {
          created_at: delivery.created_at,
          assigned_at: delivery.assigned_at,
          picked_up_at: delivery.picked_up_at,
          delivered_at: delivery.delivered_at,
          last_updated: trackingInfo.last_updated,
        },
      };

      res.json({
        success: true,
        data: trackingData,
      });
    } catch (error) {
      logger.error("Track delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getDeliveryStatus(req, res) {
    try {
      const { trackingNumber } = req.params;

      const delivery = await Delivery.findByTrackingNumber(trackingNumber);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      res.json({
        success: true,
        data: {
          tracking_number: delivery.tracking_number,
          status: delivery.status,
          estimated_delivery_time: delivery.estimated_delivery_time,
          timestamps: {
            created_at: delivery.created_at,
            assigned_at: delivery.assigned_at,
            picked_up_at: delivery.picked_up_at,
            delivered_at: delivery.delivered_at,
          },
        },
      });
    } catch (error) {
      logger.error("Get delivery status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getEstimatedDeliveryTime(req, res) {
    try {
      const { trackingNumber } = req.params;

      const delivery = await Delivery.findByTrackingNumber(trackingNumber);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Calculate real-time ETA if driver is en route
      let realTimeETA = delivery.estimated_delivery_time;
      if (delivery.driver_id && delivery.status === "in_transit") {
        const driverLocation = await Driver.getCurrentLocation(
          delivery.driver_id
        );
        if (driverLocation) {
          realTimeETA = await this.calculateRealTimeETA(
            driverLocation.latitude,
            driverLocation.longitude,
            delivery.delivery_lat,
            delivery.delivery_lng
          );
        }
      }

      res.json({
        success: true,
        data: {
          tracking_number: delivery.tracking_number,
          estimated_delivery_time: realTimeETA,
          status: delivery.status,
          timestamps: {
            created_at: delivery.created_at,
            assigned_at: delivery.assigned_at,
            picked_up_at: delivery.picked_up_at,
            delivered_at: delivery.delivered_at,
          },
        },
      });
    } catch (error) {
      logger.error("Get estimated delivery time error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getRealTimeLocation(req, res) {
    try {
      const { trackingNumber } = req.params;

      const delivery = await Delivery.findByTrackingNumber(trackingNumber);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Get current driver location if available
      let driverLocation = null;
      if (delivery.driver_id && delivery.status === "in_transit") {
        driverLocation = await Driver.getCurrentLocation(delivery.driver_id);
      }

      if (!driverLocation) {
        return res.status(404).json({
          success: false,
          message: "Driver location not available",
        });
      }
      res.json({
        success: true,
        data: {
          tracking_number: delivery.tracking_number,
          driver_location: {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
            heading: driverLocation.heading,
            speed: driverLocation.speed,
            accuracy: driverLocation.accuracy,
          },
          timestamps: {
            last_updated: driverLocation.last_updated,
          },
        },
      });
    } catch (error) {
      logger.error("Get real-time location error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getRealTimeLocation(req, res) {
    try {
      const { trackingNumber } = req.params;

      const delivery = await Delivery.findByTrackingNumber(trackingNumber);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Get current driver location if available
      let driverLocation = null;
      if (delivery.driver_id && delivery.status === "in_transit") {
        driverLocation = await Driver.getCurrentLocation(delivery.driver_id);
      }
      if (!driverLocation) {
        return res.status(404).json({
          success: false,
          message: "Driver location not available",
        });
      }
      res.json({
        success: true,
        data: {
          tracking_number: delivery.tracking_number,
          driver_location: {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
            heading: driverLocation.heading,
            speed: driverLocation.speed,
            accuracy: driverLocation.accuracy,
          },
          timestamps: {
            last_updated: driverLocation.last_updated,
          },
        },
      });
    } catch (error) {
      logger.error("Get real-time location error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getSubscriptionInfo(req, res) {
    try {
      const { trackingNumber } = req.params;

      const delivery = await Delivery.findByTrackingNumber(trackingNumber);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Get WebSocket subscription info
      const socketManager = req.app.get("socketManager");
      if (!socketManager) {
        return res.status(500).json({
          success: false,
          message: "WebSocket service not available",
        });
      }

      const subscriptionInfo = socketManager.getSubscriptionInfo(
        delivery.tracking_number
      );

      res.json({
        success: true,
        data: {
          tracking_number: delivery.tracking_number,
          subscription_info: subscriptionInfo,
        },
      });
    } catch (error) {
      logger.error("Get subscription info error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getDeliveryRoute(req, res) {
    try {
      const { trackingNumber } = req.params;

      const delivery = await Delivery.findByTrackingNumber(trackingNumber);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Get route information
      const routeInfo = await Tracking.getDeliveryRoute(delivery.id);
      if (!routeInfo) {
        return res.status(404).json({
          success: false,
          message: "Route information not available",
        });
      }

      res.json({
        success: true,
        data: {
          tracking_number: delivery.tracking_number,
          route_info: routeInfo,
        },
      });
    } catch (error) {
      logger.error("Get delivery route error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getDetailedTrackingInfo(req, res) {
    try {
      const { trackingNumber } = req.params;

      const delivery = await Delivery.findByTrackingNumber(trackingNumber);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Get detailed tracking information
      const trackingInfo = await Tracking.getDetailedTrackingInfo(delivery.id);
      if (!trackingInfo) {
        return res.status(404).json({
          success: false,
          message: "Tracking information not available",
        });
      }

      res.json({
        success: true,
        data: {
          tracking_number: delivery.tracking_number,
          delivery_info: delivery,
          tracking_info: trackingInfo,
        },
      });
    } catch (error) {
      logger.error("Get detailed tracking info error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getDeliveryTimeline(req, res) {
    try {
      const { trackingNumber } = req.params;

      const delivery = await Delivery.findByTrackingNumber(trackingNumber);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Get delivery timeline information
      const timelineInfo = await Tracking.getDeliveryTimeline(delivery.id);
      if (!timelineInfo) {
        return res.status(404).json({
          success: false,
          message: "Timeline information not available",
        });
      }

      res.json({
        success: true,
        data: {
          tracking_number: delivery.tracking_number,
          delivery_info: delivery,
          timeline_info: timelineInfo,
        },
      });
    } catch (error) {
      logger.error("Get delivery timeline error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async updateDeliveryMilestone(req, res) {
    try {
      const { trackingNumber } = req.params;
      const { milestone } = req.body;

      const delivery = await Delivery.findByTrackingNumber(trackingNumber);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Check authorization
      const driver = await Driver.findByUserId(req.user.id);
      const isAuthorized =
        req.user.role === "admin" ||
        req.user.role === "support" ||
        (driver && driver.id === delivery.driver_id);

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Update delivery milestone
      await Tracking.updateDeliveryMilestone(delivery.id, milestone
        , driver?.id);
      
  // Send real-time updates via WebSocket
      
      const socketManager = req.app.get("socketManager");
      if (socketManager) {
        socketManager.broadcastDeliveryUpdate(delivery.tracking_number, {
          milestone,
          timestamp: new Date(),
        });
      }
  // Notify relevant parties
      await this.sendMilestoneNotifications(delivery, milestone);

      logger.info(`Delivery milestone updated: ${trackingNumber}`, {
        milestone,
        driver_id: driver?.id,
      });

      res.json({
        success: true,
        message: "Delivery milestone updated successfully",
        data: {
          tracking_number: delivery.tracking_number,
          milestone,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error("Update delivery milestone error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }


  /**
   * Get delivery tracking by order ID
   */
  static async trackByOrderId(req, res) {
    try {
      const { orderId } = req.params;

      const delivery = await Delivery.findByOrder(orderId);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found for this order",
        });
      }

      // Redirect to main tracking with tracking number
      req.params.trackingNumber = delivery.tracking_number;
      return this.trackDelivery(req, res);
    } catch (error) {
      logger.error("Track by order ID error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Update delivery tracking information
   */
  static async updateTracking(req, res) {
    try {
      const { deliveryId } = req.params;
      const { error, value } = validateTrackingUpdate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Check authorization (driver or admin)
      const driver = await Driver.findByUserId(req.user.id);
      const isAuthorized =
        req.user.role === "admin" ||
        req.user.role === "support" ||
        (driver && driver.id === delivery.driver_id);

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Update tracking information
      const trackingUpdate = {
        delivery_id: deliveryId,
        status: value.status,
        location: value.location,
        notes: value.notes,
        timestamp: new Date(),
        updated_by: req.user.id,
        driver_id: driver?.id,
      };

      await Tracking.updateDeliveryTracking(trackingUpdate);

      // Send real-time updates via WebSocket
      const socketManager = req.app.get("socketManager");
      if (socketManager) {
        socketManager.broadcastTrackingUpdate(delivery.tracking_number, {
          status: value.status,
          location: value.location,
          timestamp: trackingUpdate.timestamp,
        });
      }

      // Notify relevant parties
      await this.sendTrackingNotifications(
        delivery,
        value.status,
        value.location
      );

      logger.info(`Tracking updated for delivery: ${deliveryId}`, {
        status: value.status,
        driver_id: driver?.id,
      });

      res.json({
        success: true,
        message: "Tracking updated successfully",
        data: {
          delivery_id: deliveryId,
          status: value.status,
          timestamp: trackingUpdate.timestamp,
        },
      });
    } catch (error) {
      logger.error("Update tracking error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // DRIVER TRACKING
  // ================================================================

  /**
   * Update driver location
   */
  static async updateDriverLocation(req, res) {
    try {
      const { latitude, longitude, heading, speed, accuracy } = req.body;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const locationUpdate = {
        driver_id: driver.id,
        latitude,
        longitude,
        heading,
        speed,
        accuracy,
        timestamp: new Date(),
      };

      // Update driver's current location
      await Driver.updateLocation(driver.id, locationUpdate);

      // Save location history
      await Tracking.saveLocationHistory(locationUpdate);

      // Update any active delivery tracking
      const activeDelivery = await Driver.getCurrentDelivery(driver.id);
      if (activeDelivery) {
        await Tracking.updateDeliveryLocation(
          activeDelivery.id,
          locationUpdate
        );

        // Broadcast real-time location to tracking subscribers
        const socketManager = req.app.get("socketManager");
        if (socketManager) {
          socketManager.broadcastDriverLocation(
            activeDelivery.tracking_number,
            {
              latitude,
              longitude,
              heading,
              speed,
              timestamp: locationUpdate.timestamp,
            }
          );
        }
      }

      res.json({
        success: true,
        message: "Location updated successfully",
      });
    } catch (error) {
      logger.error("Update driver location error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get driver location history
   */
  static async getDriverLocationHistory(req, res) {
    try {
      const { driverId } = req.params;
      const { start_date, end_date, limit = 100 } = req.query;

      // Check authorization
      const requestingDriver = await Driver.findByUserId(req.user.id);
      const isAuthorized =
        req.user.role === "admin" ||
        req.user.role === "support" ||
        (requestingDriver && requestingDriver.id === driverId);

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const { error, value } = validateLocationHistory({
        start_date,
        end_date,
        limit: parseInt(limit),
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const locationHistory = await Tracking.getDriverLocationHistory(
        driverId,
        value.start_date,
        value.end_date,
        value.limit
      );

      res.json({
        success: true,
        data: {
          driver_id: driverId,
          location_history: locationHistory,
          count: locationHistory.length,
          timeframe: {
            start: value.start_date,
            end: value.end_date,
          },
        },
      });
    } catch (error) {
      logger.error("Get driver location history error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // ROUTE TRACKING
  // ================================================================

  /**
   * Get optimized delivery route
   */
  static async getOptimizedRoute(req, res) {
    try {
      const { deliveryId } = req.params;
      const { waypoints } = req.query;

      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      // Check authorization
      const driver = await Driver.findByUserId(req.user.id);
      const isAuthorized =
        req.user.role === "admin" ||
        req.user.role === "support" ||
        (driver && driver.id === delivery.driver_id);

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const routeData = {
        pickup_location: {
          latitude: delivery.pickup_lat,
          longitude: delivery.pickup_lng,
          address: delivery.pickup_address,
        },
        delivery_location: {
          latitude: delivery.delivery_lat,
          longitude: delivery.delivery_lng,
          address: delivery.delivery_address,
        },
        waypoints: waypoints ? JSON.parse(waypoints) : [],
      };

      const { error, value } = validateRouteOptimization(routeData);
      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      // Get optimized route
      const optimizedRoute = await Tracking.getOptimizedRoute(value);

      // Save route for tracking
      await Tracking.saveDeliveryRoute(deliveryId, optimizedRoute);

      res.json({
        success: true,
        data: {
          delivery_id: deliveryId,
          route: optimizedRoute,
          estimated_duration: optimizedRoute.duration,
          estimated_distance: optimizedRoute.distance,
        },
      });
    } catch (error) {
      logger.error("Get optimized route error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Track route progress
   */
  static async trackRouteProgress(req, res) {
    try {
      const { deliveryId } = req.params;
      const { current_location } = req.body;

      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery not found",
        });
      }

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver || driver.id !== delivery.driver_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const routeProgress = await Tracking.calculateRouteProgress(
        deliveryId,
        current_location
      );

      // Update ETA based on current progress
      const updatedETA = await this.calculateRealTimeETA(
        current_location.latitude,
        current_location.longitude,
        delivery.delivery_lat,
        delivery.delivery_lng
      );

      // Broadcast progress update
      const socketManager = req.app.get("socketManager");
      if (socketManager) {
        socketManager.broadcastRouteProgress(delivery.tracking_number, {
          progress: routeProgress,
          eta: updatedETA,
          current_location,
        });
      }

      res.json({
        success: true,
        data: {
          delivery_id: deliveryId,
          route_progress: routeProgress,
          updated_eta: updatedETA,
          current_location,
        },
      });
    } catch (error) {
      logger.error("Track route progress error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // ANALYTICS AND REPORTS
  // ================================================================

  /**
   * Get delivery tracking analytics
   */
  static async getTrackingAnalytics(req, res) {
    try {
      const { timeframe = "week", driver_id, restaurant_id } = req.query;

      // Check authorization for filtered data
      if (driver_id && req.user.role === "driver") {
        const driver = await Driver.findByUserId(req.user.id);
        if (!driver || driver.id !== driver_id) {
          return res.status(403).json({
            success: false,
            message: "Access denied",
          });
        }
      }

      const analytics = await Tracking.getTrackingAnalytics({
        timeframe,
        driver_id,
        restaurant_id,
      });

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error("Get tracking analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get delivery heatmap data
   */
  static async getDeliveryHeatmap(req, res) {
    try {
      const { bounds, timeframe = "week" } = req.query;

      if (!bounds) {
        return res.status(400).json({
          success: false,
          message: "Map bounds are required",
        });
      }

      const mapBounds = JSON.parse(bounds);
      const heatmapData = await Tracking.getDeliveryHeatmap(
        mapBounds,
        timeframe
      );

      res.json({
        success: true,
        data: {
          heatmap_points: heatmapData,
          bounds: mapBounds,
          timeframe,
        },
      });
    } catch (error) {
      logger.error("Get delivery heatmap error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Export tracking data
   */
  static async exportTrackingData(req, res) {
    try {
      const { format = "json", start_date, end_date, delivery_ids } = req.query;

      // Only admin and support can export data
      if (!["admin", "support"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const filters = {
        start_date,
        end_date,
        delivery_ids: delivery_ids ? delivery_ids.split(",") : null,
      };

      const trackingData = await Tracking.exportTrackingData(filters);

      if (format === "csv") {
        const csv = await this.convertToCSV(trackingData);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=tracking_data.csv"
        );
        return res.send(csv);
      }

      res.json({
        success: true,
        data: trackingData,
        count: trackingData.length,
        exported_at: new Date(),
      });
    } catch (error) {
      logger.error("Export tracking data error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================

  /**
   * Calculate real-time ETA based on current location and destination
   */
  static async calculateRealTimeETA(currentLat, currentLng, destLat, destLng) {
    try {
      // Use external routing service for accurate ETA
      const routingResult = await externalServices.getRoute({
        origin: { lat: currentLat, lng: currentLng },
        destination: { lat: destLat, lng: destLng },
        mode: "driving",
      });

      if (routingResult && routingResult.duration) {
        const eta = new Date();
        eta.setSeconds(eta.getSeconds() + routingResult.duration);
        return eta;
      }

      // Fallback to straight-line distance calculation
      const distance = this.calculateDistance(
        currentLat,
        currentLng,
        destLat,
        destLng
      );
      const avgSpeed = 30; // km/h average city speed
      const estimatedMinutes = (distance / avgSpeed) * 60;

      const eta = new Date();
      eta.setMinutes(eta.getMinutes() + Math.ceil(estimatedMinutes));
      return eta;
    } catch (error) {
      logger.error("Calculate real-time ETA error:", error);

      // Return simple calculation as fallback
      const distance = this.calculateDistance(
        currentLat,
        currentLng,
        destLat,
        destLng
      );
      const avgSpeed = 30;
      const estimatedMinutes = (distance / avgSpeed) * 60;

      const eta = new Date();
      eta.setMinutes(eta.getMinutes() + Math.ceil(estimatedMinutes));
      return eta;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Send tracking notifications to relevant parties
   */
  static async sendTrackingNotifications(delivery, status, location) {
    try {
      // Notify customer
      await externalServices.sendNotification(delivery.customer_id, {
        type: "tracking_update",
        delivery_id: delivery.id,
        tracking_number: delivery.tracking_number,
        status,
        location,
      });

      // Notify restaurant for certain statuses
      if (["picked_up", "delivered"].includes(status)) {
        await externalServices.notifyRestaurant(delivery.restaurant_id, {
          type: "delivery_tracking_update",
          delivery_id: delivery.id,
          status,
        });
      }
    } catch (error) {
      logger.error("Failed to send tracking notifications:", error);
    }
  }

  /**
   * Convert tracking data to CSV format
   */
  static async convertToCSV(data) {
    if (!data || data.length === 0) {
      return "";
    }

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((item) =>
      Object.values(item)
        .map((value) =>
          typeof value === "string" && value.includes(",")
            ? `"${value}"`
            : value
        )
        .join(",")
    );

    return [headers, ...rows].join("\n");
  }
}

module.exports = TrackingController;
