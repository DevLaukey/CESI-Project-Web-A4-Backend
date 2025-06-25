const Sequelize = require("sequelize");

// Database configuration - hardcoded values
const dbConfig = {
  host: "food-app-cesi-laukeymwaura-7f5f.g.aivencloud.com",
  port: 21850,
  database: "delivery-microservice",
  username: "avnadmin",
  password: "AVNS_ckBK7IKuw5XGVbJHXHx",
  dialect: "mysql",
  logging: false, // Set to console.log to see SQL queries
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // For Aiven cloud databases
    },
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  retry: {
    max: 3,
  },
};

// Create Sequelize instance
const sequelize = new Sequelize(dbConfig);

// Test connection function
const testConnection = () => {
  return sequelize
    .authenticate()
    .then(() => {
      console.log("✅ Database connection established successfully.");
    })
    .catch((err) => {
      console.error("❌ Unable to connect to the database:", err.message);
      throw err;
    });
};

// Helper function to execute raw queries
const query = async (sql, replacements = [], transaction = null) => {
  try {
    const options = {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    };

    if (transaction) {
      options.transaction = transaction;
    }

    return await sequelize.query(sql, options);
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
};

// Helper function to execute raw queries (INSERT, UPDATE, DELETE)
const execute = async (sql, replacements = [], transaction = null) => {
  try {
    const options = {
      replacements,
      type: Sequelize.QueryTypes.RAW,
    };

    if (transaction) {
      options.transaction = transaction;
    }

    return await sequelize.query(sql, options);
  } catch (error) {
    console.error("Database execute error:", error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  query,
  execute,
  config: dbConfig,
};
