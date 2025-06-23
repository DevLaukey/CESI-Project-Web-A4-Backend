module.exports = (sequelize, DataTypes) => {
  const Item = sequelize.define(
    "Item",
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
      categoryId: {
        type: DataTypes.INTEGER,
        field: "category_id",
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
        defaultValue: 15,
        field: "preparation_time",
      },
      calories: {
        type: DataTypes.INTEGER,
      },
      allergens: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      nutritionalInfo: {
        type: DataTypes.JSON,
        defaultValue: {},
        field: "nutritional_info",
      },
      ingredients: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      images: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      tags: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      isVegetarian: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_vegetarian",
      },
      isVegan: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_vegan",
      },
      isGlutenFree: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_gluten_free",
      },
      isSpicy: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_spicy",
      },
      spicyLevel: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "spicy_level",
        validate: {
          min: 0,
          max: 5,
        },
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0.0,
        validate: {
          min: 0,
          max: 5,
        },
      },
      reviewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "review_count",
      },
      orderCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "order_count",
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
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "sort_order",
      },
    },
    {
      tableName: "items",
      timestamps: true,
      updatedAt: "updated_at",
      indexes: [
        { fields: ["restaurant_id"] },
        { fields: ["category_id"] },
        { fields: ["is_available"] },
        { fields: ["price"] },
        { fields: ["rating"] },
        { fields: ["is_popular"] },
        { fields: ["is_featured"] },
      ],
    }
  );

  Item.associate = function (models) {
    Item.belongsTo(models.Restaurant, {
      foreignKey: "restaurantId",
      as: "restaurant",
    });
    Item.belongsTo(models.Category, {
      foreignKey: "categoryId",
      as: "category",
    });
    Item.belongsToMany(models.Menu, {
      through: models.MenuItems,
      foreignKey: "itemId",
      otherKey: "menuId",
      as: "menus",
    });
  };

  // Instance methods
  Item.prototype.hasDiscount = function () {
    return this.originalPrice && this.originalPrice > this.price;
  };

  Item.prototype.getDiscountPercentage = function () {
    if (!this.hasDiscount()) return 0;
    return Math.round(
      ((this.originalPrice - this.price) / this.originalPrice) * 100
    );
  };

  return Item;
};
