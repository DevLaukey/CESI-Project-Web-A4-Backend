// utils/eventEmitter.js
const EventEmitter = require("events");
const emitter = new EventEmitter();

emitter.on("OrderCreated", ({ orderId, user_id, restaurant_id }) => {
  console.log(
    `[Event] Order ${orderId} created for user ${user_id} and restaurant ${restaurant_id}`
  );
});

emitter.on("OrderStatusUpdated", ({ id, status }) => {
  console.log(`[Event] Order ${id} status updated to ${status}`);
});

module.exports = emitter;
