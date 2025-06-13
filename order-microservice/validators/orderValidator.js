const Joi = require("joi");

const orderItemSchema = Joi.object({
  menu_item_id: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).required(),
  customizations: Joi.object().optional(),
  notes: Joi.string().max(500).optional(),
});

const validateOrder = (data) => {
  const schema = Joi.object({
    restaurant_id: Joi.string().uuid().required(),
    items: Joi.array().items(orderItemSchema).min(1).required(),
    delivery_address: Joi.string().max(1000).required(),
    delivery_instructions: Joi.string().max(500).optional(),
    special_instructions: Joi.string().max(500).optional(),
    discount_amount: Joi.number().min(0).optional(),
  });

  return schema.validate(data);
};

const validateOrderUpdate = (data) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid(
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "picked_up",
        "delivered",
        "cancelled"
      )
      .required(),
    driver_id: Joi.string().uuid().optional(),
  });

  return schema.validate(data);
};

module.exports = {
  validateOrder,
  validateOrderUpdate,
};
