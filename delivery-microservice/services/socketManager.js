const logger = require("../utils/logger");

class SocketManager {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.init();
  }

  init() {
    this.io.on("connection", (socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      // User authentication and room joining
      socket.on("authenticate", (data) => {
        const { user_id, role } = data;
        this.connectedUsers.set(socket.id, { user_id, role, socket });

        // Join role-specific rooms
        socket.join(`user_${user_id}`);
        socket.join(`role_${role}`);

        if (role === "driver") {
          socket.join("drivers");
        } else if (role === "customer") {
          socket.join("customers");
        }

        logger.info(`User authenticated: ${user_id} as ${role}`);
      });

      // Driver location updates
      socket.on("driver_location_update", (data) => {
        const user = this.connectedUsers.get(socket.id);
        if (user && user.role === "driver") {
          this.broadcastToRoom("customers", "driver_location", {
            driver_id: user.user_id,
            location: data,
          });
        }
      });

      // Delivery status updates from drivers
      socket.on("delivery_status_update", (data) => {
        const user = this.connectedUsers.get(socket.id);
        if (user && user.role === "driver") {
          this.broadcastDeliveryUpdate(data);
        }
      });

      socket.on("disconnect", () => {
        this.connectedUsers.delete(socket.id);
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  // Notify specific user
  notifyUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Notify driver
  notifyDriver(userId, event, data) {
    this.notifyUser(userId, event, data);
  }

  // Broadcast to all users of a specific role
  broadcastToRole(role, event, data) {
    this.io.to(`role_${role}`).emit(event, data);
  }

  // Broadcast to specific room
  broadcastToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  // Broadcast delivery updates
  broadcastDeliveryUpdate(delivery) {
    // Notify customer
    this.notifyUser(delivery.customer_id, "delivery_update", delivery);

    // Notify driver if assigned
    if (delivery.driver_id) {
      this.notifyUser(delivery.driver_id, "delivery_update", delivery);
    }

    // Notify restaurant
    this.io
      .to(`restaurant_${delivery.restaurant_id}`)
      .emit("delivery_update", delivery);
  }

  // Update driver location
  updateDriverLocation(driverId, location) {
    this.broadcastToRole("customer", "driver_location_update", {
      driver_id: driverId,
      location: location,
      timestamp: new Date().toISOString(),
    });
  }

  // Update driver availability
  updateDriverAvailability(driverId, available) {
    this.broadcastToRole("admin", "driver_availability_update", {
      driver_id: driverId,
      available: available,
      timestamp: new Date().toISOString(),
    });
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get connected users by role
  getConnectedUsersByRole(role) {
    return Array.from(this.connectedUsers.values()).filter(
      (user) => user.role === role
    ).length;
  }
}

module.exports = SocketManager;
