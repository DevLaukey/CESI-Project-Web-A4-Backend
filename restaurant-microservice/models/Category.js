module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define(
    "Category",
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
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
      },
      icon: {
        type: DataTypes.STRING,
      },
      color: {
        type: DataTypes.STRING(7), // Hex color code
        defaultValue: "#000000",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "sort_order",
      },
    },
    {
      tableName: "categories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["name"] },
        { fields: ["is_active"] },
        { fields: ["sort_order"] },
      ],
    }
  );

  Category.associate = function (models) {
    Category.hasMany(models.Item, { foreignKey: "categoryId", as: "items" });
    Category.belongsToMany(models.Restaurant, {
      through: "RestaurantCategories",
      foreignKey: "categoryId",
      otherKey: "restaurantId",
      as: "restaurants",
    });
  };

  return Category;
};
