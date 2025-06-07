const Joi = require("joi");

const menuValidation = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Menu name must be at least 2 characters long",
    "string.max": "Menu name cannot exceed 100 characters",
    "any.required": "Menu name is required",
  }),
  description: Joi.string().max(1000).optional().messages({
    "string.max": "Description cannot exceed 1000 characters",
  }),
  price: Joi.number().min(0).max(1000).precision(2).required().messages({
    "number.min": "Price cannot be negative",
    "number.max": "Price cannot exceed 1000",
    "any.required": "Price is required",
  }),
  originalPrice: Joi.number()
    .min(0)
    .max(1000)
    .precision(2)
    .optional()
    .messages({
      "number.min": "Original price cannot be negative",
      "number.max": "Original price cannot exceed 1000",
    }),
  preparationTime: Joi.number()
    .min(10)
    .max(120)
    .default(20)
    .optional()
    .messages({
      "number.min": "Preparation time must be at least 10 minutes",
      "number.max": "Preparation time cannot exceed 120 minutes",
    }),
  images: Joi.array()
    .items(
      Joi.string().uri().messages({
        "string.uri": "Each image must be a valid URL",
      })
    )
    .max(5)
    .optional()
    .messages({
      "array.max": "Cannot have more than 5 images",
    }),
  tags: Joi.array()
    .items(
      Joi.string().max(30).messages({
        "string.max": "Each tag cannot exceed 30 characters",
      })
    )
    .max(10)
    .optional()
    .messages({
      "array.max": "Cannot have more than 10 tags",
    }),
  validFrom: Joi.date().optional(),
  validUntil: Joi.date().greater(Joi.ref("validFrom")).optional().messages({
    "date.greater": "Valid until date must be after valid from date",
  }),
  sortOrder: Joi.number().integer().min(0).default(0).optional(),
  items: Joi.array()
    .items(
      Joi.object({
        itemId: Joi.number().integer().positive().required().messages({
          "number.positive": "Item ID must be a positive number",
          "any.required": "Item ID is required",
        }),
        quantity: Joi.number()
          .integer()
          .min(1)
          .max(10)
          .default(1)
          .optional()
          .messages({
            "number.min": "Quantity must be at least 1",
            "number.max": "Quantity cannot exceed 10",
          }),
        isOptional: Joi.boolean().default(false).optional(),
        extraPrice: Joi.number()
          .min(0)
          .max(100)
          .precision(2)
          .default(0)
          .optional()
          .messages({
            "number.min": "Extra price cannot be negative",
            "number.max": "Extra price cannot exceed 100",
          }),
      })
    )
    .min(1)
    .max(20)
    .optional()
    .messages({
      "array.min": "Menu must contain at least 1 item",
      "array.max": "Menu cannot contain more than 20 items",
    }),
});

const updateMenuValidation = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(1000).optional(),
  price: Joi.number().min(0).max(1000).precision(2).optional(),
  originalPrice: Joi.number().min(0).max(1000).precision(2).optional(),
  isAvailable: Joi.boolean().optional(),
  preparationTime: Joi.number().min(10).max(120).optional(),
  images: Joi.array().items(Joi.string().uri()).max(5).optional(),
  tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
  isPopular: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
  validFrom: Joi.date().optional(),
  validUntil: Joi.date().greater(Joi.ref("validFrom")).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  items: Joi.array()
    .items(
      Joi.object({
        itemId: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().min(1).max(10).default(1).optional(),
        isOptional: Joi.boolean().default(false).optional(),
        extraPrice: Joi.number()
          .min(0)
          .max(100)
          .precision(2)
          .default(0)
          .optional(),
      })
    )
    .min(1)
    .max(20)
    .optional(),
});

module.exports = {
  menuValidation,
  updateMenuValidation,
};
