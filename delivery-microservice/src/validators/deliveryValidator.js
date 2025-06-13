
const Joi = require('joi');

// ================================================================
// DELIVERY VALIDATION SCHEMAS
// ================================================================

// Validate delivery creation
const validateDelivery = (data) => {
  const schema = Joi.object({
    order_id: Joi.string().uuid().required(),
    customer_id: Joi.string().uuid().optional(), // Can be derived from order
    restaurant_id: Joi.string().uuid().optional(), // Can be derived from order
    pickup_address: Joi.string().max(1000).optional(), // Can be derived from restaurant
    pickup_lat: Joi.number().min(-90).max(90).optional(),
    pickup_lng: Joi.number().min(-180).max(180).optional(),
    delivery_address: Joi.string().max(1000).required(),
    delivery_lat: Joi.number().min(-90).max(90).optional(),
    delivery_lng: Joi.number().min(-180).max(180).optional(),
    delivery_instructions: Joi.string().max(500).optional(),
    special_instructions: Joi.string().max(500).optional(),
    delivery_fee: Joi.number().min(0).precision(2).optional(),
    estimated_distance: Joi.number().min(0).max(1000).optional(), // in kilometers
    estimated_delivery_time: Joi.date().greater('now').optional(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
    metadata: Joi.object().optional()
  });

  return schema.validate(data);
};

// Validate delivery status update
const validateDeliveryUpdate = (data) => {
  const schema = Joi.object({
    status: Joi.string().valid(
      'pending', 
      'assigned', 
      'picked_up', 
      'in_transit', 
      'delivered', 
      'cancelled',
      'failed'
    ).required(),
    driver_id: Joi.string().uuid().optional(),
    actual_distance: Joi.number().min(0).max(1000).optional(),
    driver_notes: Joi.string().max(500).optional(),
    completion_photos: Joi.array().items(Joi.string()).max(5).optional(),
    delivery_location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
      accuracy: Joi.number().min(0).optional(),
      timestamp: Joi.date().optional()
    }).optional(),
    reason: Joi.string().max(200).when('status', {
      is: Joi.string().valid('cancelled', 'failed'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  });

  return schema.validate(data);
};

// Validate delivery assignment
const validateDeliveryAssignment = (data) => {
  const schema = Joi.object({
    driver_id: Joi.string().uuid().required(),
    assignment_type: Joi.string().valid('auto', 'manual', 'emergency').default('auto'),
    assignment_reason: Joi.string().max(200).optional(),
    override_distance: Joi.boolean().default(false),
    priority_assignment: Joi.boolean().default(false)
  });

  return schema.validate(data);
};

// Validate delivery location update
const validateLocationUpdate = (data) => {
  const schema = Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    accuracy: Joi.number().min(0).max(100).optional(),
    speed: Joi.number().min(0).max(200).optional(), // km/h
    heading: Joi.number().min(0).max(360).optional(), // degrees
    altitude: Joi.number().optional(),
    timestamp: Joi.date().max('now').optional(),
    battery_level: Joi.number().min(0).max(100).optional(),
    is_mock_location: Joi.boolean().default(false)
  });

  return schema.validate(data);
};

// Validate QR code operation
const validateQRCode = (data) => {
  const schema = Joi.object({
    qr_code: Joi.string().min(10).max(50).required(),
    type: Joi.string().valid('pickup', 'delivery').required(),
    location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
      accuracy: Joi.number().min(0).optional()
    }).optional(),
    timestamp: Joi.date().max('now').optional(),
    notes: Joi.string().max(200).optional()
  });

  return schema.validate(data);
};

// Validate delivery rating
const validateDeliveryRating = (data) => {
  const schema = Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    feedback: Joi.string().max(1000).optional(),
    categories: Joi.object({
      delivery_time: Joi.number().integer().min(1).max(5).optional(),
      communication: Joi.number().integer().min(1).max(5).optional(),
      professionalism: Joi.number().integer().min(1).max(5).optional(),
      food_condition: Joi.number().integer().min(1).max(5).optional()
    }).optional(),
    tips: Joi.number().min(0).max(100).precision(2).optional(),
    anonymous: Joi.boolean().default(false)
  });

  return schema.validate(data);
};

// Validate delivery issue report
const validateDeliveryIssue = (data) => {
  const schema = Joi.object({
    issue_type: Joi.string().valid(
      'food_quality',
      'missing_items', 
      'wrong_order',
      'late_delivery',
      'driver_behavior',
      'damaged_items',
      'wrong_address',
      'payment_issue',
      'other'
    ).required(),
    description: Joi.string().min(10).max(1000).required(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    photos: Joi.array().items(Joi.string()).max(5).optional(),
    contact_preferred: Joi.boolean().default(false),
    refund_requested: Joi.boolean().default(false),
    resolution_expected: Joi.string().max(500).optional()
  });

  return schema.validate(data);
};

// Validate emergency stop
const validateEmergencyStop = (data) => {
  const schema = Joi.object({
    reason: Joi.string().valid(
      'accident',
      'vehicle_breakdown',
      'health_emergency',
      'security_threat',
      'weather_emergency',
      'other'
    ).required(),
    description: Joi.string().min(10).max(500).required(),
    location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
      address: Joi.string().max(200).optional()
    }).required(),
    contact_emergency_services: Joi.boolean().default(false),
    notify_customer: Joi.boolean().default(true),
    notify_restaurant: Joi.boolean().default(true)
  });

  return schema.validate(data);
};

module.exports = {
  validateDelivery,
  validateDeliveryUpdate,
  validateDeliveryAssignment,
  validateLocationUpdate,
  validateQRCode,
  validateDeliveryRating,
  validateDeliveryIssue,
  validateEmergencyStop
};



