const Joi = require("joi");

const itemValidation = Joi.object({
  categoryId: Joi.number().integer().positive().optional().messages({
    "number.positive": "Category ID must be a positive number",
  }),
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Item name must be at least 2 characters long",
    "string.max": "Item name cannot exceed 100 characters",
    "any.required": "Item name is required",
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
    .min(5)
    .max(120)
    .default(15)
    .optional()
    .messages({
      "number.min": "Preparation time must be at least 5 minutes",
      "number.max": "Preparation time cannot exceed 120 minutes",
    }),
  calories: Joi.number().min(0).max(5000).optional().messages({
    "number.min": "Calories cannot be negative",
    "number.max": "Calories cannot exceed 5000",
  }),
  allergens: Joi.array()
    .items(
      Joi.string().valid(
        "gluten",
        "dairy",
        "eggs",
        "fish",
        "shellfish",
        "tree_nuts",
        "peanuts",
        "soy",
        "sesame",
        "sulfites",
        "mustard",
        "celery"
      )
    )
    .optional()
    .messages({
      "any.only": "Invalid allergen type",
    }),
  nutritionalInfo: Joi.object({
    protein: Joi.number().min(0).optional(),
    carbohydrates: Joi.number().min(0).optional(),
    fat: Joi.number().min(0).optional(),
    fiber: Joi.number().min(0).optional(),
    sugar: Joi.number().min(0).optional(),
    sodium: Joi.number().min(0).optional(),
    cholesterol: Joi.number().min(0).optional(),
  }).optional(),
  ingredients: Joi.array()
    .items(
      Joi.string().max(100).messages({
        "string.max": "Each ingredient cannot exceed 100 characters",
      })
    )
    .max(20)
    .optional()
    .messages({
      "array.max": "Cannot have more than 20 ingredients",
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
  isVegetarian: Joi.boolean().default(false).optional(),
  isVegan: Joi.boolean().default(false).optional(),
  isGlutenFree: Joi.boolean().default(false).optional(),
  isSpicy: Joi.boolean().default(false).optional(),
  spicyLevel: Joi.number().min(0).max(5).default(0).optional().messages({
    "number.min": "Spicy level must be between 0 and 5",
    "number.max": "Spicy level must be between 0 and 5",
  }),
  sortOrder: Joi.number().integer().min(0).default(0).optional(),
});

const updateItemValidation = Joi.object({
  categoryId: Joi.number().integer().positive().optional(),
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(1000).optional(),
  price: Joi.number().min(0).max(1000).precision(2).optional(),
  originalPrice: Joi.number().min(0).max(1000).precision(2).optional(),
  isAvailable: Joi.boolean().optional(),
  preparationTime: Joi.number().min(5).max(120).optional(),
  calories: Joi.number().min(0).max(5000).optional(),
  allergens: Joi.array()
    .items(
      Joi.string().valid(
        "gluten",
        "dairy",
        "eggs",
        "fish",
        "shellfish",
        "tree_nuts",
        "peanuts",
        "soy",
        "sesame",
        "sulfites",
        "mustard",
        "celery"
      )
    )
    .optional(),
  nutritionalInfo: Joi.object({
    protein: Joi.number().min(0).optional(),
    carbohydrates: Joi.number().min(0).optional(),
    fat: Joi.number().min(0).optional(),
    fiber: Joi.number().min(0).optional(),
    sugar: Joi.number().min(0).optional(),
    sodium: Joi.number().min(0).optional(),
    cholesterol: Joi.number().min(0).optional(),
  }).optional(),
  ingredients: Joi.array().items(Joi.string().max(100)).max(20).optional(),
  images: Joi.array().items(Joi.string().uri()).max(5).optional(),
  tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
  isVegetarian: Joi.boolean().optional(),
  isVegan: Joi.boolean().optional(),
  isGlutenFree: Joi.boolean().optional(),
  isSpicy: Joi.boolean().optional(),
  spicyLevel: Joi.number().min(0).max(5).optional(),
  isFeatured: Joi.boolean().optional(),
  isPopular: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
});

const bulkUpdateItemsValidation = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        uuid: Joi.string().uuid().required(),
        isAvailable: Joi.boolean().optional(),
        price: Joi.number().min(0).max(1000).precision(2).optional(),
        sortOrder: Joi.number().integer().min(0).optional(),
      })
    )
    .min(1)
    .max(50)
    .required()
    .messages({
      "array.min": "At least one item is required",
      "array.max": "Cannot update more than 50 items at once",
    }),
});

module.exports = {
  itemValidation,
  updateItemValidation,
  bulkUpdateItemsValidation,
};
