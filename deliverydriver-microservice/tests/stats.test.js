const request = require("supertest");
const app = require("../server");
const Order = require("../models/Order");
const Driver = require("../models/Driver");

describe("Stats Routes", () => {
  let driverToken;
  let driver;

  beforeEach(async () => {
    // Create test driver
    driver = new Driver({
      email: "test@driver.com",
      password: "password123",
      firstName: "Test",
      lastName: "Driver",
      phoneNumber: "+1234567890",
      licenseNumber: "TEST123",
      totalDeliveries: 5,
      totalEarnings: 250,
    });
    await driver.save();

    // Login to get token
    const loginResponse = await request(app).post("/api/drivers/login").send({
      email: "test@driver.com",
      password: "password123",
    });

    driverToken = loginResponse.body.data.token;

    // Create completed orders
    const completedOrders = [
      {
        status: "delivered",
        restaurantId: "rest1",
        customerId: "cust1",
        driverId: driver.driverId,
        totalAmount: 500,
        deliveryFee: 50,
        deliveredAt: new Date(),
      },
      {
        status: "delivered",
        restaurantId: "rest2",
        customerId: "cust2",
        driverId: driver.driverId,
        totalAmount: 750,
        deliveryFee: 75,
        deliveredAt: new Date(),
      },
    ];

    for (const orderData of completedOrders) {
      const order = new Order(orderData);
      await order.save();
    }
  });

  describe("GET /api/stats/dashboard", () => {
    it("should return driver statistics", async () => {
      const response = await request(app)
        .get("/api/stats/dashboard")
        .set("Authorization", `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.totalDeliveries).toBeDefined();
      expect(response.body.data.stats.totalEarnings).toBeDefined();
      expect(response.body.data.stats.completionRate).toBeDefined();
    });

    it("should require authentication", async () => {
      const response = await request(app).get("/api/stats/dashboard");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/stats/earnings", () => {
    it("should return earnings breakdown", async () => {
      const response = await request(app)
        .get("/api/stats/earnings?period=week")
        .set("Authorization", `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe("week");
      expect(Array.isArray(response.body.data.earnings)).toBe(true);
    });
  });
});
