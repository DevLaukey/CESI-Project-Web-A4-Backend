module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define(
    "Review",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
      },
      restaurantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "restaurant_id",
      },
      customerId: {
        type: DataTypes.STRING, // UUID from User microservice
        allowNull: false,
        field: "customer_id",
      },
      orderId: {
        type: DataTypes.STRING, // UUID from Order microservice
        field: "order_id",
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      comment: {
        type: DataTypes.TEXT,
      },
      images: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_verified",
      },
      isVisible: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_visible",
      },
      response: {
        type: DataTypes.TEXT,
      },
      respondedAt: {
        type: DataTypes.DATE,
        field: "responded_at",
      },
    },
    {
      tableName: "reviews",
      timestamps: true,
      updatedAt: "updated_at",
      indexes: [
        { fields: ["restaurant_id"] },
        { fields: ["customer_id"] },
        { fields: ["rating"] },
        { fields: ["is_visible"] },
      ],
    }
  );

  Review.associate = function (models) {
    Review.belongsTo(models.Restaurant, {
      foreignKey: "restaurantId",
      as: "restaurant",
    });
  };

  return Review;
};
