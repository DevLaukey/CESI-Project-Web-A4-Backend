require("dotenv").config();
const { Sequelize } = require("sequelize");

// Sequelize for production (Render + Aiven)
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : false,
    },
  }
);

// Local raw MySQL for dev/testing (commented out)
/*
const mysql = require("mysql2/promise");
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});
module.exports = db;
*/

module.exports = sequelize;
