const Joi = require("joi");

const categoryValidation = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    "string.min": "Category name must be at least 2 characters long",
    "string.max": "Category name cannot exceed 50 characters",
    "any.required": "Category name is required",
  }),
  description: Joi.string().max(500).optional().messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  icon: Joi.string().max(100).optional().messages({
    "string.max": "Icon identifier cannot exceed 100 characters",
  }),
  color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .default("#000000")
    .optional()
    .messages({
      "string.pattern.base":
        "Color must be a valid hex color code (e.g., #FF0000)",
    }),
  sortOrder: Joi.number().integer().min(0).default(0).optional().messages({
    "number.min": "Sort order cannot be negative",
  }),
});

const updateCategoryValidation = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  description: Joi.string().max(500).optional(),
  icon: Joi.string().max(100).optional(),
  color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
});

module.exports = {
  categoryValidation,
  updateCategoryValidation,
};
