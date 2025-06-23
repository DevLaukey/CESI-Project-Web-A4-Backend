const { sequelize } = require("../config/database");
const logger = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

/**
 * Tracking Model
 * Handles all database operations for tracking data
 */
class Tracking {
  static async createTables() {
    try {
      // Create delivery_tracking table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS delivery_tracking (
          id VARCHAR(36) PRIMARY KEY,
          delivery_id VARCHAR(36) NOT NULL,
          driver_id VARCHAR(36),
          status VARCHAR(50),
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          accuracy DECIMAL(8, 2),
          heading DECIMAL(5, 2),
          speed DECIMAL(5, 2),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          updated_by VARCHAR(36),
          INDEX idx_delivery (delivery_id),
          INDEX idx_driver (driver_id),
          INDEX idx_created_at (created_at),
          FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
        )
      `);

      // Create location_history table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS location_history (
          id VARCHAR(36) PRIMARY KEY,
          driver_id VARCHAR(36) NOT NULL,
          latitude DECIMAL(10, 8) NOT NULL,
          longitude DECIMAL(11, 8) NOT NULL,
          accuracy DECIMAL(8, 2),
          heading DECIMAL(5, 2),
          speed DECIMAL(5, 2),
          altitude DECIMAL(8, 2),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          battery_level INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_driver (driver_id),
          INDEX idx_timestamp (timestamp),
          FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
        )
      `);

      // Create delivery_routes table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS delivery_routes (
          id VARCHAR(36) PRIMARY KEY,
          delivery_id VARCHAR(36) NOT NULL,
          route_data JSON,
          estimated_duration INT,
          estimated_distance DECIMAL(8, 2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_delivery (delivery_id),
          FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
        )
      `);

      console.log("✅ Tracking tables created successfully!");
    } catch (error) {
      console.error("❌ Error creating tracking tables:", error);
      throw error;
    }
  }

  /**
   * Get delivery tracking information
   */
  static async getDeliveryTracking(deliveryId) {
    try {
      const events = await sequelize.query(
        `
        SELECT 
          dt.*,
          d.tracking_number,
          d.status as delivery_status,
          d.estimated_delivery_time,
          dr.first_name as driver_first_name,
          dr.last_name as driver_last_name
        FROM delivery_tracking dt
        LEFT JOIN deliveries d ON dt.delivery_id = d.id
        LEFT JOIN drivers dr ON dt.driver_id = dr.id
        WHERE dt.delivery_id = ?
        ORDER BY dt.created_at DESC
      `,
        {
          replacements: [deliveryId],
          type: sequelize.QueryTypes.SELECT,
        }
      );

      return {
        delivery_id: deliveryId,
        events: events,
        last_updated: events.length > 0 ? events[0].created_at : null,
      };
    } catch (error) {
      logger.error("Error getting delivery tracking:", error);
      throw error;
    }
  }

  /**
   * Update delivery tracking
   */
  static async updateDeliveryTracking(trackingData) {
    const transaction = await sequelize.transaction();

    try {
      const trackingId = uuidv4();

      await sequelize.query(
        `
        INSERT INTO delivery_tracking (
          id, delivery_id, driver_id, status, latitude, longitude,
          accuracy, heading, speed, notes, created_at, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        {
          replacements: [
            trackingId,
            trackingData.delivery_id,
            trackingData.driver_id,
            trackingData.status,
            trackingData.location?.latitude,
            trackingData.location?.longitude,
            trackingData.location?.accuracy,
            trackingData.location?.heading,
            trackingData.location?.speed,
            trackingData.notes,
            trackingData.timestamp,
            trackingData.updated_by,
          ],
          type: sequelize.QueryTypes.INSERT,
          transaction,
        }
      );

      // Update the latest tracking info in deliveries table
      await sequelize.query(
        `
        UPDATE deliveries 
        SET last_tracked_at = ?, last_known_lat = ?, last_known_lng = ?
        WHERE id = ?
      `,
        {
          replacements: [
            trackingData.timestamp,
            trackingData.location?.latitude,
            trackingData.location?.longitude,
            trackingData.delivery_id,
          ],
          type: sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );

      await transaction.commit();

      logger.info(`Delivery tracking updated: ${trackingData.delivery_id}`);
      return trackingId;
    } catch (error) {
      await transaction.rollback();
      logger.error("Error updating delivery tracking:", error);
      throw error;
    }
  }

  /**
   * Save location history
   */
  static async saveLocationHistory(locationData) {
    try {
      const locationId = uuidv4();

      await sequelize.query(
        `
        INSERT INTO location_history (
          id, driver_id, latitude, longitude, accuracy, 
          heading, speed, altitude, timestamp, battery_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        {
          replacements: [
            locationId,
            locationData.driver_id,
            locationData.latitude,
            locationData.longitude,
            locationData.accuracy,
            locationData.heading,
            locationData.speed,
            locationData.altitude,
            locationData.timestamp,
            locationData.battery_level,
          ],
          type: sequelize.QueryTypes.INSERT,
        }
      );

      return locationId;
    } catch (error) {
      logger.error("Error saving location history:", error);
      throw error;
    }
  }

  /**
   * Get location history for a driver
   */
  static async getDriverLocationHistory(
    driverId,
    startDate,
    endDate,
    limit = 100
  ) {
    try {
      let sql = `
        SELECT 
          latitude, longitude, accuracy, heading, speed, 
          altitude, timestamp, battery_level
        FROM location_history
        WHERE driver_id = ?
      `;
      let replacements = [driverId];

      if (startDate) {
        sql += ` AND timestamp >= ?`;
        replacements.push(startDate);
      }

      if (endDate) {
        sql += ` AND timestamp <= ?`;
        replacements.push(endDate);
      }

      sql += ` ORDER BY timestamp DESC LIMIT ?`;
      replacements.push(limit);

      return await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      logger.error("Error getting driver location history:", error);
      throw error;
    }
  }

  /**
   * Get location history for a delivery
   */
  static async getLocationHistory(deliveryId) {
    try {
      return await sequelize.query(
        `
        SELECT 
          dt.latitude, dt.longitude, dt.accuracy, dt.heading, 
          dt.speed, dt.status, dt.notes, dt.created_at,
          dr.first_name as driver_first_name,
          dr.last_name as driver_last_name
        FROM delivery_tracking dt
        LEFT JOIN drivers dr ON dt.driver_id = dr.id
        WHERE dt.delivery_id = ? AND dt.latitude IS NOT NULL
        ORDER BY dt.created_at ASC
      `,
        {
          replacements: [deliveryId],
          type: sequelize.QueryTypes.SELECT,
        }
      );
    } catch (error) {
      logger.error("Error getting delivery location history:", error);
      throw error;
    }
  }

  /**
   * Update delivery location during transit
   */
  static async updateDeliveryLocation(deliveryId, locationData) {
    try {
      await sequelize.query(
        `
        UPDATE delivery_tracking 
        SET latitude = ?, longitude = ?, accuracy = ?, heading = ?, 
            speed = ?, updated_at = ?
        WHERE delivery_id = ? AND created_at = (
          SELECT MAX(created_at) FROM (
            SELECT created_at FROM delivery_tracking WHERE delivery_id = ?
          ) as dt_max
        )
      `,
        {
          replacements: [
            locationData.latitude,
            locationData.longitude,
            locationData.accuracy,
            locationData.heading,
            locationData.speed,
            locationData.timestamp,
            deliveryId,
            deliveryId,
          ],
          type: sequelize.QueryTypes.UPDATE,
        }
      );
    } catch (error) {
      logger.error("Error updating delivery location:", error);
      throw error;
    }
  }

  /**
   * Get delivery route information
   */
  static async getDeliveryRoute(deliveryId) {
    try {
      const [route] = await sequelize.query(
        `
        SELECT route_data, estimated_duration, estimated_distance,
               created_at, updated_at
        FROM delivery_routes
        WHERE delivery_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `,
        {
          replacements: [deliveryId],
          type: sequelize.QueryTypes.SELECT,
        }
      );

      if (!route) {
        return null;
      }

      return {
        route_data: JSON.parse(route.route_data),
        estimated_duration: route.estimated_duration,
        estimated_distance: route.estimated_distance,
        created_at: route.created_at,
        updated_at: route.updated_at,
      };
    } catch (error) {
      logger.error("Error getting delivery route:", error);
      throw error;
    }
  }

  /**
   * Save delivery route
   */
  static async saveDeliveryRoute(deliveryId, routeData) {
    try {
      const routeId = uuidv4();

      await sequelize.query(
        `
        INSERT INTO delivery_routes (
          id, delivery_id, route_data, estimated_duration, 
          estimated_distance, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `,
        {
          replacements: [
            routeId,
            deliveryId,
            JSON.stringify(routeData),
            routeData.duration,
            routeData.distance,
          ],
          type: sequelize.QueryTypes.INSERT,
        }
      );

      return routeId;
    } catch (error) {
      logger.error("Error saving delivery route:", error);
      throw error;
    }
  }

  /**
   * Get optimized route using external routing service
   */
  static async getOptimizedRoute(routeData) {
    try {
      // This would typically call an external routing service like Google Maps, MapBox, etc.
      // For now, return a basic route structure
      const distance = this.calculateDistance(
        routeData.pickup_location.latitude,
        routeData.pickup_location.longitude,
        routeData.delivery_location.latitude,
        routeData.delivery_location.longitude
      );

      // Add waypoints distance if any
      let totalDistance = distance;
      if (routeData.waypoints && routeData.waypoints.length > 0) {
        // Calculate distance through waypoints
        let currentLat = routeData.pickup_location.latitude;
        let currentLng = routeData.pickup_location.longitude;

        for (const waypoint of routeData.waypoints) {
          totalDistance += this.calculateDistance(
            currentLat,
            currentLng,
            waypoint.latitude,
            waypoint.longitude
          );
          currentLat = waypoint.latitude;
          currentLng = waypoint.longitude;
        }

        totalDistance += this.calculateDistance(
          currentLat,
          currentLng,
          routeData.delivery_location.latitude,
          routeData.delivery_location.longitude
        );
      }

      // Estimate duration based on distance and average speed
      const avgSpeed = 30; // km/h average city speed
      const durationInMinutes = (totalDistance / avgSpeed) * 60;

      return {
        distance: Math.round(totalDistance * 100) / 100, // km
        duration: Math.round(durationInMinutes * 60), // seconds
        polyline: this.generateSimplePolyline(routeData),
        steps: this.generateRouteSteps(routeData),
        waypoints: routeData.waypoints || [],
      };
    } catch (error) {
      logger.error("Error getting optimized route:", error);
      throw error;
    }
  }

  /**
   * Calculate route progress
   */
  static async calculateRouteProgress(deliveryId, currentLocation) {
    try {
      const route = await this.getDeliveryRoute(deliveryId);
      if (!route) {
        return { progress: 0, remaining_distance: 0, remaining_time: 0 };
      }

      // Get delivery destination
      const [delivery] = await sequelize.query(
        `
        SELECT pickup_lat, pickup_lng, delivery_lat, delivery_lng 
        FROM deliveries 
        WHERE id = ?
      `,
        {
          replacements: [deliveryId],
          type: sequelize.QueryTypes.SELECT,
        }
      );

      if (!delivery) {
        return { progress: 0, remaining_distance: 0, remaining_time: 0 };
      }

      // Calculate total route distance
      const totalDistance = this.calculateDistance(
        delivery.pickup_lat,
        delivery.pickup_lng,
        delivery.delivery_lat,
        delivery.delivery_lng
      );

      // Calculate remaining distance from current location to destination
      const remainingDistance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        delivery.delivery_lat,
        delivery.delivery_lng
      );

      // Calculate progress as percentage
      const progress = Math.max(
        0,
        Math.min(
          100,
          ((totalDistance - remainingDistance) / totalDistance) * 100
        )
      );

      // Estimate remaining time
      const avgSpeed = 30; // km/h
      const remainingTime = (remainingDistance / avgSpeed) * 60; // minutes

      return {
        progress: Math.round(progress * 100) / 100,
        remaining_distance: Math.round(remainingDistance * 100) / 100,
        remaining_time: Math.round(remainingTime),
        total_distance: Math.round(totalDistance * 100) / 100,
      };
    } catch (error) {
      logger.error("Error calculating route progress:", error);
      throw error;
    }
  }

  /**
   * Get tracking analytics
   */
  static async getTrackingAnalytics(filters) {
    try {
      let whereClause = "WHERE 1=1";
      let replacements = [];

      // Build time filter
      if (filters.timeframe) {
        const timeFilter = this.buildTimeFilter(filters.timeframe);
        whereClause += ` AND dt.created_at >= ?`;
        replacements.push(timeFilter);
      }

      if (filters.driver_id) {
        whereClause += ` AND dt.driver_id = ?`;
        replacements.push(filters.driver_id);
      }

      if (filters.restaurant_id) {
        whereClause += ` AND d.restaurant_id = ?`;
        replacements.push(filters.restaurant_id);
      }

      const [analytics] = await sequelize.query(
        `
        SELECT 
          COUNT(DISTINCT dt.delivery_id) as total_deliveries,
          AVG(TIMESTAMPDIFF(MINUTE, d.created_at, d.delivery_time)) as avg_delivery_time,
          COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) * 100.0 / COUNT(*) as success_rate,
          AVG(
            CASE WHEN dt.latitude IS NOT NULL AND dt.longitude IS NOT NULL 
            THEN (6371 * acos(cos(radians(d.pickup_lat)) * cos(radians(d.delivery_lat)) * 
                  cos(radians(d.delivery_lng) - radians(d.pickup_lng)) + 
                  sin(radians(d.pickup_lat)) * sin(radians(d.delivery_lat))))
            END
          ) as avg_distance,
          COUNT(CASE WHEN d.delivery_time <= d.estimated_delivery_time THEN 1 END) * 100.0 / 
          COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as on_time_percentage
        FROM delivery_tracking dt
        LEFT JOIN deliveries d ON dt.delivery_id = d.id
        ${whereClause}
      `,
        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        }
      );

      return analytics || {};
    } catch (error) {
      logger.error("Error getting tracking analytics:", error);
      throw error;
    }
  }

  /**
   * Get delivery heatmap data
   */
  static async getDeliveryHeatmap(bounds, timeframe) {
    try {
      const timeFilter = this.buildTimeFilter(timeframe);

      return await sequelize.query(
        `
        SELECT 
          dt.latitude, dt.longitude, 
          COUNT(*) as delivery_count,
          AVG(TIMESTAMPDIFF(MINUTE, d.created_at, d.delivery_time)) as avg_delivery_time
        FROM delivery_tracking dt
        LEFT JOIN deliveries d ON dt.delivery_id = d.id
        WHERE dt.latitude BETWEEN ? AND ?
        AND dt.longitude BETWEEN ? AND ?
        AND dt.created_at >= ?
        AND dt.latitude IS NOT NULL
        AND dt.longitude IS NOT NULL
        GROUP BY 
          ROUND(dt.latitude, 4), 
          ROUND(dt.longitude, 4)
        HAVING delivery_count > 1
        ORDER BY delivery_count DESC
        LIMIT 1000
      `,
        {
          replacements: [
            bounds.south,
            bounds.north,
            bounds.west,
            bounds.east,
            timeFilter,
          ],
          type: sequelize.QueryTypes.SELECT,
        }
      );
    } catch (error) {
      logger.error("Error getting delivery heatmap:", error);
      throw error;
    }
  }

  /**
   * Export tracking data
   */
  static async exportTrackingData(filters) {
    try {
      let whereClause = "WHERE 1=1";
      let replacements = [];

      if (filters.start_date) {
        whereClause += ` AND dt.created_at >= ?`;
        replacements.push(filters.start_date);
      }

      if (filters.end_date) {
        whereClause += ` AND dt.created_at <= ?`;
        replacements.push(filters.end_date);
      }

      if (filters.delivery_ids && filters.delivery_ids.length > 0) {
        whereClause += ` AND dt.delivery_id IN (${filters.delivery_ids
          .map(() => "?")
          .join(",")})`;
        replacements.push(...filters.delivery_ids);
      }

      return await sequelize.query(
        `
        SELECT 
          dt.delivery_id,
          d.tracking_number,
          d.order_id,
          dt.status,
          dt.latitude,
          dt.longitude,
          dt.accuracy,
          dt.heading,
          dt.speed,
          dt.notes,
          dt.created_at,
          dr.first_name as driver_first_name,
          dr.last_name as driver_last_name,
          d.pickup_address,
          d.delivery_address
        FROM delivery_tracking dt
        LEFT JOIN deliveries d ON dt.delivery_id = d.id
        LEFT JOIN drivers dr ON dt.driver_id = dr.id
        ${whereClause}
        ORDER BY dt.created_at DESC
        LIMIT 10000
      `,
        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        }
      );
    } catch (error) {
      logger.error("Error exporting tracking data:", error);
      throw error;
    }
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================

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
   * Build time filter for queries
   */
  static buildTimeFilter(timeframe) {
    const now = new Date();

    switch (timeframe) {
      case "hour":
        return new Date(now.getTime() - 60 * 60 * 1000);
      case "day":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "month":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Generate simple polyline for route visualization
   */
  static generateSimplePolyline(routeData) {
    // This would typically be generated by the routing service
    // For now, return a simple line between pickup and delivery
    const points = [
      [routeData.pickup_location.latitude, routeData.pickup_location.longitude],
    ];

    if (routeData.waypoints) {
      routeData.waypoints.forEach((waypoint) => {
        points.push([waypoint.latitude, waypoint.longitude]);
      });
    }

    points.push([
      routeData.delivery_location.latitude,
      routeData.delivery_location.longitude,
    ]);

    return points;
  }

  /**
   * Generate route steps
   */
  static generateRouteSteps(routeData) {
    const steps = [];

    steps.push({
      instruction: "Start at pickup location",
      distance: 0,
      duration: 0,
      location: routeData.pickup_location,
    });

    if (routeData.waypoints) {
      routeData.waypoints.forEach((waypoint, index) => {
        steps.push({
          instruction: waypoint.description || `Stop ${index + 1}`,
          distance: 0, // Would be calculated by routing service
          duration: waypoint.stop_duration || 0,
          location: waypoint,
        });
      });
    }

    steps.push({
      instruction: "Arrive at delivery location",
      distance: 0,
      duration: 0,
      location: routeData.delivery_location,
    });

    return steps;
  }
}

module.exports = Tracking;
