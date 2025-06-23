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
      slug: {
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
      image: {
        type: DataTypes.STRING,
      },
      color: {
        type: DataTypes.STRING(7),
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
      parentId: {
        type: DataTypes.INTEGER,
        field: "parent_id",
        references: {
          model: "categories",
          key: "id",
        },
      },
    },
    {
      tableName: "categories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["name"] },
        { fields: ["slug"] },
        { fields: ["is_active"] },
        { fields: ["sort_order"] },
        { fields: ["parent_id"] },
      ],
    }
  );

  Category.associate = function (models) {
    // Self-referencing association for category hierarchy
    Category.hasMany(models.Category, {
      foreignKey: "parentId",
      as: "subcategories",
    });

    Category.belongsTo(models.Category, {
      foreignKey: "parentId",
      as: "parent",
    });

    // Many-to-many with Restaurant through RestaurantCategories
    Category.belongsToMany(models.Restaurant, {
      through: models.RestaurantCategories,
      foreignKey: "categoryId",
      otherKey: "restaurantId",
      as: "restaurants",
    });

    // One-to-many with Item
    Category.hasMany(models.Item, {
      foreignKey: "categoryId",
      as: "items",
    });
  };

  return Category;
};
