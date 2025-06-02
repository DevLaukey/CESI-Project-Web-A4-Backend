// config/database.js - Fixed SSL Configuration to Resolve Offset Error
const fs = require("fs");
const path = require("path");

// Simplified SSL configuration that works with Aiven
let sslConfig;

// Check if SSL certificate exists and is valid
const caCertPath = path.join(__dirname, "ca-certificate.pem");

if (fs.existsSync(caCertPath)) {
  try {
    const cert = fs.readFileSync(caCertPath, "utf8");
    // Validate certificate content
    if (
      cert.includes("-----BEGIN CERTIFICATE-----") &&
      cert.includes("-----END CERTIFICATE-----")
    ) {
      sslConfig = {
        ca: cert,
        rejectUnauthorized: true,
      };
      console.log("✅ Valid SSL certificate loaded for Aiven MySQL connection");
    } else {
      console.log("⚠️  Invalid SSL certificate format, using default SSL");
      sslConfig = {
        rejectUnauthorized: false,
      };
    }
  } catch (error) {
    console.log(
      "⚠️  Error reading SSL certificate, using default SSL:",
      error.message
    );
    sslConfig = {
      rejectUnauthorized: false,
    };
  }
} else {
  console.log("ℹ️  No SSL certificate found, using default SSL configuration");
  sslConfig = {
    rejectUnauthorized: false,
  };
}

module.exports = {
  development: {
    username: process.env.DB_USERNAME || "avnadmin",
    password: process.env.DB_PASSWORD || "AVNS_ckBK7IKuw5XGVbJHXHx",
    database: process.env.DB_NAME || "user_service_db",
    host:
      process.env.DB_HOST || "food-app-cesi-laukeymwaura-7f5f.g.aivencloud.com",
    port: parseInt(process.env.DB_PORT) || 21854,
    dialect: "mysql",
    dialectOptions: {
      ssl: sslConfig,
      connectTimeout: 60000,
      charset: "utf8mb4",
      // Additional options to prevent SSL issues
      flags: ["-CONNECT_WITH_DB"],
      multipleStatements: false,
    },
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,
      idle: 10000,
      evict: 10000,
      handleDisconnects: true,
    },
    define: {
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
      timestamps: true,
      underscored: true,
      freezeTableName: false,
      paranoid: false,
    },
    retry: {
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ESOCKETTIMEDOUT/,
        /EHOSTUNREACH/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
      ],
      max: 3,
    },
  },
  test: {
    username:
      process.env.DB_TEST_USERNAME || process.env.DB_USERNAME || "avnadmin",
    password:
      process.env.DB_TEST_PASSWORD ||
      process.env.DB_PASSWORD ||
      "AVNS_ckBK7IKuw5XGVbJHXHx",
    database: process.env.DB_TEST_NAME || "user_service_test_db",
    host:
      process.env.DB_TEST_HOST ||
      process.env.DB_HOST ||
      "food-app-cesi-laukeymwaura-7f5f.g.aivencloud.com",
    port: parseInt(process.env.DB_TEST_PORT || process.env.DB_PORT) || 21854,
    dialect: "mysql",
    dialectOptions: {
      ssl: sslConfig,
      connectTimeout: 60000,
      charset: "utf8mb4",
      flags: ["-CONNECT_WITH_DB"],
      multipleStatements: false,
    },
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,
      idle: 10000,
      evict: 10000,
      handleDisconnects: true,
    },
    define: {
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
      timestamps: true,
      underscored: true,
      freezeTableName: false,
      paranoid: false,
    },
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 21854,
    dialect: "mysql",
    dialectOptions: {
      ssl: sslConfig,
      connectTimeout: 90000,
      charset: "utf8mb4",
      flags: ["-CONNECT_WITH_DB"],
      multipleStatements: false,
    },
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 90000,
      idle: 10000,
      evict: 10000,
      handleDisconnects: true,
    },
    define: {
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
      timestamps: true,
      underscored: true,
      freezeTableName: false,
      paranoid: false,
    },
    retry: {
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ESOCKETTIMEDOUT/,
        /EHOSTUNREACH/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
      ],
      max: 3,
    },
  },
};

// Alternative minimal configuration for testing (if SSL issues persist)
// config/database-minimal.js
/*
module.exports = {
  development: {
    username: "avnadmin",
    password: "AVNS_ckBK7IKuw5XGVbJHXHx",
    database: "user_service_db",
    host: "food-app-cesi-laukeymwaura-7f5f.g.aivencloud.com",
    port: 21854,
    dialect: "mysql",
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false
      }
    },
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};
*/
