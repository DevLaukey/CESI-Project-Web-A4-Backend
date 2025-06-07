const Joi = require("joi");

const restaurantSearchValidation = Joi.object({
  q: Joi.string().min(2).max(100).optional().messages({
    "string.min": "Search query must be at least 2 characters long",
    "string.max": "Search query cannot exceed 100 characters",
  }),
  city: Joi.string().max(100).optional(),
  cuisineType: Joi.string().max(100).optional(),
  isOpen: Joi.boolean().optional(),
  minRating: Joi.number().min(0).max(5).optional(),
  maxDeliveryFee: Joi.number().min(0).max(50).optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(50).default(20).optional(),
  sortBy: Joi.string()
    .valid("rating", "distance", "deliveryFee", "averageDeliveryTime", "name")
    .default("rating")
    .optional(),
  sortOrder: Joi.string().valid("ASC", "DESC").default("DESC").optional(),
  lat: Joi.number().min(-90).max(90).optional(),
  lng: Joi.number().min(-180).max(180).optional(),
  radius: Joi.number().min(1).max(50).default(10).optional(),
});

const itemSearchValidation = Joi.object({
  q: Joi.string().min(2).max(100).required().messages({
    "string.min": "Search query must be at least 2 characters long",
    "string.max": "Search query cannot exceed 100 characters",
    "any.required": "Search query is required",
  }),
  city: Joi.string().max(100).optional(),
  categoryId: Joi.number().integer().positive().optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  isVegetarian: Joi.boolean().optional(),
  isVegan: Joi.boolean().optional(),
  isGlutenFree: Joi.boolean().optional(),
  maxSpicyLevel: Joi.number().min(0).max(5).optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(50).default(20).optional(),
});

const locationValidation = Joi.object({
  lat: Joi.number().min(-90).max(90).required().messages({
    "number.min": "Latitude must be between -90 and 90",
    "number.max": "Latitude must be between -90 and 90",
    "any.required": "Latitude is required",
  }),
  lng: Joi.number().min(-180).max(180).required().messages({
    "number.min": "Longitude must be between -180 and 180",
    "number.max": "Longitude must be between -180 and 180",
    "any.required": "Longitude is required",
  }),
  radius: Joi.number().min(1).max(50).default(5).optional().messages({
    "number.min": "Radius must be at least 1 km",
    "number.max": "Radius cannot exceed 50 km",
  }),
  limit: Joi.number().integer().min(1).max(50).default(20).optional(),
});

module.exports = {
  restaurantSearchValidation,
  itemSearchValidation,
  locationValidation,
};
