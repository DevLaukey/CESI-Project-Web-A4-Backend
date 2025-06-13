const Joi = require('joi');

// ================================================================
// ADMIN VALIDATION SCHEMAS
// ================================================================

// Validate driver verification
const validateDriverVerification = (data) => {
  const schema = Joi.object({
    verification_status: Joi.string().valid('approved', 'rejected').required(),
    verification_notes: Joi.string().max(1000).optional(),
    background_check_status: Joi.string().valid('passed', 'failed', 'pending').optional(),
    document_verification: Joi.object({
      license_verified: Joi.boolean().default(false),
      insurance_verified: Joi.boolean().default(false),
      vehicle_verified: Joi.boolean().default(false),
      background_check_verified: Joi.boolean().default(false)
    }).optional(),
    conditions: Joi.array().items(Joi.string().max(200)).optional(),
    verification_date: Joi.date().optional(),
    verifier_id: Joi.string().uuid().optional()
  });

  return schema.validate(data);
};

// Validate driver suspension
const validateDriverSuspension = (data) => {
  const schema = Joi.object({
    suspension_reason: Joi.string().valid(
      'policy_violation',
      'customer_complaints',
      'safety_concerns',
      'document_issues',
      'performance_issues',
      'fraudulent_activity',
      'other'
    ).required(),
    suspension_details: Joi.string().min(10).max(1000).required(),
    suspension_duration: Joi.string().valid(
      'temporary_24h',
      'temporary_3d',
      'temporary_7d',
      'temporary_30d',
      'indefinite',
      'permanent'
    ).required(),
    automatic_reactivation: Joi.boolean().default(false),
    reactivation_date: Joi.date().greater('now').optional(),
    notify_driver: Joi.boolean().default(true),
    require_retraining: Joi.boolean().default(false),
    additional_requirements: Joi.array().items(Joi.string().max(200)).optional()
  });

  return schema.validate(data);
};

// Validate delivery reassignment
const validateDeliveryReassignment = (data) => {
  const schema = Joi.object({
    new_driver_id: Joi.string().uuid().required(),
    reassignment_reason: Joi.string().valid(
      'driver_unavailable',
      'driver_requested',
      'customer_complaint',
      'efficiency_optimization',
      'emergency_situation',
      'other'
    ).required(),
    reassignment_notes: Joi.string().max(500).optional(),
    notify_customer: Joi.boolean().default(true),
    notify_restaurant: Joi.boolean().default(true),
    notify_original_driver: Joi.boolean().default(true),
    compensation_adjustment: Joi.number().precision(2).optional()
  });

  return schema.validate(data);
};

// Validate system configuration update
const validateSystemConfig = (data) => {
  const schema = Joi.object({
    delivery_radius: Joi.number().min(1).max(100).optional(),
    max_delivery_time: Joi.number().min(15).max(180).optional(), // minutes
    delivery_fee_base: Joi.number().min(0).precision(2).optional(),
    delivery_fee_per_km: Joi.number().min(0).precision(2).optional(),
    driver_commission_rate: Joi.number().min(0).max(1).precision(4).optional(),
    auto_assignment_enabled: Joi.boolean().optional(),
    auto_assignment_radius: Joi.number().min(1).max(50).optional(),
    priority_assignment_enabled: Joi.boolean().optional(),
    emergency_contact_enabled: Joi.boolean().optional(),
    real_time_tracking_enabled: Joi.boolean().optional(),
    qr_validation_required: Joi.boolean().optional(),
    customer_rating_required: Joi.boolean().optional(),
    driver_background_check_required: Joi.boolean().optional(),
    vehicle_inspection_required: Joi.boolean().optional(),
    insurance_verification_required: Joi.boolean().optional()
  });

  return schema.validate(data);
};

// Validate zone configuration
const validateZoneConfig = (data) => {
  const schema = Joi.object({
    zones: Joi.array().items(
      Joi.object({
        id: Joi.string().optional(),
        name: Joi.string().max(100).required(),
        coordinates: Joi.array().items(
          Joi.object({
            lat: Joi.number().min(-90).max(90).required(),
            lng: Joi.number().min(-180).max(180).required()
          })
        ).min(3).required(), // Minimum 3 points for a polygon
        delivery_fee_multiplier: Joi.number().min(0.5).max(3).default(1),
        priority: Joi.string().valid('low', 'normal', 'high').default('normal'),
        active: Joi.boolean().default(true),
        max_drivers: Joi.number().min(1).optional(),
        special_requirements: Joi.array().items(Joi.string()).optional()
      })
    ).required()
  });

  return schema.validate(data);
};

// Validate report generation
const validateReportGeneration = (data) => {
  const schema = Joi.object({
    report_type: Joi.string().valid(
      'delivery_performance',
      'driver_performance',
      'financial_summary',
      'customer_satisfaction',
      'operational_metrics',
      'custom'
    ).required(),
    date_range: Joi.object({
      start_date: Joi.date().required(),
      end_date: Joi.date().greater(Joi.ref('start_date')).required()
    }).required(),
    filters: Joi.object({
      driver_ids: Joi.array().items(Joi.string().uuid()).optional(),
      restaurant_ids: Joi.array().items(Joi.string().uuid()).optional(),
      delivery_zones: Joi.array().items(Joi.string()).optional(),
      delivery_status: Joi.array().items(Joi.string()).optional(),
      rating_threshold: Joi.number().min(1).max(5).optional()
    }).optional(),
    format: Joi.string().valid('pdf', 'excel', 'csv', 'json').default('pdf'),
    include_charts: Joi.boolean().default(true),
    include_raw_data: Joi.boolean().default(false),
    email_recipients: Joi.array().items(Joi.string().email()).optional()
  });

  return schema.validate(data);
};

module.exports = {
  validateDriverVerification,
  validateDriverSuspension,
  validateDeliveryReassignment,
  validateSystemConfig,
  validateZoneConfig,
  validateReportGeneration
};
