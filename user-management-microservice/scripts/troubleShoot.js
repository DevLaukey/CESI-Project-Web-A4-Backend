// scripts/troubleshootAiven.js - Comprehensive Aiven Connection Troubleshooting
require("dotenv").config();
const mysql = require("mysql2/promise");
const net = require("net");
const dns = require("dns").promises;

const AIVEN_HOST = "food-app-cesi-laukeymwaura-7f5f.g.aivencloud.com";
const AIVEN_PORT = 25060;
const AIVEN_USER = "avnadmin";
const AIVEN_PASSWORD = "AVNS_ckBK7IKuw5XGVbJHXHx";

// Step 1: DNS Resolution Test
async function testDNS() {
  console.log("🔍 Step 1: Testing DNS resolution...");
  try {
    const addresses = await dns.lookup(AIVEN_HOST);
    console.log("✅ DNS resolved to:", addresses.address);
    console.log("📡 IP Family:", addresses.family === 4 ? "IPv4" : "IPv6");
    return addresses.address;
  } catch (error) {
    console.error("❌ DNS resolution failed:", error.message);
    return null;
  }
}

// Step 2: Network Connectivity Test
async function testNetworkConnectivity(ip) {
  console.log("\n🌐 Step 2: Testing network connectivity...");

  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 30000; // 30 seconds

    socket.setTimeout(timeout);

    socket.on("connect", () => {
      console.log("✅ Network connection successful");
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      console.error("❌ Network connection timeout (30s)");
      socket.destroy();
      resolve(false);
    });

    socket.on("error", (error) => {
      console.error("❌ Network connection error:", error.message);
      socket.destroy();
      resolve(false);
    });

    console.log(
      `🔌 Attempting to connect to ${ip || AIVEN_HOST}:${AIVEN_PORT}...`
    );
    socket.connect(AIVEN_PORT, ip || AIVEN_HOST);
  });
}

// Step 3: MySQL Connection Test (with different timeouts)
async function testMySQLConnection(timeout = 30000) {
  console.log(
    `\n🗄️  Step 3: Testing MySQL connection (${timeout / 1000}s timeout)...`
  );

  try {
    const connection = await mysql.createConnection({
      host: AIVEN_HOST,
      port: AIVEN_PORT,
      user: AIVEN_USER,
      password: AIVEN_PASSWORD,
      ssl: {
        rejectUnauthorized: false,
      },
      connectTimeout: timeout,
      acquireTimeout: timeout,
    });

    console.log("✅ MySQL connection established!");

    // Test basic query
    const [rows] = await connection.execute(
      "SELECT VERSION() as version, NOW() as time, CONNECTION_ID() as connection_id"
    );
    console.log("📊 MySQL Version:", rows[0].version);
    console.log("⏰ Server Time:", rows[0].time);
    console.log("🔗 Connection ID:", rows[0].connection_id);

    await connection.end();
    console.log("✅ MySQL connection closed successfully");
    return true;
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    console.error("🔍 Error code:", error.code);
    return false;
  }
}

// Step 4: Aiven Service Status Check
async function checkAivenService() {
  console.log("\n🏥 Step 4: Checking Aiven service status...");
  console.log("💡 Please check the following in your Aiven console:");
  console.log("   1. Service is running (not stopped/starting)");
  console.log("   2. No maintenance windows active");
  console.log("   3. Connection pooling settings");
  console.log("   4. IP whitelist settings (if any)");
  console.log("   5. SSL/TLS configuration");

  // Try to get more info from the host
  try {
    const addresses = await dns.resolve4(AIVEN_HOST);
    console.log("📍 All resolved IPs:", addresses);
  } catch (error) {
    console.log("⚠️  Could not resolve all IPs:", error.message);
  }
}

// Step 5: Alternative Connection Methods
async function testAlternativeConnections() {
  console.log("\n🔄 Step 5: Testing alternative connection methods...");

  // Test without SSL
  console.log("🔓 Trying without SSL...");
  try {
    const connection = await mysql.createConnection({
      host: AIVEN_HOST,
      port: AIVEN_PORT,
      user: AIVEN_USER,
      password: AIVEN_PASSWORD,
      ssl: false,
      connectTimeout: 60000,
    });

    console.log("✅ Connection without SSL successful");
    await connection.end();
  } catch (error) {
    console.log("❌ Connection without SSL failed:", error.message);
  }

  // Test with different timeout
  console.log("\n⏱️  Trying with extended timeout (3 minutes)...");
  await testMySQLConnection(180000);
}

// Main troubleshooting function
async function troubleshootAiven() {
  console.log("🚀 Aiven MySQL Connection Troubleshooting");
  console.log("=========================================\n");

  // Step 1: DNS
  const resolvedIP = await testDNS();
  if (!resolvedIP) {
    console.log("\n❌ DNS resolution failed. Check your internet connection.");
    return false;
  }

  // Step 2: Network
  const networkOK = await testNetworkConnectivity(resolvedIP);
  if (!networkOK) {
    console.log("\n❌ Network connectivity failed. Possible issues:");
    console.log("   - Firewall blocking port 25060");
    console.log("   - Network restrictions");
    console.log("   - Aiven service is down");
    await checkAivenService();
    return false;
  }

  // Step 3: MySQL Connection
  const mysqlOK = await testMySQLConnection(60000);
  if (!mysqlOK) {
    console.log("\n❌ MySQL connection failed. Trying alternatives...");
    await testAlternativeConnections();
    await checkAivenService();
    return false;
  }

  console.log(
    "\n🎉 All tests passed! Your Aiven connection is working properly."
  );
  console.log("\n📝 If Sequelize is still failing, the issue might be:");
  console.log("   - Sequelize configuration problems");
  console.log("   - Environment variable issues");
  console.log("   - Model definition conflicts");

  return true;
}

// Quick fix function
async function quickTest() {
  console.log("⚡ Quick Aiven Connection Test\n");

  try {
    const connection = await mysql.createConnection({
      host: AIVEN_HOST,
      port: AIVEN_PORT,
      user: AIVEN_USER,
      password: AIVEN_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 90000, // 90 seconds
    });

    const [result] = await connection.execute(
      'SELECT "Connection OK" as status, NOW() as timestamp'
    );
    console.log("✅ Quick test result:", result[0]);

    await connection.end();
    return true;
  } catch (error) {
    console.error("❌ Quick test failed:", error.message);
    return false;
  }
}

// Run the appropriate test
if (require.main === module) {
  const command = process.argv[2];

  if (command === "quick") {
    quickTest()
      .then((success) => process.exit(success ? 0 : 1))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  } else {
    troubleshootAiven()
      .then((success) => process.exit(success ? 0 : 1))
      .catch((err) => {
        console.error("❌ Troubleshooting script error:", err);
        process.exit(1);
      });
  }
}

module.exports = { troubleshootAiven, quickTest };

// Updated .env for better timeout handling
/*
Add these to your .env file:

# Aiven MySQL with extended timeouts
DB_HOST=food-app-cesi-laukeymwaura-7f5f.g.aivencloud.com
DB_PORT=25060
DB_USERNAME=avnadmin
DB_PASSWORD=AVNS_ckBK7IKuw5XGVbJHXHx
DB_NAME=user_service_db

# Extended timeouts for Aiven
DB_CONNECT_TIMEOUT=120000
DB_ACQUIRE_TIMEOUT=120000

# Force development environment for testing
NODE_ENV=development
*/
