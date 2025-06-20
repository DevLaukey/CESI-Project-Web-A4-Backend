// models/RestaurantCategories.js
module.exports = (sequelize, DataTypes) => {
  const RestaurantCategories = sequelize.define(
    "RestaurantCategories",
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
        references: {
          model: "restaurants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "category_id",
        references: {
          model: "categories",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
      addedBy: {
        type: DataTypes.STRING, // UUID of the user who added this association
        allowNull: true,
        field: "added_by",
      },
      addedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "added_at",
      },
    },
    {
      tableName: "restaurant_categories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          unique: true,
          fields: ["restaurant_id", "category_id"],
          name: "unique_restaurant_category",
        },
        { fields: ["restaurant_id"] },
        { fields: ["category_id"] },
        { fields: ["is_active"] },
      ],
    }
  );

  // No associations needed for junction tables
  RestaurantCategories.associate = function (models) {
    // Junction tables typically don't need explicit associations
    // The relationships are handled by the belongsToMany associations
    // in the Restaurant and Category models
  };

  return RestaurantCategories;
};
