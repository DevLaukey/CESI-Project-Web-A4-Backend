module.exports = (sequelize, DataTypes) => {
  const RestaurantStats = sequelize.define(
    "RestaurantStats",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      restaurantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "restaurant_id",
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      totalOrders: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "total_orders",
      },
      totalRevenue: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        field: "total_revenue",
      },
      averageOrderValue: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        field: "average_order_value",
      },
      cancelledOrders: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "cancelled_orders",
      },
      averagePreparationTime: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "average_preparation_time",
      },
    },
    {
      tableName: "restaurant_stats",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [
        { fields: ["restaurant_id"] },
        { fields: ["date"] },
        { fields: ["restaurant_id", "date"], unique: true },
      ],
    }
  );

  RestaurantStats.associate = function (models) {
    RestaurantStats.belongsTo(models.User, {
      foreignKey: "restaurantId",
      as: "restaurant",
    });
  };

  return RestaurantStats;
};
