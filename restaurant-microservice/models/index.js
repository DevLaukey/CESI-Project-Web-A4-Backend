const { Sequelize } = require("sequelize");
const config = require("../config/database");

const env = process.env.NODE_ENV || "development";
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    ...dbConfig,
    logging: console.log, // Enable logging to see SQL queries
    define: {
      // This will apply to ALL models globally
      underscored: true, // This automatically converts camelCase to snake_case
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

const db = {};

// Import Models
db.Category = require("./Category")(sequelize, Sequelize.DataTypes);
db.Restaurant = require("./Restaurant")(sequelize, Sequelize.DataTypes);
db.Menu = require("./Menu")(sequelize, Sequelize.DataTypes);
db.Item = require("./Item")(sequelize, Sequelize.DataTypes);
db.MenuItems = require("./MenuItems")(sequelize, Sequelize.DataTypes);
db.RestaurantCategories = require("./RestaurantCategories")(
  sequelize,
  Sequelize.DataTypes
);
db.Review = require("./Review")(sequelize, Sequelize.DataTypes);
db.RestaurantStats = require("./RestaurantStats")(
  sequelize,
  Sequelize.DataTypes
);

// Define Associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Test database connection
sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection has been established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

module.exports = db;
