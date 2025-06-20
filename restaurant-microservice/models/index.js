const { Sequelize } = require("sequelize");
const config = require("../config/database");

const env = process.env.NODE_ENV || "development";
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

const db = {};

// Create the Category model (referenced by Restaurant and Item models)
const Category = sequelize.define(
  "Category",
  {
    id: {
      type: Sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    uuid: {
      type: Sequelize.DataTypes.UUID,
      defaultValue: Sequelize.DataTypes.UUIDV4,
      unique: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    slug: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: Sequelize.DataTypes.TEXT,
    },
    icon: {
      type: Sequelize.DataTypes.STRING,
    },
    image: {
      type: Sequelize.DataTypes.STRING,
    },
    color: {
      type: Sequelize.DataTypes.STRING(7),
    },
    isActive: {
      type: Sequelize.DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
    sortOrder: {
      type: Sequelize.DataTypes.INTEGER,
      defaultValue: 0,
      field: "sort_order",
    },
    parentId: {
      type: Sequelize.DataTypes.INTEGER,
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

// Import Models
db.Category = Category;
db.Restaurant = require("./Restaurant")(sequelize, Sequelize.DataTypes);
db.Menu = require("./Menu")(sequelize, Sequelize.DataTypes);
db.Item = require("./Item")(sequelize, Sequelize.DataTypes);
db.MenuItems = require("./MenuItems")(sequelize, Sequelize.DataTypes);
db.RestaurantCategories = require("./Category")(sequelize, Sequelize.DataTypes);
db.Review = require("./Review")(sequelize, Sequelize.DataTypes);
db.RestaurantStats = require("./RestaurantStats")(
  sequelize,
  Sequelize.DataTypes
);

// Define Category associations
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

// Define Associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
