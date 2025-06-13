const Joi = require("joi");

/**
 * Driver Input Validators
 * Validates request data for driver endpoints
 */

// Driver registration validation
const validateDriverRegistration = (data) => {
  const schema = Joi.object({
    first_name: Joi.string().min(2).max(50).required().messages({
      "string.base": "First name must be a string",
      "string.min": "First name must be at least 2 characters",
      "string.max": "First name cannot exceed 50 characters",
      "any.required": "First name is required",
    }),

    last_name: Joi.string().min(2).max(50).required().messages({
      "string.base": "Last name must be a string",
      "string.min": "Last name must be at least 2 characters",
      "string.max": "Last name cannot exceed 50 characters",
      "any.required": "Last name is required",
    }),

    phone: Joi.string()
      .pattern(/^\+?[\d\s-()]+$/)
      .min(10)
      .max(20)
      .required()
      .messages({
        "string.base": "Phone must be a string",
        "string.pattern.base": "Phone must be a valid phone number",
        "string.min": "Phone must be at least 10 characters",
        "string.max": "Phone cannot exceed 20 characters",
        "any.required": "Phone is required",
      }),

    date_of_birth: Joi.date().max("now").required().messages({
      "date.base": "Date of birth must be a valid date",
      "date.max": "Date of birth cannot be in the future",
      "any.required": "Date of birth is required",
    }),

    license_number: Joi.string().min(5).max(20).required().messages({
      "string.base": "License number must be a string",
      "string.min": "License number must be at least 5 characters",
      "string.max": "License number cannot exceed 20 characters",
      "any.required": "License number is required",
    }),

    license_expiry: Joi.date().min("now").required().messages({
      "date.base": "License expiry must be a valid date",
      "date.min": "License must not be expired",
      "any.required": "License expiry is required",
    }),

    vehicle_type: Joi.string()
      .valid("motorcycle", "scooter", "bicycle", "car", "van", "truck")
      .required()
      .messages({
        "string.base": "Vehicle type must be a string",
        "any.only": "Invalid vehicle type",
        "any.required": "Vehicle type is required",
      }),

    vehicle_make: Joi.string().min(2).max(50).required().messages({
      "string.base": "Vehicle make must be a string",
      "string.min": "Vehicle make must be at least 2 characters",
      "string.max": "Vehicle make cannot exceed 50 characters",
      "any.required": "Vehicle make is required",
    }),

    vehicle_model: Joi.string().min(2).max(50).required().messages({
      "string.base": "Vehicle model must be a string",
      "string.min": "Vehicle model must be at least 2 characters",
      "string.max": "Vehicle model cannot exceed 50 characters",
      "any.required": "Vehicle model is required",
    }),

    vehicle_year: Joi.number()
      .integer()
      .min(1980)
      .max(new Date().getFullYear() + 1)
      .required()
      .messages({
        "number.base": "Vehicle year must be a number",
        "number.integer": "Vehicle year must be an integer",
        "number.min": "Vehicle year must be at least 1980",
        "number.max": "Vehicle year cannot be in the future",
        "any.required": "Vehicle year is required",
      }),

    vehicle_license: Joi.string().min(3).max(20).required().messages({
      "string.base": "Vehicle license must be a string",
      "string.min": "Vehicle license must be at least 3 characters",
      "string.max": "Vehicle license cannot exceed 20 characters",
      "any.required": "Vehicle license is required",
    }),

    insurance_company: Joi.string().min(2).max(100).required().messages({
      "string.base": "Insurance company must be a string",
      "string.min": "Insurance company must be at least 2 characters",
      "string.max": "Insurance company cannot exceed 100 characters",
      "any.required": "Insurance company is required",
    }),

    insurance_policy: Joi.string().min(5).max(50).required().messages({
      "string.base": "Insurance policy must be a string",
      "string.min": "Insurance policy must be at least 5 characters",
      "string.max": "Insurance policy cannot exceed 50 characters",
      "any.required": "Insurance policy is required",
    }),

    insurance_expiry: Joi.date().min("now").required().messages({
      "date.base": "Insurance expiry must be a valid date",
      "date.min": "Insurance must not be expired",
      "any.required": "Insurance expiry is required",
    }),

    emergency_contact_name: Joi.string().min(2).max(100).required().messages({
      "string.base": "Emergency contact name must be a string",
      "string.min": "Emergency contact name must be at least 2 characters",
      "string.max": "Emergency contact name cannot exceed 100 characters",
      "any.required": "Emergency contact name is required",
    }),

    emergency_contact_phone: Joi.string()
      .pattern(/^\+?[\d\s-()]+$/)
      .min(10)
      .max(20)
      .required()
      .messages({
        "string.base": "Emergency contact phone must be a string",
        "string.pattern.base":
          "Emergency contact phone must be a valid phone number",
        "string.min": "Emergency contact phone must be at least 10 characters",
        "string.max": "Emergency contact phone cannot exceed 20 characters",
        "any.required": "Emergency contact phone is required",
      }),

    bank_account_number: Joi.string().min(8).max(20).optional().messages({
      "string.base": "Bank account number must be a string",
      "string.min": "Bank account number must be at least 8 characters",
      "string.max": "Bank account number cannot exceed 20 characters",
    }),

    bank_routing_number: Joi.string().min(6).max(12).optional().messages({
      "string.base": "Bank routing number must be a string",
      "string.min": "Bank routing number must be at least 6 characters",
      "string.max": "Bank routing number cannot exceed 12 characters",
    }),

    preferred_work_areas: Joi.array()
      .items(Joi.string())
      .max(10)
      .optional()
      .messages({
        "array.base": "Preferred work areas must be an array",
        "array.max": "Cannot specify more than 10 work areas",
      }),

    languages_spoken: Joi.array()
      .items(Joi.string())
      .max(5)
      .optional()
      .messages({
        "array.base": "Languages spoken must be an array",
        "array.max": "Cannot specify more than 5 languages",
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

// Driver profile update validation
const validateDriverUpdate = (data) => {
  const schema = Joi.object({
    first_name: Joi.string().min(2).max(50).optional(),
    last_name: Joi.string().min(2).max(50).optional(),
    phone: Joi.string()
      .pattern(/^\+?[\d\s-()]+$/)
      .min(10)
      .max(20)
      .optional(),

    emergency_contact_name: Joi.string().min(2).max(100).optional(),
    emergency_contact_phone: Joi.string()
      .pattern(/^\+?[\d\s-()]+$/)
      .min(10)
      .max(20)
      .optional(),

    bank_account_number: Joi.string().min(8).max(20).optional().allow(""),
    bank_routing_number: Joi.string().min(6).max(12).optional().allow(""),

    preferred_work_areas: Joi.array().items(Joi.string()).max(10).optional(),
    languages_spoken: Joi.array().items(Joi.string()).max(5).optional(),

    profile_photo: Joi.string().uri().optional().messages({
      "string.uri": "Profile photo must be a valid URL",
    }),

    bio: Joi.string().max(500).optional().allow("").messages({
      "string.max": "Bio cannot exceed 500 characters",
    }),
  });

  return schema.validate(data, { abortEarly: false });
};

// Location update validation
const validateLocationUpdate = (data) => {
  const schema = Joi.object({
    latitude: Joi.number().min(-90).max(90).required().messages({
      "number.base": "Latitude must be a number",
      "number.min": "Latitude must be at least -90",
      "number.max": "Latitude must be at most 90",
      "any.required": "Latitude is required",
    }),

    longitude: Joi.number().min(-180).max(180).required().messages({
      "number.base": "Longitude must be a number",
      "number.min": "Longitude must be at least -180",
      "number.max": "Longitude must be at most 180",
      "any.required": "Longitude is required",
    }),

    heading: Joi.number().min(0).max(360).optional().messages({
      "number.base": "Heading must be a number",
      "number.min": "Heading must be at least 0",
      "number.max": "Heading must be at most 360",
    }),

    speed: Joi.number().min(0).max(200).optional().messages({
      "number.base": "Speed must be a number",
      "number.min": "Speed cannot be negative",
      "number.max": "Speed cannot exceed 200 km/h",
    }),

    accuracy: Joi.number().min(0).max(1000).optional().messages({
      "number.base": "Accuracy must be a number",
      "number.min": "Accuracy cannot be negative",
      "number.max": "Accuracy cannot exceed 1000 meters",
    }),
  });

  return schema.validate(data, { abortEarly: false });
};

// Vehicle information validation
const validateVehicleInfo = (data) => {
  const schema = Joi.object({
    vehicle_type: Joi.string()
      .valid("motorcycle", "scooter", "bicycle", "car", "van", "truck")
      .optional(),

    vehicle_make: Joi.string().min(2).max(50).optional(),
    vehicle_model: Joi.string().min(2).max(50).optional(),
    vehicle_year: Joi.number()
      .integer()
      .min(1980)
      .max(new Date().getFullYear() + 1)
      .optional(),
    vehicle_license: Joi.string().min(3).max(20).optional(),
    vehicle_color: Joi.string().min(3).max(30).optional(),

    insurance_company: Joi.string().min(2).max(100).optional(),
    insurance_policy: Joi.string().min(5).max(50).optional(),
    insurance_expiry: Joi.date().min("now").optional(),

    registration_expiry: Joi.date().min("now").optional(),
    inspection_expiry: Joi.date().min("now").optional(),

    vehicle_features: Joi.array()
      .items(
        Joi.string().valid(
          "air_conditioning",
          "gps_navigation",
          "bluetooth",
          "backup_camera",
          "heated_seats",
          "sunroof",
          "leather_seats",
          "premium_sound"
        )
      )
      .optional(),
  });

  return schema.validate(data, { abortEarly: false });
};

// Availability toggle validation
const validateAvailabilityToggle = (data) => {
  const schema = Joi.object({
    available: Joi.boolean().required().messages({
      "boolean.base": "Available must be a boolean",
      "any.required": "Available status is required",
    }),

    location: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
    }).optional(),
  });

  return schema.validate(data, { abortEarly: false });
};

// Work schedule validation
const validateWorkSchedule = (data) => {
  const schema = Joi.object({
    schedule: Joi.object({
      monday: Joi.object({
        enabled: Joi.boolean().required(),
        start_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .when("enabled", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
        end_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .when("enabled", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
      }).optional(),

      tuesday: Joi.object({
        enabled: Joi.boolean().required(),
        start_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .when("enabled", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
        end_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .when("enabled", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
      }).optional(),

      wednesday: Joi.object({
        enabled: Joi.boolean().required(),
        start_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .when("enabled", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
        end_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .when("enabled", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
      }).optional(),

      thursday: Joi.object({
        enabled: Joi.boolean().required(),
        start_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .when("enabled", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
        end_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .when("enabled", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
      }).optional(),

      friday: Joi.object({
        enabled: Joi.boolean().required(),
        start_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .when("enabled", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
        end_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .when("enabled", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
      }).optional(),

      saturday: Joi.object({
        enabled: Joi.boolean().required(),
        start_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .when("enabled", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
        end_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .when("enabled", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
      }).optional(),

      sunday: Joi.object({
        enabled: Joi.boolean().required(),
        start_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .when("enabled", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
        end_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .when("enabled", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
      }).optional(),
    }).required(),
  });

  return schema.validate(data, { abortEarly: false });
};

// Vehicle issue report validation
const validateVehicleIssue = (data) => {
  const schema = Joi.object({
    issue_type: Joi.string()
      .valid(
        "mechanical",
        "electrical",
        "tire_issue",
        "brake_problem",
        "engine_trouble",
        "fuel_issue",
        "accident_damage",
        "maintenance_needed",
        "other"
      )
      .required()
      .messages({
        "string.base": "Issue type must be a string",
        "any.only": "Invalid issue type",
        "any.required": "Issue type is required",
      }),

    description: Joi.string().min(10).max(1000).required().messages({
      "string.base": "Description must be a string",
      "string.min": "Description must be at least 10 characters",
      "string.max": "Description cannot exceed 1000 characters",
      "any.required": "Description is required",
    }),

    severity: Joi.string()
      .valid("low", "medium", "high", "critical")
      .default("medium")
      .messages({
        "string.base": "Severity must be a string",
        "any.only": "Severity must be one of: low, medium, high, critical",
      }),

    affects_delivery: Joi.boolean().default(true).messages({
      "boolean.base": "Affects delivery must be a boolean",
    }),

    location: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
    }).optional(),
  });

  return schema.validate(data, { abortEarly: false });
};

module.exports = {
  validateDriverRegistration,
  validateDriverUpdate,
  validateLocationUpdate,
  validateVehicleInfo,
  validateAvailabilityToggle,
  validateWorkSchedule,
  validateVehicleIssue,
};
