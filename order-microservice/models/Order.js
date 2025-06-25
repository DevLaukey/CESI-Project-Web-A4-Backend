const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Order = sequelize.define(
  "Order",
  {
    uuid: { type: DataTypes.STRING, allowNull: true },
    restaurant_id: { type: DataTypes.STRING, allowNull: true },
    payment_id: { type: DataTypes.STRING, allowNull: true, unique: true },
    delivery_address: { type: DataTypes.STRING, allowNull: true },
    items: { type: DataTypes.JSON, allowNull: true },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "cancelled"
      ),
      defaultValue: "pending",
    },
  },
  {
    tableName: "orders",
    timestamps: true,
  }
);

module.exports = Order;
