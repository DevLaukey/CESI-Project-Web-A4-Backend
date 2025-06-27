const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
};

const DRIVER_STATUS = {
  ONLINE: "online",
  OFFLINE: "offline",
  BUSY: "busy",
};

const ERROR_MESSAGES = {
  ORDER_NOT_FOUND: "Order not found",
  ORDER_NOT_AVAILABLE: "Order is no longer available",
  UNAUTHORIZED: "Unauthorized access",
  VALIDATION_ERROR: "Validation error",
  SERVER_ERROR: "Internal server error",
};

module.exports = {
  ORDER_STATUS,
  DRIVER_STATUS,
  ERROR_MESSAGES,
};
