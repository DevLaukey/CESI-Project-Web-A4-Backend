const {
  restaurantValidation,
  updateRestaurantValidation,
} = require("./restaurantValidator");
const {
  itemValidation,
  updateItemValidation,
  bulkUpdateItemsValidation,
} = require("./itemValidator");
const { menuValidation, updateMenuValidation } = require("./menuValidator");
const {
  categoryValidation,
  updateCategoryValidation,
} = require("./categoryValidator");
const {
  reviewValidation,
  reviewResponseValidation,
} = require("./reviewValidator");
const {
  restaurantSearchValidation,
  itemSearchValidation,
  locationValidation,
} = require("./searchValidator");

module.exports = {
  // Restaurant validators
  restaurantValidation,
  updateRestaurantValidation,

  // Item validators
  itemValidation,
  updateItemValidation,
  bulkUpdateItemsValidation,

  // Menu validators
  menuValidation,
  updateMenuValidation,

  // Category validators
  categoryValidation,
  updateCategoryValidation,

  // Review validators
  reviewValidation,
  reviewResponseValidation,

  // Search validators
  restaurantSearchValidation,
  itemSearchValidation,
  locationValidation,
};
