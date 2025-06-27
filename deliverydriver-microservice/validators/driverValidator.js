const Joi = require("joi");

const validateDriverRegistration = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phoneNumber: Joi.string()
      .pattern(/^[+]?[1-9][\d\s\-()]{7,15}$/)
      .required(),
    licenseNumber: Joi.string().min(5).max(20).required(),
    vehicleInfo: Joi.object({
      make: Joi.string().max(50),
      model: Joi.string().max(50),
      year: Joi.number()
        .integer()
        .min(1990)
        .max(new Date().getFullYear() + 1),
      licensePlate: Joi.string().max(20),
      color: Joi.string().max(30),
    }).optional(),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: error.details[0].message,
    });
  }

  next();
};

const validateDriverLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);

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
  validateDriverRegistration,
  validateDriverLogin,
};
