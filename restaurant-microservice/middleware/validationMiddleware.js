const Joi = require("joi");

/**
 * Generic validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {String} source - Source of data to validate (body, query, params)
 * @returns {Function} Express middleware function
 */
const validateMiddleware = (schema, source = "body") => {
  return (req, res, next) => {
    const data = req[source];

    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
      allowUnknown: false, // Don't allow unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context.value,
      }));

      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "The provided data is invalid",
        details: errors,
      });
    }

    // Replace original data with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Validate UUID parameter middleware
 */
const validateUuidParam = (paramName = "uuid") => {
  return validateMiddleware(
    Joi.object({
      [paramName]: Joi.string()
        .uuid()
        .required()
        .messages({
          "string.uuid": `${paramName} must be a valid UUID`,
          "any.required": `${paramName} is required`,
        }),
    }),
    "params"
  );
};

/**
 * Validate pagination parameters
 */
const validatePagination = validateMiddleware(
  Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default("createdAt"),
    sortOrder: Joi.string().valid("ASC", "DESC").default("DESC"),
  }),
  "query"
);

/**
 * Validate search parameters
 */
const validateSearch = validateMiddleware(
  Joi.object({
    q: Joi.string().min(2).max(100).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
  "query"
);

module.exports = {
  validateMiddleware,
  validateUuidParam,
  validatePagination,
  validateSearch,
};
