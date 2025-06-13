const Joi = require("joi");

// ================================================================
// TRACKING VALIDATION SCHEMAS
// ================================================================

// Validate tracking number format
const validateTrackingNumber = (trackingNumber) => {
  const schema = Joi.string()
    .pattern(/^TRK[A-Z0-9]{8,12}$/)
    .required();

  return schema.validate(trackingNumber);
};

// Validate delivery milestone update
const validateDeliveryMilestone = (data) => {
  const schema = Joi.object({
    milestone: Joi.string()
      .valid(
        "order_confirmed",
        "driver_assigned",
        "arrived_at_restaurant",
        "order_picked_up",
        "en_route_to_customer",
        "arrived_at_destination",
        "delivery_completed",
        "delivery_failed"
      )
      .required(),
    location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
      accuracy: Joi.number().min(0).optional(),
      address: Joi.string().max(200).optional(),
    }).required(),
    timestamp: Joi.date().max("now").required(),
    notes: Joi.string().max(300).optional(),
    photos: Joi.array().items(Joi.string()).max(3).optional(),
    customer_signature: Joi.string().optional(),
    verification_code: Joi.string().min(4).max(10).optional(),
  });

  return schema.validate(data);
};

// Validate route optimization request
const validateRouteOptimization = (data) => {
  const schema = Joi.object({
    driver_location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
    }).required(),
    pickup_location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
    }).required(),
    delivery_location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
    }).required(),
    optimization_type: Joi.string()
      .valid("fastest", "shortest", "fuel_efficient")
      .default("fastest"),
    avoid_tolls: Joi.boolean().default(false),
    avoid_highways: Joi.boolean().default(false),
    vehicle_type: Joi.string()
      .valid("bike", "scooter", "car", "truck")
      .optional(),
  });

  return schema.validate(data);
};

// Validate WebSocket subscription
const validateWebSocketSubscription = (data) => {
  const schema = Joi.object({
    tracking_number: Joi.string()
      .pattern(/^TRK[A-Z0-9]{8,12}$/)
      .required(),
    user_type: Joi.string()
      .valid("customer", "driver", "restaurant", "admin")
      .required(),
    user_id: Joi.string().uuid().required(),
    subscription_types: Joi.array()
      .items(
        Joi.string().valid(
          "location_updates",
          "status_changes",
          "eta_updates",
          "milestone_updates",
          "driver_messages"
        )
      )
      .min(1)
      .required(),
  });

  return schema.validate(data);
};

module.exports = {
  validateTrackingNumber,
  validateDeliveryMilestone,
  validateRouteOptimization,
  validateWebSocketSubscription,
};
