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

// Import Models
db.Restaurant = require("./Restaurant")(sequelize, Sequelize.DataTypes);
db.Category = require("./Category")(sequelize, Sequelize.DataTypes);
db.Item = require("./Item")(sequelize, Sequelize.DataTypes);
db.Menu = require("./Menu")(sequelize, Sequelize.DataTypes);
db.MenuItems = require("./MenuItems")(sequelize, Sequelize.DataTypes);
db.RestaurantStats = require("./RestaurantStats")(
  sequelize,
  Sequelize.DataTypes
);
db.Review = require("./Review")(sequelize, Sequelize.DataTypes);

// Define Associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
