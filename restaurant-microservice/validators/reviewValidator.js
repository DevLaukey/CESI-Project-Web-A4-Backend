const Joi = require("joi");

const reviewValidation = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    "number.min": "Rating must be between 1 and 5",
    "number.max": "Rating must be between 1 and 5",
    "any.required": "Rating is required",
  }),
  comment: Joi.string().min(10).max(1000).optional().messages({
    "string.min": "Comment must be at least 10 characters long",
    "string.max": "Comment cannot exceed 1000 characters",
  }),
  orderId: Joi.string().uuid().optional().messages({
    "string.uuid": "Order ID must be a valid UUID",
  }),
  images: Joi.array()
    .items(
      Joi.string().uri().messages({
        "string.uri": "Each image must be a valid URL",
      })
    )
    .max(3)
    .optional()
    .messages({
      "array.max": "Cannot upload more than 3 images",
    }),
});

const reviewResponseValidation = Joi.object({
  response: Joi.string().min(10).max(500).required().messages({
    "string.min": "Response must be at least 10 characters long",
    "string.max": "Response cannot exceed 500 characters",
    "any.required": "Response is required",
  }),
});

module.exports = {
  reviewValidation,
  reviewResponseValidation,
};
