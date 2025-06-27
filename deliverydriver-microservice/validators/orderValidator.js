const Joi = require("joi");

const validateOrderAcceptance = (req, res, next) => {
  const schema = Joi.object({
    orderId: Joi.string().required(),
  });

  const { error } = schema.validate({ orderId: req.params.orderId });

  if (error) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: error.details[0].message,
    });
  }

  next();
};

module.exports = {
  validateOrderAcceptance,
};
