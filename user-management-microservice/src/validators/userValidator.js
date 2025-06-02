const Joi = require("joi");

const updateProfileValidation = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional(),
  address: Joi.string().max(500).optional(),
  city: Joi.string().max(100).optional(),
  postalCode: Joi.string().max(20).optional(),
  country: Joi.string().max(100).optional(),
  dateOfBirth: Joi.date().max("now").optional(),
  preferences: Joi.object().optional(),
  notificationSettings: Joi.object({
    email: Joi.boolean().optional(),
    push: Joi.boolean().optional(),
    sms: Joi.boolean().optional(),
  }).optional(),
});

const changePasswordValidation = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"))
    .required(),
});

const updateLocationValidation = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  isAvailable: Joi.boolean().optional(),
});

module.exports = {
  updateProfileValidation,
  changePasswordValidation,
  updateLocationValidation,
};
