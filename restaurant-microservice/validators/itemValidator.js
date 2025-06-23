const Joi = require("joi");

// Custom messages for better frontend communication
const customMessages = {
  "any.required": "{#label} is required",
  "string.empty": "{#label} cannot be empty",
  "string.min": "{#label} must be at least {#limit} characters",
  "string.max": "{#label} cannot exceed {#limit} characters",
  "number.base": "{#label} must be a valid number",
  "number.min": "{#label} must be at least {#limit}",
  "number.max": "{#label} cannot exceed {#limit}",
  "number.positive": "{#label} must be positive",
  "array.max": "{#label} can have maximum {#limit} items",
  "boolean.base": "{#label} must be true or false",
};

const itemValidation = Joi.object({
  // Required fields
  categoryId: Joi.number().integer().positive().required().label("Category"),

  name: Joi.string().trim().min(2).max(100).required().label("Item name"),

  price: Joi.number()
    .min(0.01)
    .max(999.99)
    .precision(2)
    .required()
    .label("Price"),

  // Optional fields with simple validation
  description: Joi.string()
    .trim()
    .max(500)
    .allow("")
    .optional()
    .label("Description"),

  originalPrice: Joi.number()
    .min(0.01)
    .max(999.99)
    .precision(2)
    .optional()
    .label("Original price"),

  isAvailable: Joi.boolean().default(true).optional().label("Availability"),

  isPopular: Joi.boolean().default(false).optional().label("Popular status"),

  preparationTime: Joi.number()
    .integer()
    .min(0)
    .max(180)
    .default(15)
    .optional()
    .label("Preparation time"),

  // Simple arrays
  ingredients: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .max(20)
    .default([])
    .optional()
    .label("Ingredients"),

  allergens: Joi.array()
    .items(
      Joi.string().valid(
        "gluten",
        "dairy",
        "eggs",
        "nuts",
        "peanuts",
        "soy",
        "fish",
        "shellfish",
        "sesame"
      )
    )
    .max(10)
    .default([])
    .optional()
    .label("Allergens"),

  // Simplified nutritional info
  nutritionalInfo: Joi.object({
    calories: Joi.number().min(0).max(5000).optional(),
    protein: Joi.number().min(0).max(200).optional(),
    carbs: Joi.number().min(0).max(500).optional(),
    fat: Joi.number().min(0).max(200).optional(),
  })
    .default({})
    .optional()
    .label("Nutritional information"),

  sortOrder: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .optional()
    .label("Sort order"),
}).messages(customMessages);

const updateItemValidation = Joi.object({
  // All fields optional for updates
  categoryId: Joi.number().integer().positive().optional().label("Category"),

  name: Joi.string().trim().min(2).max(100).optional().label("Item name"),

  description: Joi.string()
    .trim()
    .max(500)
    .allow("")
    .optional()
    .label("Description"),

  price: Joi.number()
    .min(0.01)
    .max(999.99)
    .precision(2)
    .optional()
    .label("Price"),

  originalPrice: Joi.number()
    .min(0.01)
    .max(999.99)
    .precision(2)
    .optional()
    .label("Original price"),

  isAvailable: Joi.boolean().optional().label("Availability"),

  isPopular: Joi.boolean().optional().label("Popular status"),

  preparationTime: Joi.number()
    .integer()
    .min(0)
    .max(180)
    .optional()
    .label("Preparation time"),

  ingredients: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .max(20)
    .optional()
    .label("Ingredients"),

  allergens: Joi.array()
    .items(
      Joi.string().valid(
        "gluten",
        "dairy",
        "eggs",
        "nuts",
        "peanuts",
        "soy",
        "fish",
        "shellfish",
        "sesame"
      )
    )
    .max(10)
    .optional()
    .label("Allergens"),

  nutritionalInfo: Joi.object({
    calories: Joi.number().min(0).max(5000).optional(),
    protein: Joi.number().min(0).max(200).optional(),
    carbs: Joi.number().min(0).max(500).optional(),
    fat: Joi.number().min(0).max(200).optional(),
  })
    .optional()
    .label("Nutritional information"),

  sortOrder: Joi.number().integer().min(0).optional().label("Sort order"),

  // Additional update-specific fields
  stock: Joi.number()
    .integer()
    .min(0)
    .max(1000)
    .optional()
    .label("Stock quantity"),
}).messages(customMessages);

// Simplified bulk update validation
const bulkUpdateItemsValidation = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        id: Joi.alternatives()
          .try(
            Joi.number().integer().positive(),
            Joi.string().uuid(),
            Joi.string().min(1)
          )
          .required()
          .label("Item ID"),

        // Only allow simple bulk updates
        isAvailable: Joi.boolean().optional(),
        price: Joi.number().min(0.01).max(999.99).precision(2).optional(),
        stock: Joi.number().integer().min(0).max(1000).optional(),
        sortOrder: Joi.number().integer().min(0).optional(),
      }).min(1) // At least one field to update
    )
    .min(1)
    .max(50)
    .required()
    .label("Items"),
}).messages({
  ...customMessages,
  "array.min": "At least one item is required",
  "array.max": "Cannot update more than 50 items at once",
  "object.min": "At least one field must be provided for update",
});

// Helper function to format validation errors for frontend
const formatValidationError = (error) => {
  if (!error || !error.details) {
    return {
      success: false,
      error: "Validation Error",
      message: "Invalid data provided",
      details: [],
    };
  }

  const formattedErrors = error.details.map((detail) => ({
    field: detail.path.join("."),
    message: detail.message,
    value: detail.context?.value,
  }));

  return {
    success: false,
    error: "Validation Error",
    message: `Please fix the following errors: ${formattedErrors
      .map((e) => e.message)
      .join(", ")}`,
    details: formattedErrors,
    fieldErrors: formattedErrors.reduce((acc, err) => {
      acc[err.field] = err.message;
      return acc;
    }, {}),
  };
};

// Validation middleware that returns formatted errors
const validateItem = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Get all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
      convert: true, // Convert types where possible
    });

    if (error) {
      return res.status(400).json(formatValidationError(error));
    }

    req.validatedData = value;
    next();
  };
};

module.exports = {
  itemValidation,
  updateItemValidation,
  bulkUpdateItemsValidation,
  formatValidationError,
  validateItem,
};
