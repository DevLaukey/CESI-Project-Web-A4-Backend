const Joi = require("joi");

// ================================================================
// DRIVER VALIDATION SCHEMAS
// ================================================================

// Validate driver registration
const validateDriver = (data) => {
  const schema = Joi.object({
    // Personal Information
    license_number: Joi.string().min(5).max(50).required(),
    license_expiry: Joi.date().greater("now").required(),
    phone_number: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]{10,20}$/)
      .required(),

    // Vehicle Information
    vehicle_type: Joi.string()
      .valid("bike", "scooter", "car", "truck", "bicycle")
      .required(),
    vehicle_make: Joi.string().max(50).optional(),
    vehicle_model: Joi.string().max(50).optional(),
    vehicle_year: Joi.number()
      .integer()
      .min(1990)
      .max(new Date().getFullYear() + 1)
      .optional(),
    vehicle_color: Joi.string().max(30).optional(),
    license_plate: Joi.string().min(2).max(20).required(),

    // Insurance Information
    insurance_number: Joi.string().max(100).optional(),
    insurance_expiry: Joi.date().greater("now").optional(),

    // Banking Information
    bank_account_holder: Joi.string().max(100).optional(),
    bank_account_number: Joi.string().max(50).optional(),
    bank_routing_number: Joi.string().max(20).optional(),
    bank_name: Joi.string().max(100).optional(),

    // Emergency Contact
    emergency_contact_name: Joi.string().max(100).required(),
    emergency_contact_phone: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]{10,20}$/)
      .required(),
    emergency_contact_relationship: Joi.string().max(50).required(),

    // Work Preferences
    preferred_work_areas: Joi.array().items(Joi.string()).max(10).optional(),
    max_delivery_radius: Joi.number().min(1).max(100).default(15),
    work_schedule: Joi.object({
      monday: Joi.object({
        start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        available: Joi.boolean().default(true),
      }).optional(),
      tuesday: Joi.object({
        start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        available: Joi.boolean().default(true),
      }).optional(),
      wednesday: Joi.object({
        start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        available: Joi.boolean().default(true),
      }).optional(),
      thursday: Joi.object({
        start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        available: Joi.boolean().default(true),
      }).optional(),
      friday: Joi.object({
        start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        available: Joi.boolean().default(true),
      }).optional(),
      saturday: Joi.object({
        start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        available: Joi.boolean().default(true),
      }).optional(),
      sunday: Joi.object({
        start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        available: Joi.boolean().default(true),
      }).optional(),
    }).optional(),

    // Referral
    referral_code: Joi.string().max(20).optional(),

    // Documents (file uploads handled separately)
    documents: Joi.object({
      license_front: Joi.string().optional(),
      license_back: Joi.string().optional(),
      insurance_card: Joi.string().optional(),
      vehicle_registration: Joi.string().optional(),
      background_check: Joi.string().optional(),
      profile_photo: Joi.string().optional(),
    }).optional(),

    // Agreement
    terms_accepted: Joi.boolean().valid(true).required(),
    privacy_policy_accepted: Joi.boolean().valid(true).required(),
    background_check_consent: Joi.boolean().valid(true).required(),
  });

  return schema.validate(data);
};

// Validate driver profile update
const validateDriverUpdate = (data) => {
  const schema = Joi.object({
    phone_number: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]{10,20}$/)
      .optional(),
    vehicle_make: Joi.string().max(50).optional(),
    vehicle_model: Joi.string().max(50).optional(),
    vehicle_year: Joi.number()
      .integer()
      .min(1990)
      .max(new Date().getFullYear() + 1)
      .optional(),
    vehicle_color: Joi.string().max(30).optional(),
    license_plate: Joi.string().min(2).max(20).optional(),
    insurance_number: Joi.string().max(100).optional(),
    insurance_expiry: Joi.date().greater("now").optional(),
    bank_account_holder: Joi.string().max(100).optional(),
    bank_account_number: Joi.string().max(50).optional(),
    bank_routing_number: Joi.string().max(20).optional(),
    bank_name: Joi.string().max(100).optional(),
    emergency_contact_name: Joi.string().max(100).optional(),
    emergency_contact_phone: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]{10,20}$/)
      .optional(),
    emergency_contact_relationship: Joi.string().max(50).optional(),
    preferred_work_areas: Joi.array().items(Joi.string()).max(10).optional(),
    max_delivery_radius: Joi.number().min(1).max(100).optional(),
  });

  return schema.validate(data);
};

// Validate driver availability update
const validateAvailabilityUpdate = (data) => {
  const schema = Joi.object({
    available: Joi.boolean().required(),
    location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
      accuracy: Joi.number().min(0).optional(),
    }).when("available", {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    work_until: Joi.date().greater("now").optional(),
    break_duration: Joi.number().min(0).max(480).optional(), // minutes
  });

  return schema.validate(data);
};

// Validate driver vehicle update
const validateVehicleUpdate = (data) => {
  const schema = Joi.object({
    vehicle_type: Joi.string()
      .valid("bike", "scooter", "car", "truck", "bicycle")
      .optional(),
    vehicle_make: Joi.string().max(50).optional(),
    vehicle_model: Joi.string().max(50).optional(),
    vehicle_year: Joi.number()
      .integer()
      .min(1990)
      .max(new Date().getFullYear() + 1)
      .optional(),
    vehicle_color: Joi.string().max(30).optional(),
    license_plate: Joi.string().min(2).max(20).optional(),
    insurance_number: Joi.string().max(100).optional(),
    insurance_expiry: Joi.date().greater("now").optional(),
  });

  return schema.validate(data);
};

// Validate driver schedule update
const validateScheduleUpdate = (data) => {
  const daySchema = Joi.object({
    start: Joi.string()
      .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .required(),
    end: Joi.string()
      .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .required(),
    available: Joi.boolean().default(true),
  }).custom((value, helpers) => {
    const start = parseInt(value.start.replace(":", ""));
    const end = parseInt(value.end.replace(":", ""));
    if (start >= end) {
      return helpers.error("custom.invalidTimeRange");
    }
    return value;
  });

  const schema = Joi.object({
    monday: daySchema.optional(),
    tuesday: daySchema.optional(),
    wednesday: daySchema.optional(),
    thursday: daySchema.optional(),
    friday: daySchema.optional(),
    saturday: daySchema.optional(),
    sunday: daySchema.optional(),
    timezone: Joi.string().optional(),
  });

  return schema.validate(data, {
    messages: {
      "custom.invalidTimeRange": "Start time must be before end time",
    },
  });
};

// Validate vehicle issue report
const validateVehicleIssue = (data) => {
  const schema = Joi.object({
    issue_type: Joi.string()
      .valid(
        "breakdown",
        "accident",
        "maintenance_needed",
        "damage",
        "theft",
        "other"
      )
      .required(),
    description: Joi.string().min(10).max(1000).required(),
    severity: Joi.string()
      .valid("low", "medium", "high", "critical")
      .default("medium"),
    affects_deliveries: Joi.boolean().default(true),
    location: Joi.object({
      lat: Joi.number().min(-90).max(90).optional(),
      lng: Joi.number().min(-180).max(180).optional(),
      address: Joi.string().max(200).optional(),
    }).optional(),
    photos: Joi.array().items(Joi.string()).max(5).optional(),
    estimated_repair_time: Joi.string()
      .valid(
        "less_than_hour",
        "1_to_4_hours",
        "4_to_24_hours",
        "1_to_3_days",
        "more_than_3_days",
        "unknown"
      )
      .optional(),
    insurance_claim: Joi.boolean().default(false),
    police_report: Joi.boolean().default(false),
  });

  return schema.validate(data);
};

module.exports = {
  validateDriver,
  validateDriverUpdate,
  validateAvailabilityUpdate,
  validateVehicleUpdate,
  validateScheduleUpdate,
  validateVehicleIssue,
};
