const Joi = require("joi");

const cardDetailsSchema = Joi.object({
  number: Joi.string().creditCard().required(),
  exp_month: Joi.number().integer().min(1).max(12).required(),
  exp_year: Joi.number().integer().min(new Date().getFullYear()).required(),
  cvc: Joi.string()
    .pattern(/^\d{3,4}$/)
    .required(),
  holder_name: Joi.string().max(100).required(),
});

const billingAddressSchema = Joi.object({
  street: Joi.string().max(100).required(),
  city: Joi.string().max(50).required(),
  state: Joi.string().max(50).required(),
  zip_code: Joi.string().max(20).required(),
  country: Joi.string().length(2).required(),
});

const validatePayment = (data) => {
  const schema = Joi.object({
    order_id: Joi.string().uuid().required(),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().length(3).default("USD"),
    payment_method: Joi.string()
      .valid("credit_card", "debit_card", "paypal", "apple_pay", "google_pay")
      .required(),
    payment_method_id: Joi.string().uuid().optional(), // For saved payment methods
    card_details: Joi.when("payment_method", {
      is: Joi.string().valid("credit_card", "debit_card"),
      then: cardDetailsSchema.required(),
      otherwise: Joi.optional(),
    }),
    billing_address: billingAddressSchema.optional(),
    save_payment_method: Joi.boolean().default(false),
    metadata: Joi.object().optional(),
  });

  return schema.validate(data);
};

const validatePaymentMethod = (data) => {
  const schema = Joi.object({
    type: Joi.string()
      .valid("credit_card", "debit_card", "paypal", "apple_pay", "google_pay")
      .required(),
    card_details: Joi.when("type", {
      is: Joi.string().valid("credit_card", "debit_card"),
      then: cardDetailsSchema.required(),
      otherwise: Joi.optional(),
    }),
    billing_address: billingAddressSchema.optional(),
    is_default: Joi.boolean().default(false),
  });

  return schema.validate(data);
};

module.exports = {
  validatePayment,
  validatePaymentMethod,
};
