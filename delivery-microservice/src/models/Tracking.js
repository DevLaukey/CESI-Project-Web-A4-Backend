const db = require("../config/database");
const logger = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

/**
 * Tracking Model
 * Handles all database operations for tracking data
 */
class Tracking {
  /**
   * Get delivery tracking information
   */
  static async getDeliveryTracking(deliveryId) {
    try {
      const query = `
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
      `;

      const [rows] = await db.execute(query, [deliveryId]);

      return {
        delivery_id: deliveryId,
        events: rows,
        last_updated: rows.length > 0 ? rows[0].created_at : null,
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
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const trackingId = uuidv4();

      const query = `
        INSERT INTO delivery_tracking (
          id, delivery_id, driver_id, status, latitude, longitude,
          accuracy, heading, speed, notes, created_at, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
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
      ];

      await connection.execute(query, values);

      // Update the latest tracking info in deliveries table
      await connection.execute(
        `UPDATE deliveries 
         SET last_tracked_at = ?, last_known_lat = ?, last_known_lng = ?
         WHERE id = ?`,
        [
          trackingData.timestamp,
          trackingData.location?.latitude,
          trackingData.location?.longitude,
          trackingData.delivery_id,
        ]
      );

      await connection.commit();

      logger.info(`Delivery tracking updated: ${trackingData.delivery_id}`);
      return trackingId;
    } catch (error) {
      await connection.rollback();
      logger.error("Error updating delivery tracking:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Save location history
   */
  static async saveLocationHistory(locationData) {
    try {
      const locationId = uuidv4();

      const query = `
        INSERT INTO location_history (
          id, driver_id, latitude, longitude, accuracy, 
          heading, speed, altitude, timestamp, battery_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
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
      ];

      await db.execute(query, values);
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
      let query = `
        SELECT 
          latitude, longitude, accuracy, heading, speed, 
          altitude, timestamp, battery_level
        FROM location_history
        WHERE driver_id = ?
      `;

      const params = [driverId];

      if (startDate) {
        query += ` AND timestamp >= ?`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND timestamp <= ?`;
        params.push(endDate);
      }

      query += ` ORDER BY timestamp DESC LIMIT ?`;
      params.push(limit);

      const [rows] = await db.execute(query, params);
      return rows;
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
      const query = `
        SELECT 
          dt.latitude, dt.longitude, dt.accuracy, dt.heading, 
          dt.speed, dt.status, dt.notes, dt.created_at,
          dr.first_name as driver_first_name,
          dr.last_name as driver_last_name
        FROM delivery_tracking dt
        LEFT JOIN drivers dr ON dt.driver_id = dr.id
        WHERE dt.delivery_id = ? AND dt.latitude IS NOT NULL
        ORDER BY dt.created_at ASC
      `;

      const [rows] = await db.execute(query, [deliveryId]);
      return rows;
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
      const query = `
        UPDATE delivery_tracking 
        SET latitude = ?, longitude = ?, accuracy = ?, heading = ?, 
            speed = ?, updated_at = ?
        WHERE delivery_id = ? AND created_at = (
          SELECT MAX(created_at) FROM delivery_tracking WHERE delivery_id = ?
        )
      `;

      const values = [
        locationData.latitude,
        locationData.longitude,
        locationData.accuracy,
        locationData.heading,
        locationData.speed,
        locationData.timestamp,
        deliveryId,
        deliveryId,
      ];

      await db.execute(query, values);
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
      const query = `
        SELECT route_data, estimated_duration, estimated_distance,
               created_at, updated_at
        FROM delivery_routes
        WHERE delivery_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const [rows] = await db.execute(query, [deliveryId]);

      if (rows.length === 0) {
        return null;
      }

      const route = rows[0];
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

      const query = `
        INSERT INTO delivery_routes (
          id, delivery_id, route_data, estimated_duration, 
          estimated_distance, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const values = [
        routeId,
        deliveryId,
        JSON.stringify(routeData),
        routeData.duration,
        routeData.distance,
      ];

      await db.execute(query, values);
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
      const [deliveryRows] = await db.execute(
        "SELECT pickup_lat, pickup_lng, delivery_lat, delivery_lng FROM deliveries WHERE id = ?",
        [deliveryId]
      );

      if (deliveryRows.length === 0) {
        return { progress: 0, remaining_distance: 0, remaining_time: 0 };
      }

      const delivery = deliveryRows[0];

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
      const params = [];

      // Build time filter
      if (filters.timeframe) {
        const timeFilter = this.buildTimeFilter(filters.timeframe);
        whereClause += ` AND dt.created_at >= ?`;
        params.push(timeFilter);
      }

      if (filters.driver_id) {
        whereClause += ` AND dt.driver_id = ?`;
        params.push(filters.driver_id);
      }

      if (filters.restaurant_id) {
        whereClause += ` AND d.restaurant_id = ?`;
        params.push(filters.restaurant_id);
      }

      const query = `
        SELECT 
          COUNT(DISTINCT dt.delivery_id) as total_deliveries,
          AVG(TIMESTAMPDIFF(MINUTE, d.created_at, d.delivered_at)) as avg_delivery_time,
          COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) * 100.0 / COUNT(*) as success_rate,
          AVG(
            CASE WHEN dt.latitude IS NOT NULL AND dt.longitude IS NOT NULL 
            THEN (6371 * acos(cos(radians(d.pickup_lat)) * cos(radians(d.delivery_lat)) * 
                  cos(radians(d.delivery_lng) - radians(d.pickup_lng)) + 
                  sin(radians(d.pickup_lat)) * sin(radians(d.delivery_lat))))
            END
          ) as avg_distance,
          COUNT(CASE WHEN d.delivered_at <= d.estimated_delivery_time THEN 1 END) * 100.0 / 
          COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as on_time_percentage
        FROM delivery_tracking dt
        LEFT JOIN deliveries d ON dt.delivery_id = d.id
        ${whereClause}
      `;

      const [rows] = await db.execute(query, params);
      return rows[0] || {};
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

      const query = `
        SELECT 
          dt.latitude, dt.longitude, 
          COUNT(*) as delivery_count,
          AVG(TIMESTAMPDIFF(MINUTE, d.created_at, d.delivered_at)) as avg_delivery_time
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
      `;

      const params = [
        bounds.south,
        bounds.north,
        bounds.west,
        bounds.east,
        timeFilter,
      ];

      const [rows] = await db.execute(query, params);
      return rows;
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
      const params = [];

      if (filters.start_date) {
        whereClause += ` AND dt.created_at >= ?`;
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        whereClause += ` AND dt.created_at <= ?`;
        params.push(filters.end_date);
      }

      if (filters.delivery_ids && filters.delivery_ids.length > 0) {
        whereClause += ` AND dt.delivery_id IN (${filters.delivery_ids
          .map(() => "?")
          .join(",")})`;
        params.push(...filters.delivery_ids);
      }

      const query = `
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
      `;

      const [rows] = await db.execute(query, params);
      return rows;
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
