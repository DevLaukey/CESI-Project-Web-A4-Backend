// src/utils/socketManager.js
class SocketManager {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Store client connection
      this.connectedClients.set(socket.id, {
        socket,
        joinedAt: new Date(),
        rooms: new Set(),
      });

      // Handle client joining tracking rooms
      socket.on("join-tracking", (deliveryId) => {
        const room = `delivery-${deliveryId}`;
        socket.join(room);
        this.connectedClients.get(socket.id)?.rooms.add(room);
        console.log(`Client ${socket.id} joined tracking room: ${room}`);
      });

      // Handle client leaving tracking rooms
      socket.on("leave-tracking", (deliveryId) => {
        const room = `delivery-${deliveryId}`;
        socket.leave(room);
        this.connectedClients.get(socket.id)?.rooms.delete(room);
        console.log(`Client ${socket.id} left tracking room: ${room}`);
      });

      // Handle driver location updates
      socket.on("driver-location-update", (data) => {
        const { deliveryId, location, driverId } = data;

        // Broadcast to all clients tracking this delivery
        socket.to(`delivery-${deliveryId}`).emit("location-update", {
          deliveryId,
          location,
          driverId,
          timestamp: new Date(),
        });
      });

      // Handle delivery status updates
      socket.on("delivery-status-update", (data) => {
        const { deliveryId, status, message } = data;

        // Broadcast to all clients tracking this delivery
        this.io.to(`delivery-${deliveryId}`).emit("status-update", {
          deliveryId,
          status,
          message,
          timestamp: new Date(),
        });
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  // Emit delivery location update to specific delivery room
  emitLocationUpdate(deliveryId, locationData) {
    this.io.to(`delivery-${deliveryId}`).emit("location-update", {
      deliveryId,
      ...locationData,
      timestamp: new Date(),
    });
  }

  // Emit delivery status update to specific delivery room
  emitStatusUpdate(deliveryId, statusData) {
    this.io.to(`delivery-${deliveryId}`).emit("status-update", {
      deliveryId,
      ...statusData,
      timestamp: new Date(),
    });
  }

  // Emit delivery assignment to driver
  emitDeliveryAssignment(driverId, deliveryData) {
    // You could implement driver-specific rooms here
    this.io.emit("delivery-assigned", {
      driverId,
      ...deliveryData,
      timestamp: new Date(),
    });
  }

  // Get connected clients count
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  // Get clients in a specific room
  getClientsInRoom(room) {
    return this.io.sockets.adapter.rooms.get(room)?.size || 0;
  }

  // Broadcast to all connected clients
  broadcast(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }
}

module.exports = SocketManager;
