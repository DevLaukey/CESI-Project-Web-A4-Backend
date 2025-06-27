const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ReferralUsage = sequelize.define(
  "ReferralUsage",
  {
    uuid: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    referred_by: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code_used: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
  },
  {
    tableName: "referral_usages",
    timestamps: false,
  }
);

module.exports = ReferralUsage;
