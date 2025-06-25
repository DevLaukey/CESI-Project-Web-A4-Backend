const Joi = require("joi");

const restaurantValidation = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Restaurant name must be at least 2 characters long",
    "string.max": "Restaurant name cannot exceed 100 characters",
    "any.required": "Restaurant name is required",
  }),
  description: Joi.string().max(1000).optional().messages({
    "string.max": "Description cannot exceed 1000 characters",
  }),
  cuisineType: Joi.string().max(100).optional().messages({
    "string.max": "Cuisine type cannot exceed 100 characters",
  }),
  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),
  email: Joi.string().email().optional().messages({
    "string.email": "Please provide a valid email address",
  }),
  address: Joi.string().max(500).required().messages({
    "string.max": "Address cannot exceed 500 characters",
  }),
  city: Joi.string().max(100).required().messages({
    "string.max": "City name cannot exceed 100 characters",
  }),
  postalCode: Joi.string().max(20).required().messages({
    "string.max": "Postal code cannot exceed 20 characters",
  }),
  country: Joi.string().max(100).default("France").optional(),
  latitude: Joi.number().min(-90).max(90).optional().messages({
    "number.min": "Latitude must be between -90 and 90",
    "number.max": "Latitude must be between -90 and 90",
  }),
  longitude: Joi.number().min(-180).max(180).optional().messages({
    "number.min": "Longitude must be between -180 and 180",
    "number.max": "Longitude must be between -180 and 180",
  }),
  deliveryFee: Joi.number().min(0).max(50).default(0).optional().messages({
    "number.min": "Delivery fee cannot be negative",
    "number.max": "Delivery fee cannot exceed 50",
  }),
  minimumOrder: Joi.number().min(0).default(0).optional().messages({
    "number.min": "Minimum order cannot be negative",
  }),
  averageDeliveryTime: Joi.number()
    .min(10)
    .max(120)
    .default(30)
    .optional()
    .messages({
      "number.min": "Average delivery time must be at least 10 minutes",
      "number.max": "Average delivery time cannot exceed 120 minutes",
    }),
  openingHours: Joi.object({
    0: Joi.object({
      // Sunday
      open: Joi.number().min(0).max(2359).optional(),
      close: Joi.number().min(0).max(2359).optional(),
      isClosed: Joi.boolean().default(false),
    }).optional(),
    1: Joi.object({
      // Monday
      open: Joi.number().min(0).max(2359).optional(),
      close: Joi.number().min(0).max(2359).optional(),
      isClosed: Joi.boolean().default(false),
    }).optional(),
    2: Joi.object({
      // Tuesday
      open: Joi.number().min(0).max(2359).optional(),
      close: Joi.number().min(0).max(2359).optional(),
      isClosed: Joi.boolean().default(false),
    }).optional(),
    3: Joi.object({
      // Wednesday
      open: Joi.number().min(0).max(2359).optional(),
      close: Joi.number().min(0).max(2359).optional(),
      isClosed: Joi.boolean().default(false),
    }).optional(),
    4: Joi.object({
      // Thursday
      open: Joi.number().min(0).max(2359).optional(),
      close: Joi.number().min(0).max(2359).optional(),
      isClosed: Joi.boolean().default(false),
    }).optional(),
    5: Joi.object({
      // Friday
      open: Joi.number().min(0).max(2359).optional(),
      close: Joi.number().min(0).max(2359).optional(),
      isClosed: Joi.boolean().default(false),
    }).optional(),
    6: Joi.object({
      // Saturday
      open: Joi.number().min(0).max(2359).optional(),
      close: Joi.number().min(0).max(2359).optional(),
      isClosed: Joi.boolean().default(false),
    }).optional(),
  }).optional(),
  tags: Joi.array()
    .items(
      Joi.string().max(50).messages({
        "string.max": "Each tag cannot exceed 50 characters",
      })
    )
    .max(10)
    .optional()
    .messages({
      "array.max": "Cannot have more than 10 tags",
    }),
  businessLicense: Joi.string().max(100).optional(),
});

const updateRestaurantValidation = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(1000).optional(),
  cuisineType: Joi.string().max(100).optional(),
  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional(),
  email: Joi.string().email().optional(),
  address: Joi.string().max(500).optional(),
  city: Joi.string().max(100).optional(),
  postalCode: Joi.string().max(20).optional(),
  country: Joi.string().max(100).optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  deliveryFee: Joi.number().min(0).max(50).optional(),
  minimumOrder: Joi.number().min(0).optional(),
  isOpen: Joi.boolean().optional(),
  averageDeliveryTime: Joi.number().min(10).max(120).optional(),
  openingHours: Joi.object().optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  settings: Joi.object().optional(),
});

module.exports = {
  restaurantValidation,
  updateRestaurantValidation,
};
