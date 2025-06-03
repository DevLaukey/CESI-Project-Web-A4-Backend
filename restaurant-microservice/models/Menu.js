module.exports = (sequelize, DataTypes) => {
  const Menu = sequelize.define(
    "Menu",
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
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      originalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        field: "original_price",
      },
      isAvailable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_available",
      },
      preparationTime: {
        type: DataTypes.INTEGER,
        defaultValue: 20,
        field: "preparation_time",
      },
      images: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      tags: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      isPopular: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_popular",
      },
      isFeatured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_featured",
      },
      validFrom: {
        type: DataTypes.DATE,
        field: "valid_from",
      },
      validUntil: {
        type: DataTypes.DATE,
        field: "valid_until",
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "sort_order",
      },
    },
    {
      tableName: "menus",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["restaurant_id"] },
        { fields: ["is_available"] },
        { fields: ["is_popular"] },
        { fields: ["is_featured"] },
      ],
    }
  );

  Menu.associate = function (models) {
    Menu.belongsTo(models.Restaurant, {
      foreignKey: "restaurantId",
      as: "restaurant",
    });
    Menu.belongsToMany(models.Item, {
      through: models.MenuItems,
      foreignKey: "menuId",
      otherKey: "itemId",
      as: "items",
    });
  };

  return Menu;
};
